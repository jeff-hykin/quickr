import { Event, trigger, everyTime, once } from "https://deno.land/x/good@0.5.1/events.js"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@0.5.1/array.js"
import { capitalize, indent, toCamelCase, numberToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString } from "https://deno.land/x/good@0.5.1/string.js"
import { OperatingSystem } from "./operating_system.js"
import { intersection, subtract } from "https://deno.land/x/good@0.5.15/set.js"

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
        var { command, stdin, stdout, stderr, out, cwd, env } = await standardizeInputs({ command, stdin, stdout, stderr, out, cwd, env, debuggingString})
        let process = Deno.run({
            cmd: command.filter(each=>(typeof each == 'string')),
            env,
            cwd,
            stdin: stdin.from.length ? 'piped' : 'null',
            stdout: stdout.overwrite.length && stdout.appendTo.length ? 'piped' : 'null',
            stderr: stderr.overwrite.length && stderr.appendTo.length ? 'piped' : 'null',
        })
        
        // 
        // create streams
        // 
        const stdinSource   = stdinArugmentToSource(stdin, debuggingString)
        const stdoutTargets = outOrErrToWriterTargets(stdout, debuggingString)
        const stderrTargets = outOrErrToWriterTargets(stderr, debuggingString)
        
        // 
        // connect streams
        // 
        await mapOutToStreams(process.stdout, process.stderr, stdoutTargets, stderrTargets)
        await mapInToStream(process.stdin, stdinSource)
        
        // 
        // interface wrapper TODO
        // 
        return {

        }
    }

    // interactive: {onOut, onStdout, onStderr, onFinsh}
        // success becomes a promise
        // and an interactive object is returned, with pid, moreInput, noMoreInput, stdout, stderr, signal, cancel, kill, exitCode

    // return needs to include {interactive, success, cancel, kill}
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
// 
// details
// 
// 
    async function standardizeInputs({ command, stdin, stdout, stderr, out, cwd, env, debuggingString }) {
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

    
    // 
    // string for identifying the error source (help users debug)
    // 
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


    // 
    // command args
    // 
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

// 
// 
// streams
// 
// 
import { toReadableStream, toWritableStream, duplicateReadableStream, zipReadableStreams, mergeReadableStreams, readableStreamFromReader, writableStreamFromWriter } from "./stream_tools.js"

    // 
    // stdin 
    // 
        function stdinArugmentToSource(stdin, debugString) {
            // remove any null's or undefined's
            let stdinSources = stdin.from
            // default value is [Deno.stdin] so empty must mean intentionally empty
            if (stdinSources.length == 0) {
                return null
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
        const mapInToStream = async (stdinOfProcess, stdinReader) => {
            if (stdinReader instanceof Uint8Array) {
                // without the stdin.close() part the process will wait forever
                stdinOfProcess.write(stdinReader).then(()=>stdinOfProcess.close())
            } else if (stdinReader instanceof ReadableStream) {
                // actually pipe data
                writableStreamFromWriter(stdinOfProcess)
            }
        }
    
    // 
    // stdout
    // 
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
                await Promise.all(   out.overwrite.map(each=>getWritableFor(each, debuggingString))   ),
                await Promise.all(   out.appendTo.map( each=>getWritableFor(each, debuggingString))   ),
            ].flat()
        }
        const mapOutToStreams = async (stdoutOfProcess, stderrOfProcess, stdoutWritables, stderrWritables) => {
            // 
            // figure out how many streams are needed
            // 
            const neededByStdout  = new Set(stdoutWritables)
            const neededByStderr  = new Set(stderrWritables)
            const neededByBoth    = new Set(intersection(neededByStdout, neededByStderr))
            const neededByOutOnly = new Set(subtract({value: neededByBoth, from: neededByStdout }))
            const neededByErrOnly = new Set(subtract({value: neededByBoth, from: neededByStderr }))
            
            // 
            // generate a bunch of copies of the source (AFAIK copies is the only way to do it)
            // 
            const stdoutStreams = duplicateReadableStream(stdoutOfProcess, neededByStdout.size)
            const stderrStreams = duplicateReadableStream(stderrOfProcess, neededByStderr.size)

            // 
            // connect all the source copies to the correct target copies
            // 
            for (const targetStream of neededByBoth) {
                zipReadableStreams(stdoutStreams.pop(), stderrStreams.pop()).pipeTo(targetStream)
            }
            for (const each of neededByOutOnly) {
                stdoutStreams.pop().pipeTo(targetStream)
            }
            for (const each of neededByErrOnly) {
                stderrStreams.pop().pipeTo(targetStream)
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