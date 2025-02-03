import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"
import { deferred as deferredPromise } from "https://deno.land/std@0.161.0/async/mod.ts"
import { Event, trigger, everyTime, once } from "https://deno.land/x/good@1.14.3.0/events.js"
import { toRepresentation } from "https://deno.land/x/good@1.14.3.0/string.js"
import { allKeys } from "https://deno.land/x/good@1.14.3.0/value.js"
import { zip } from "https://deno.land/x/good@1.14.3.0/iterable.js"



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

            if (value instanceof (Deno.File||class {})) {
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
            
            if (value instanceof (Deno.File||class {})) {
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
                    trigger(this.writeEvent, decoded, chunk, this).catch(error=>console.error(`There was an error when a FlowingString called a callback for the write event.\nThe error was this error: ${error.message}\nThe callback was one of these functions: ${[...this.writeEvent].map(each=>toRepresentation(each)).join("\n\n")}`))
                    this._string += decoded
                },
                close: () => {
                    trigger(this.closeEvent, this._string, this).catch(error=>console.error(`There was an error when a FlowingString called a callback for the close event.\nThe error was this error: ${error.message}\nThe callback was one of these functions: ${[...this.closeEvent].map(each=>toRepresentation(each)).join("\n\n")}`))
                    this.string.resolve(this._string)
                },
                abort(err) {
                    trigger(this.errorEvent, err).catch(error=>console.error(`There was an error when a FlowingString called a callback for the error event.\nHowever the callback itself threw an error: ${error.message}\nThe callback was one of these functions: ${[...this.errorEvent].map(each=>toRepresentation(each)).join("\n\n")}`))
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

const didClose = Symbol()
export class EzWriteStream {
    constructor(streamThing, options) {
        const { name } = {...options}
        let writer
        if (streamThing instanceof EzWriteStream) {
            //  
            writer = streamThing.writer
        } else if (streamThing?.write instanceof Function) {
            writer = streamThing
        } else if (streamThing instanceof WritableStream) {
            writer = streamThing.getWriter()
        } else {
            throw Error(`Called new EzWriteStream(obj), but I don't think obj is writable: ${toRepresentation(streamThing)}`)
        }
        // carry over methods
        for (const each of allKeys(writer)) {
            if (each != "constructor" && each != "write" && each != "close" && writer[each] instanceof Function) {
                this[each]=(...args)=>writer[each](...args)
            }
        }
        this.writer = writer
        this.name = name
        this.closed = false
    }
    close(...args) {
        this.closed = true
        return Promise.resolve(this.writer.close(...args)).then(()=>this)
    }
    write(data, ...args) {
        if (this.closed) {
            console.warn(`Trying to write to a closed EzWriteStream(obj, {name: ${this.name}})`)
            return Promise.resolve(this)
        }
        if (typeof data == 'string') {
            return Promise.resolve(this.writer.write(new TextEncoder().encode(data))).then(()=>this)
        } else if (data instanceof Uint8Array) {
            return Promise.resolve(this.writer.write(data)).then(()=>this)
        } else if (data instanceof ReadableStream || isReadable(data)) {
            let reader = data
            if (data instanceof ReadableStream) {
                reader = data?.getReader()
            }
            const closedPromise = reader.closed().finally(()=>didClose)
            // NOTE: there is some behavior to be considered here
            //       writing two streams (this.write(s1), this.write(s1)) means
            //       their writes will be performed in an undetermined order (not zipped or sequential)
            return new Promise(async (resolve, reject)=>{
                while (1) {
                    try {
                        const result = Promise.any([ reader.read(), closedPromise ])
                        if (result === didClose) {
                            resolve(this)
                        } else {
                            if (typeof result == 'string') {
                                this.writer.write(new TextEncoder().encode(result))
                            } else {
                                this.writer.write(result)
                            }
                        }
                    } catch (err) {
                        reject(err)
                    }
                }
            })
        } else {
            return Promise.reject(Error(`When performing a .write(input) I was unable to handle the input type. I received an input of ${toRepresentation(input)}`))
        }
    }
}

const husk = Symbol()
export class EzReadStream {
    static zip(...streams) {
        const output = new EzReadStream(husk)
        output.onClose = []
        output.onRead = []
        output.closed = false
        output.chunks = []
        output.error = null
        let yeildIndex = 0
        
        const that = output
        for (const each of streams) {
            each.addEventListener("read",(chunk)=>{
                output.chunks.push(chunk)
                try {
                    for (const callback of output.onRead) {
                        callback(chunk)
                    }
                } catch (error) {
                    output.error = error
                }
            })
        }
        output.iterable = (async function*() {
            while (1) {
                while (output.chunks.length > yeildIndex) {
                    yeildIndex+=1
                    yield output.chunks[yeildIndex]
                }
                if (output.error) {
                    throw output.error
                }
                that.closed = streams.every(each=>each.closed)
                if (that.closed) {
                    for (const callback of output.onClose) {
                        callback(that)
                    }
                    break
                }
                await new Promise((resolve)=>setTimeout(resolve, output.stallTime))
            }
        })()
    }

    constructor(streamThing, options) {
        const { name } = {...options}
        if (streamThing==husk) {
            return
        }
        this.stallTime = 30 // milliseconds
        if (streamThing instanceof EzReadStream) {
            Object.assign(this, streamThing)
            this.name = name
        } else {
            let reader
            if (streamThing instanceof EzReadStream) {
                reader = streamThing.reader
            } else if (streamThing?.readable) {
                reader = streamThing.readable.getReader()
            } else if (streamThing?.read instanceof Function) {
                reader = streamThing
            } else if (streamThing instanceof WritableStream) {
                reader = streamThing.getReader()
            } else {
                throw Error(`Called new EzReadStream(obj), but I don't think obj is readable: ${toRepresentation(streamThing)}`)
            }
            // carry over methods
            for (const each of allKeys(reader)) {
                if (each != "constructor" && each != "read" && each != "close" && reader[each] instanceof Function) {
                    this[each]=(...args)=>reader[each](...args)
                }
            }
            this.name = name
            this.onClose = []
            this.onRead = []
            this.closed = false
            this.chunks = []
            
            const that = this
            this.iterable = (async function*() {
                while(!that.closed) {
                    const {value:chunk, done} = await reader.read()
                    if (done) {
                        that.closed = true
                        for (const callback of that.onClose) {
                            // TODO: might want to catch each callback instead of the first callback causing all of them to fail
                            callback(that)
                        }
                        break
                    }
                    that.chunks.push(chunk)
                    for (const callback of that.onRead) {
                        // TODO: might want to catch each callback instead of the first callback causing all of them to fail
                        callback(chunk)
                    }
                    yield chunk
                }
            })()
        }
    }
    addEventListener(type, callback) {
        if (type=="close") {
            this.onClose.push(callback)
        }
        if (type=="read") {
            // bring the callback up to speed on previous chunks
            for (const chunk of this.chunks) {
                try {
                    callback(chunk)
                } catch (error) {
                }
            }
            this.onRead.push(callback)
        }
        return this
    }
    async partialString() {
        let i = 0
        for (const each of this.chunks) {
            if (typeof each != 'string') {
                this.chunks[i] = new TextDecoder().decode(each)
            }
            i += 1
        }
        return this.chunks.join("")
    }
    async asString() {
        if (!this.closed) {
            for await (const iterator of this.iterable) {
                // just consume everything
            }
        }
        
        return this.partialString()
    }
    async partialBytes() {
        let i = 0
        for (const each of this.chunks) {
            if (typeof each == 'string') {
                this.chunks[i] = new TextEncoder().encode(each)
            }
            i += 1
        }
        return concatUint8Arrays(this.chunks)
    }
    async asBytes() {
        if (!this.closed) {
            for await (const iterator of this.iterable) {
                // just consume everything
            }
        }
        return this.partialBytes()
    }
}