import { Event, trigger, everyTime, once } from "https://deno.land/x/good@0.5.1/events.js"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@0.5.1/array.js"
import { capitalize, indent, toCamelCase, numberToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString } from "https://deno.land/x/good@0.5.1/string.js"
import { OperatingSystem } from "./operating_system"

const notGiven = Symbol()
const taskSymbol = Symbol("task")

// 
// examples
// 
    // await run`echo hi`.stdout({overwrite: "./my_file.txt"})
    // await run`cat .zshrc`.with({ cwd: OperatingSystem.home }).pipeTo(
    //     run`grep ${"thing"}`
    // ).and(
    //     run`echo great your .zshrc has a thing`
    // )

// TODO: provide a zip and concat tool to allow different kinds of stdin


// 
// clean/core logic
// 
async function simpleRun({ command, stdin, stdout, stderr, out, cwd, env, interactive }) {
    const debuggingString = getDebuggingString(...command)
    if (!interactive) {
        var { command, stdin, stdout, stderr, out, cwd, env } = await standardizeArguments({ command, stdin, stdout, stderr, out, cwd, env, debuggingString})
        const reader = stdinArugmentToReader(stdin, debuggingString)
        const stdoutTargets = outOrErrToWriterTargets(stdout, debuggingString)
        const stderrTargets = outOrErrToWriterTargets(stderr, debuggingString)
    }

    // interactive: {onOut, onStdout, onStderr, onFinsh}
        // success becomes a promise
        // and an interactive object is returned, with pid, moreInput, noMoreInput, stdout, stderr, signal, cancel, kill, exitCode

    // return needs to include {interactive, success, cancel, kill}
}


// 
// 
// detailed logic
// 
// 
async function standardizeArguments({ command, stdin, stdout, stderr, out, cwd, env, debuggingString }) {
    const simplified = {
        stdin: null,
        stdout: null,
        stderr: null,
        cwd: null,
        env: null,
    }

    // 
    // command
    // 
    command = await standardizeCommandArgs(...command)
    
    // 
    // stdin
    // 
    if (stdin == notGiven) {
        stdin = {
            from: [ Deno.stdin ],
        }
    }

    // 
    // stdout
    // 
    if (stdout == notGiven && out == notGiven) {
        stdout = {
            overwrite: [],
            appendTo: [ Deno.stdout ],
        }
    }
    
    // 
    // stderr
    // 
    if (stderr == notGiven && out == notGiven) {
        stderr = {
            overwrite: [],
            appendTo: [ Deno.stderr ],
        }
    }

    // 
    // out
    // 
    const outIsGiven = out !== notGiven
    if (outIsGiven) {
        stdout.appendTo = stdout.appendTo.cat(out)
        stderr.appendTo = stderr.appendTo.cat(out)
        stdout.overwrite = stdout.overwrite.cat(out)
        stderr.overwrite = stderr.overwrite.cat(out)
    }
    
    // await any promise inputs automatically, remove all null results
    stdin.from       = (await Promise.all(stdin.from      )).filter(each=>each != null)
    stdout.appendTo  = (await Promise.all(stdout.appendTo )).filter(each=>each != null)
    stdout.overwrite = (await Promise.all(stdout.overwrite)).filter(each=>each != null)
    stderr.appendTo  = (await Promise.all(stderr.appendTo )).filter(each=>each != null)
    stderr.overwrite = (await Promise.all(stderr.overwrite)).filter(each=>each != null)

    // 
    // check cwd
    // 
    if (cwd !== undefined) {
        const folderExists = await Deno.stat(cwd).then(({isDirectory})=>isDirectory).catch(()=>false)
        if (!folderExists) {
            throw Error(`${debuggingString}It was given a .with({ cwd: \n${JSON.stringify(cwd)}})\nbut that doesn't seem to be a path to a folder, so the command fails\n\n`)
        }
    }

    return {
        command,
        stdin,
        stdout,
        stderr,
        cwd,
        env,
    }
}


