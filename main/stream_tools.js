import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"
import { deferred as deferredPromise } from "https://deno.land/std@0.161.0/async/mod.ts"
import { Event, trigger, everyTime, once } from "https://deno.land/x/good@0.7.8/events.js"

// TODO: move this whole file to good-js
// for await (let each of Deno.stdin.readable.pipeThrough(new TextDecoderStream())) { console.log("each", each) }

export {
    zipReadableStreams as zipReadableStreams,
    mergeReadableStreams as mergeReadableStreams,
    readableStreamFromReader as readableStreamFromReader,
    writableStreamFromWriter as writableStreamFromWriter,
}

const concatUint8Arrays = (arrays) => new Uint8Array( // simplified from: https://stackoverflow.com/questions/49129643/how-do-i-merge-an-array-of-uint8arrays
        arrays.reduce((acc, curr) => (acc.push(...curr),acc), [])
    )

export const streamToString = async (stream) => {
    let returnReader = stream
    // if given a readable, it will skip this part
    if (stream?.getReader instanceof Function) {
        returnReader = stream.getReader()
    }
    let blocks = []
    while (true) {
        const {value, done} = await returnReader.read()
        if (done) {
            break
        }
        blocks.push(value)
    }
    const string = new TextDecoder().decode(concatUint8Arrays(blocks))
    return string
}

export const isReadable = (obj) => obj instanceof Object && obj.read instanceof Function
export const isWritable = (obj) => obj instanceof Object && obj.write instanceof Function

export function toReadableStream(value) {
    // string to readable stream
    if (typeof value == 'string') {
        return readableStreamFromReader(new StringReader(value))
    // Uint8 (raw data) to readable stream
    } else if (value instanceof Uint8Array) {
        return readableStreamFromReader(new Buffer(value))
    // check for readable stream itself
    } else if (value instanceof ReadableStream) {
        return value
    // readable thing to readable stream
    } else if (isReadable(value)) {
        return readableStreamFromReader(value)
    } else {
        throw Error(`The argument can be a string, a file (Deno.open("./path")), bytes (Uint8Array), or any readable object (like Deno.stdin or the .stdout of another run command)\nbut instead of any of those I received:\n    ${value}\n\n`)
    }
}
export function toWritableStream(value, overwrite=true) {
    // values that are alread writeable streams
    if (value instanceof WritableStream) {
        return value
    // convert files/writables to writeable streams
    } else if (isWritable(value)) {
        return writableStreamFromWriter(value)
    } else {
        if (overwrite) {
            if (typeof value == 'string') {
                // ensure parent folders exist
                FileSystem.sync.clearAPathFor(value, {overwrite: true})
                // convert string to a folder
                value = Deno.openSync(value, {write: true, truncate: true, create: true})
            }

            if (value instanceof Deno.File) {
                // clear the file
                value.truncate()
            } else {
                throw Error(`The argument can be a string path, a file (Deno.open("./path")), or any writable object (like Deno.stdout or the .stdin of an interactive command)\nbut instead of any of those I received:\n    ${value}\n\n`)
            }
        } else {
            if (typeof value == 'string') {
                // ensure parent folders exist
                FileSystem.sync.ensureIsFolder(FileSystem.parentPath(value))
                // convert string to a folder
                value = Deno.openSync(value, {write: true, create: true})
                // FIXME: this file never gets closed! its hard to close because if it was opened outside of this library, then closing after the command would close it early and cause an error. Need a way to check on it
            }
            
            if (value instanceof Deno.File) {
                // go to the end of a file (meaning everthing will be appended)
                Deno.seekSync(value.rid, 0, Deno.SeekMode.End)
            } else {
                throw Error(`The argument can be a string path, a file (Deno.open("./path")), or any writable object (like Deno.stdout or the .stdin of an interactive command)\nbut instead of any of those I received:\n    ${value}\n\n`)
            }
        }
    }
}

export class FlowingString extends WritableStream {
    constructor(arg={ onWrite:null, onError:null, onClose:null }) {
        super(
            {
                write: (chunk) => {
                    if (!(chunk instanceof Uint8Array)) {
                        const view = new Uint8Array(new ArrayBuffer(1))
                        view[0] = chunk
                        chunk = view
                    }
                    const decoded = this._decoder.decode(chunk, { stream: true })
                    trigger(this.writeEvent, decoded, chunk, this).catch(error=>console.error(`There was an error when a FlowingString called a callback for the write event.\nThe error was this error: ${error.message}\nThe callback was one of these functions: ${[...this.writeEvent].map(each=>each.toString()).join("\n\n")}`))
                    this._string += decoded
                },
                close: () => {
                    trigger(this.closeEvent, this._string, this).catch(error=>console.error(`There was an error when a FlowingString called a callback for the close event.\nThe error was this error: ${error.message}\nThe callback was one of these functions: ${[...this.closeEvent].map(each=>each.toString()).join("\n\n")}`))
                    this.string.resolve(this._string)
                },
                abort(err) {
                    trigger(this.errorEvent, err).catch(error=>console.error(`There was an error when a FlowingString called a callback for the error event.\nHowever the callback itself threw an error: ${error.message}\nThe callback was one of these functions: ${[...this.errorEvent].map(each=>each.toString()).join("\n\n")}`))
                    if (!this.onError || !this.onError(err)) {
                        throw err
                    }
                }
            },
            new CountQueuingStrategy({ highWaterMark: 1 }),
        )
        
        this.writeEvent = new Event(arg.onWrite ? [ arg.onWrite ] :  [])
        this.closeEvent = new Event(arg.onClose ? [ arg.onClose ] :  [])
        this.errorEvent = new Event(arg.onError ? [ arg.onError ] :  [])
        this._string = ""
        this._decoder = new TextDecoder("utf-8")
        this.string = deferredPromise()
    }
}

export function duplicateReadableStream({stream, numberOfDuplicates}) {
    // slightly complicated because tee-ing a stream kind of destroys the original 
    // and its better to tee in a branching way than in a all-on-one-side way (BFS-style not DFS-style)
    let streamSplitterQue = []
    // init the que
    if (numberOfDuplicates > 0) {
        streamSplitterQue.push(readableStreamFromReader(stream))
    }
    
    while (streamSplitterQue.length < numberOfDuplicates) {
        // take off the front of the que (back of the list), create two more items (tee) put them at the back of the que (front of the list)
        streamSplitterQue = streamSplitterQue.pop().tee().concat(streamSplitterQue)
    }
    // now we should have the appropriate number of streams
    return streamSplitterQue
}