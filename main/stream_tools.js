import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"
import { deferred as deferredPromise } from "https://deno.land/std@0.161.0/async/mod.ts"

// TODO: move this whole file to good-js

export {
    zipReadableStreams as zipReadableStreams,
    mergeReadableStreams as mergeReadableStreams,
    readableStreamFromReader as readableStreamFromReader,
    writableStreamFromWriter as writableStreamFromWriter,
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
                    console.debug(`chunk is:`,chunk)
                    console.debug(`chunk is:${chunk}`,)
                    const decoded = this._decoder.decode(chunk, { stream: true })
                    this._string += decoded
                    arg.onWrite && arg.onWrite(decoded, this._string, chunk)
                },
                close: () => {
                    this.string.resolve(this._string)
                    arg.onClose && arg.onClose(this._string)
                },
                abort(err) {
                    this.string.reject(err)
                    if (!arg.onError || !arg.onError(err)) {
                        throw err
                    }
                }
            },
            new CountQueuingStrategy({ highWaterMark: 1 }),
        )
        
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