const partialDoubleQuotePattern = /^"(\\.|[^"\n])*($|")/
const fullDoubleQuotePattern = /^"(\\.|[^"\n])*"/
const partialSingleQuotePattern = /^'(\\.|[^'\n])*($|')/
const fullSingleQuotePattern = /^'(\\.|[^'\n])*'/
async function standardizeCommandArgs(maybeStrings, ...args) {
    // non-templated input
    if (!(maybeStrings instanceof Array)) {
        const output = await Promise.all([ maybeStrings, ...args ])
        // very simple
        return output.filter(each=>each!=null).map(toString)
    // templated input
    } else {
        // for some reason the original one is non-editable so make a copy
        maybeStrings = [...maybeStrings]
        args = await Promise.all(args)
        const argsInOrder = zip(maybeStrings, args).flat()
        
        let combineWithPrevious = false
        let partialArg = ""
        const newArgs = []
        const submitQuotesCheck = ()=>{
            if (partialArg.match(fullDoubleQuotePattern)) {
                newArgs.push(JSON.parse(partialArg))
                partialArg = ""
            } else if (partialArg.match(fullSingleQuotePattern)) {
                const doubleQuoteStringLiteral = swapDoubleAndSingleQuotes(partialArg)
                const outputString = JSON.parse(doubleQuoteStringLiteral)
                const fixedArg = swapDoubleAndSingleQuotes(outputString) // back to single quotes
                newArgs.push(fixedArg)
                partialArg = ""
            }
        }
        for (const [ eachIndex, each ] of enumerate(argsInOrder)) {
            const isPureString = eachIndex % 2 == 0
            // 
            // ${arg}
            // 
            if (!isPureString) {
                // skip null/undefined inputs
                if (each == null) {
                    continue
                }
                const asString = toString(each)
                if (!partialArg) {
                    newArgs.push(asString)
                } else {
                    if (partialArg[0] == '"') {
                        // escape the quotes by using JSON
                        partialArg += JSON.stringify(asString).slice(1,-1) 
                    } else if (partialArg[0] == "'") {
                        // swap double and single quotes (which will get swapped back later)
                        partialArg += swapDoubleAndSingleQuotes(JSON.stringify(asString).slice(1,-1))
                    } else {
                        partialArg += asString
                    }
                }
            // 
            // strings inbetween any ${arg}
            // 
            } else {
                let skipTo = 0
                const arrayOfChars = [...each]
                for (let [ index, eachChar ] of enumerate(arrayOfChars)) {
                    if (skipTo >= arrayOfChars.length-1) {
                        break
                    } else if (skipTo > index) {
                        continue
                    }

                    // when searching for next argument
                    if (partialArg.length == 0) {
                        // skip leading whitespace
                        if (eachChar == " " || eachChar == "\t" || eachChar == "\n") {
                            continue
                        // expand tilde
                        } else if (eachChar == "~") {
                            eachChar = eachChar.replace("~", OperatingSystem.home)
                        // double quote
                        } else if (eachChar == '"') {
                            const remaining = arrayOfChars.slice(index,).join("")
                            // full double quote
                            const match = remaining.match(fullDoubleQuotePattern)
                            if (match) {
                                partialArg = match[0]
                                skipTo = partialArg.length-1
                                submitQuotesCheck()
                                continue
                            // partial check
                            } else {
                                const match = remaining.match(partialDoubleQuotePattern)
                                partialArg = match[0]
                                break // partial quotes will always match all remaining characters (at least when the full quote match fails)
                            }
                        // single quote
                        } else if (eachChar == "'") {
                            const remaining = arrayOfChars.slice(index,).join("")
                            // full double quote
                            const match = remaining.match(fullSingleQuotePattern)
                            if (match) {
                                partialArg = match[0]
                                skipTo = partialArg.length-1
                                submitQuotesCheck()
                                continue
                            // partial check
                            } else {
                                const match = remaining.match(partialSingleQuotePattern)
                                partialArg = match[0]
                                break // partial quotes will always match all remaining characters (at least when the full quote match fails)
                            }
                        }
                        
                        partialArg += eachChar
                    } else if (eachChar == " " || eachChar == "\t" || eachChar == "\n") {
                        newArgs.push(partialArg)
                        partialArg = ""
                    // continuing an existing string
                    } else {
                        partialArg += eachChar
                        // check if this ended the quote (sometimes it doesnt because of escaping)
                        if (eachChar == `"` || eachChar == `'`) {
                            // submit quotes whenever they're completed
                            submitQuotesCheck()
                        }
                    }
                }
            }
        }
        
        // check for submitting last argument
        if (partialArg.length > 0) {
            // check for unfinished quote
            if (partialArg[0] == '"' || partialArg[0] == "'") {
                const debuggingString = getDebuggingString(maybeStrings, ...args)
                throw Error(`${debuggingString}It seems you have either an unfinished singlequote or doublequote somewhere in there. If you want to literally have a single/double quote as an argument, then do it like this:\n    run\` echo \${\`this arg ends with a literal quote: "\`} \` \n\n\n`)
            } else {
                // submit final quote
                newArgs.push(partialArg)
                partialArg = ""
            }
        }

        return newArgs
    }
}
function getDebuggingString(maybeStrings, ...args) {
    if (!(maybeStrings instanceof Array)) {
        const argsString = indent({
            string: [ maybeStrings, ...args ].filter(each=>each!=null).map(toRepresentation).join("\n"),
            by: "        "
        })
        return `\n\n\n------------------------------------\nerror/warning\n------------------------------------\n\nI was given a run command that probably looks something like: \n    run(\n${argsString}\n    )\n\n`
    // templated input
    } else {
        const debuggingString = "run`"+zip(maybeStrings, args.map(each=>`\${${toRepresentation(each)}}`)).flat().join("")+"`"
        return `\n\n\n------------------------------------\nerror/warning\n------------------------------------\n\nI was given a run command that probably looks like: \n    ${debuggingString}\n\n`
    }
}



