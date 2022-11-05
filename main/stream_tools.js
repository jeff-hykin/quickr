import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"


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
export async function toWritableStream(value, overwrite=true) {
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
                await FileSystem.clearAPathFor(value, {overwrite: true})
                // convert string to a folder
                value = await Deno.open(value, {write: true, truncate: true, create: true})
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
                await FileSystem.ensureIsFolder(FileSystem.parentPath(value))
                // convert string to a folder
                value = await Deno.open(value, {write: true, create: true})
                // FIXME: this file never gets closed! its hard to close because if its used outside of this library too, closing it will cause an error. Need a way to check on it
            }
            
            if (value instanceof Deno.File) {
                // go to the end of a file (meaning everthing will be appended)
                await Deno.seek(value.rid, 0, Deno.SeekMode.End)
            } else {
                throw Error(`The argument can be a string path, a file (Deno.open("./path")), or any writable object (like Deno.stdout or the .stdin of an interactive command)\nbut instead of any of those I received:\n    ${value}\n\n`)
            }
        }
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
    console.debug(`streamSplitterQue is:`,streamSplitterQue)
    // now we should have the appropriate number of streams
    return streamSplitterQue
}