const synchronousMethods = (thisTask, outputPromise) => ({
    [taskSymbol]: thisTask,
    interactive: ({ onOut, onStdout, onStderr, onFinsh, stdin, stdout, out, cwd, env, timeout })=>{
        const args = { stdin, stdout, out, cwd, env, timeout, interactive: {onOut, onStdout, onStderr, onFinsh}, }
        // merge arguments with any existing ones
        assignArgs(thisTask, args)
        return outputPromise
    },
    with: ({ stdin, stdout, out, cwd, env, timeout })=>{
        const args = { stdin, stdout, out, cwd, env, timeout }
        // merge arguments with any existing ones
        assignArgs(thisTask, args)
        return outputPromise
    },
    stdin: ({ from })=>{
        if (!(thisTask.stdin instanceof Object)) {
            thisTask.stdin = {
                from: [],
            }
        }
        
        // merge arguments with any existing ones
        thisTask.stdin = {
            from: thisTask.stdin.from.cat(makeArray(overwrite)),
        }
        
        return outputPromise
    },
    stdout: ({ overwrite, appendTo, })=>{
        if (!(thisTask.stdout instanceof Object)) {
            thisTask.stdout = {
                overwrite: [],
                appendTo: [],
            }
        }
        
        // merge arguments with any existing ones
        thisTask.stdout = {
            overwrite: thisTask.stdout.overwrite.cat(makeArray(overwrite)),
            appendTo: thisTask.stdout.appendTo.cat(makeArray(overwrite)),
        }
        
        return outputPromise
    },
    stderr: ({ overwrite, appendTo, })=>{
        if (!(thisTask.stderr instanceof Object)) {
            thisTask.stderr = {
                overwrite: [],
                appendTo: [],
            }
        }
        
        // merge arguments with any existing ones
        thisTask.stderr = {
            overwrite: thisTask.stderr.overwrite.cat(makeArray(overwrite)),
            appendTo: thisTask.stderr.appendTo.cat(makeArray(overwrite)),
        }
        
        return outputPromise
    },
    out: ({ overwrite, appendTo, })=>{
        if (!(thisTask.out instanceof Object)) {
            thisTask.out = {
                overwrite: [],
                appendTo: [],
            }
        }
        
        // merge arguments with any existing ones
        thisTask.out = {
            overwrite: thisTask.stdout.overwrite.cat(makeArray(overwrite)),
            appendTo: thisTask.stdout.appendTo.cat(makeArray(overwrite)),
        }
        
        return outputPromise
    },
    and: (otherPromise)=>{
        // stop the other one from executing
        const otherTask = otherPromise[taskSymbol]
        otherTask.delay()
        // hook it into this task
        thisTask.andTask = otherTask
        return otherPromise
    },
    or: (otherPromise)=>{
        // stop the other one from executing
        const otherTask = otherPromise[taskSymbol]
        otherTask.delay()
        // hook it into this task
        thisTask.orTask = otherTask
        return otherPromise
    },
    pipeTo: (otherPromise)=>{
        // stop the other one from executing
        const otherTask = otherPromise[taskSymbol]
        otherTask.delay()
        thisTask.out = makeArray(thisTask.out)
        thisTask.out.push(otherTask)
        return otherPromise
    },
    pipeStdoutTo: (otherPromise)=>{
        // stop the other one from executing
        const otherTask = otherPromise[taskSymbol]
        otherTask.delay()
        thisTask.stdout = makeArray(thisTask.stdout)
        thisTask.stdout.push(otherTask)
        return otherPromise
    },
    pipeStderrTo: (otherPromise)=>{
        // stop the other one from executing
        const otherTask = otherPromise[taskSymbol]
        otherTask.delay()
        thisTask.stderr = makeArray(thisTask.stderr)
        thisTask.stderr.push(otherTask)
        return otherPromise
    },
})


// 
// stdin handling streams
// 
import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"

const isReadable = (obj) => obj instanceof Object && obj.read instanceof Function
const isWritable = (obj) => obj instanceof Object && obj.write instanceof Function

function toReadableStream(value) {
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
async function toWritableStream(value, overwrite=true) {
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
function stdinArugmentToReader(stdin, debugString) {
    // remove any null's or undefined's
    let stdinSources = stdin.from
    // default value is [Deno.stdin] so empty must mean intentionally empty
    if (stdinSources.length == 0) {
        stdinSources.push("")
    }
    
    let stdinReader

    // check if all strings/bytes (this is for efficiency of throughput)
    if (stdinSources.every(each=>typeof each == 'string' || each instanceof Uint8Array)) {
        const allUint8Arrays = stdinSources.map(each=>typeof each != 'string' ? each : new TextEncoder().encode(each))
        // creates a single big Uint8 array
        stdinReader = concatUint8Arrays(allUint8Arrays)
    } else {
        // for all remaining args
        for (const eachSource of stdinSources) {
            try {
                const newStream = toReadableStream(eachSource)
                // mergeReadableStreams is kind of like concat, first one entirely then the next (the alternative is zip: take one chunk from each then repeat)
                stdinReader = !stdinReader ? newStream : stdinReader.mergeReadableStreams(stdinReader, newStream)
            } catch (error) {
                throw Error(`${debugString}A stdin() was given, but there was a problem with one of the arguments.\n${error.message}`)
            }
        }
    }
    return stdinReader
}

// create a helper that will prevent duplicates
const streamAlreadyCreated = new Map()
const getWritableFor = async (inputValue, debuggingString) => {
    if (!streamAlreadyCreated.has(inputValue)) {
        try {
            streamAlreadyCreated.set(inputValue, await toWritableStream(eachValue))
        } catch (error) {
            throw Error(`${debuggingString}When processing one of the output streams (stdout, stderr, out) one of the values was a problem. ${error.message}`)
        }
    }
    return streamAlreadyCreated.get(inputValue)
}
const outOrErrToWriterTargets = async (out, debuggingString) => {
    return [
        await Promise.all(
            out.overwrite.map(each=>getWritableFor(each, debuggingString))
        ),
        await Promise.all(
            out.appendTo.map(each=>getWritableFor(each, debuggingString))
        ),
    ].flat()
}
const mapOutToStreams = async (stdout, stderr, stdoutWritables, stderrWritables) => {
    // 
    // NOTE: this process is kind of complicated because of checking
    //       for stderr/stdout to the same source 
    //       and for outputing them to mulitple sources
    // 

    // 
    // figure out how many streams are needed
    // 
    const neededByStdout = new Map()
    const neededByStderr = new Map()
    // what needs stdout
    for (const each of stdoutWritables) {
        // init to set if doesnt exist
        neededByStdout.set(each, true)
        neededByStderr.set(each, false) // will be overwritten next
    }
    // what needs stderr
    for (const each of stderrWritables) {
        neededByStderr.set(each, true)
        if (!neededByStdout.has(each)) {
            neededByStdout.set(each, false)
        }
    }
    
    // 
    // generate a bunch of source copies
    // 
    // complicated because tee-ing a stream kind of destroys the original 
    // and its better to tee in a branching way than in a all-on-one-side way (BFS-style not DFS-style)
    const stdoutStreamSplitQue = []
    const stderrStreamSplitQue = []
    // the initial ones are edgecases
    if (stdoutWritables.length > 0) {
        stdoutStreamSplitQue.push(readableStreamFromReader(stdout))
    }
    if (stderrWritables.length > 0) {
        stderrStreamSplitQue.push(readableStreamFromReader(stderr))
    }
    while (stdoutStreamSplitQue.length < stdoutWritables.length) {
        // take off the front of the que (back of the list), create two more items (tee) put them at the back of the que (front of the list)
        stdoutStreamSplitQue = stdoutStreamSplitQue.pop().tee().concat(stdoutStreamSplitQue)
    }
    while (stderrStreamSplitQue.length < stderrWritables.length) {
        // take off the front of the que (back of the list), create two more items put them at the back of the que (front of the list)
        stderrStreamSplitQue = stderrStreamSplitQue.pop().tee().concat(stderrStreamSplitQue)
    }
    // now we should have the appropriate number of streams
    const stdoutStreams = stdoutStreamSplitQue
    const stderrStreams = stderrStreamSplitQue

    // 
    // connect all the source copies to the correct target copies
    // 
    for (const eachStreamArg of [...new Set(stdoutWritables.concat(stderrWritables))]) {
        let sourceStream
        const wasNeededByStdout = neededByStdout.get(eachStreamArg)
        // needs one of: [both, stdout, or stderr]
        if (wasNeededByStdout && neededByStderr.get(eachStreamArg)) {
            sourceStream = zipReadableStreams(stdoutStreams.pop(), stderrStreams.pop())
        } else if (wasNeededByStdout) {
            sourceStream = stdoutStreams.pop()
        } else {
            sourceStream = stderrStreams.pop()
        }

        // every stream arg should be a writable stream by this point
        sourceStream.pipeTo(eachStreamArg)
    }
}


// 
// 
// the convoluted/messy wrapper
// 
// 
function run(...args) {
    const thisTask = {
        command: args,
        stdin: notGiven,
        stdout: notGiven,
        stderr: notGiven,
        out: notGiven,
        delay: ()=>{
            thisTask.delayed = true
            if (thisTask.cancelId) {
                clearTimeout(thisTask.cancelId)
            }
            // TODO: add a "too late" check
        },
        wasPrunedBy: null,
        resolve: null,
        reject: null,
        andTask: null,
        orTask: null,
    }
    
    // wraps simpleRun, and is only executed once we actually want to send the command to the OS
    thisTask.function = async ()=>{
        let result = {}
        let finished = false

        if (thisTask.timeout) {
            setTimeout(()=>{
                // do nothing if already done
                if (finished) {
                    return
                }
                thisTask.wasPrunedBy = `timeout:${thisTask.timeout}`
                // kill the task
                if (result.kill instanceof Function) {
                    // if interactive, stop the input first
                    if (result.interactive) {
                        if (result.noMoreInput instanceof Function) {
                            result.noMoreInput()
                        }
                    }

                    try {
                        result.kill()
                    } catch (error) {
                        
                    }
                }
                // make the promise return
                thisTask.resolve({
                    success: false,
                    reason: `killed by timeout of ${thisTask.timeout}`
                })
            }, thisTask.timeout)
        }

        // needs to call thisTask.resolve and/or thisTask.reject
        // uses thisTask as input
        try {
            result = await simpleRun(thisTask)
            if (result.interactive) {
                try {
                    result.success = await result.success
                } catch (error) {
                    result = error
                    result.success = false
                }
            }
        } catch (error) {
            result = error
            result.success = false
        }
        finished = true

        // if pruned, do nothing (resolve/reject was already called)
        if (thisTask.wasPrunedBy) {
            return
        }
        
        // 
        // andTask
        // 
        if (thisTask.andTask) {
            if (!result.success) {
                // never got to run the andTask
                thisTask.andTask.wasPrunedBy = result
                thisTask.andTask.resolve(result)
                thisTask.resolve(result)
            } else {
                // run the andTask and return that instead
                thisTask.resolve(result)
                thisTask.andTask.function()
            }
        // 
        // orTask
        // 
        } else if (thisTask.orTask) {
            if (result.success) {
                // never got to run the orTask
                thisTask.orTask.wasPrunedBy = result
                thisTask.orTask.resolve(result)
                thisTask.resolve(result)
            } else {
                // run the orTask and return that instead
                thisTask.resolve(result)
                thisTask.orTask.function()
            }
        // 
        // no chained task
        // 
        } else {
            thisTask.resolve(result)
        }
    }
    
    // create a time gap between when this code is running and when we send the command to the OS
    // allow it to be cancelled before it starts
    const outputPromise = new Promise((resolve, reject)=>{
        thisTask.resolve = resolve
        thisTask.reject = reject
        if (!thisTask.delayed) {
            thisTask.cancelId = setTimeout(()=>{
                if (!thisTask.delayed) { // yes the delay check needs to be in two places
                    thisTask.function()
                }
            }, 0)
        }
    })
    
    // 
    // mutate the promise output, make all synchronousMethods return the promise again (chaining)
    // 
    Object.assign(outputPromise, synchronousMethods(thisTask, outputPromise))

    return outputPromise
}


// 
// 
// generic helpers
// 
// 


// for arguments that can either be a value or an array
const makeArray = (arg) => {
    if (arg instanceof Array) {
        return arg
    } else if (arg !== undefined) {
        return [ arg ]
    } else {
        return []
    }
}

const assignArgs = (object, args) => {
    for (const [key, newValue] of Object.entries(args)) {
        if (newValue !== undefined) {
            if (newValue instanceof Object) {
                // merge if both are objects
                if (object[key] instanceof Object) {
                    Object.assign(object[key], newValue)
                } else {
                    object[key] = newValue
                }
            } else {
                object[key] = newValue
            }
        }
    }
}

const concatUint8Arrays = (arrays) => new Uint8Array( // simplified from: https://stackoverflow.com/questions/49129643/how-do-i-merge-an-array-of-uint8arrays
        arrays.reduce((acc, curr) => (acc.push(...curr),acc), [])
    )

const swapDoubleAndSingleQuotes = (string)=> string.replace(/'|"/g, (group0)=>group0==`"` ? `'` : `"`)

const streamToString = async (stream) => {
    const returnReader = stream.getReader()
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