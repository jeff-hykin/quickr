import { FileSystem } from "./file_system.js"
import { Console } from "./console.js"
import { OperatingSystem } from "./operating_system.js"
import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"
import { StringReader } from "https://deno.land/std@0.128.0/io/mod.ts"
import * as Path from "https://deno.land/std@0.117.0/path/mod.ts"
import { toRepresentation as debugValueAsString } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/flattened/to_representation.js"
import { deferredPromise } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/async.js"

const timeoutSymbol      = Symbol("timeout")
const envSymbol          = Symbol("env")
const cwdSymbol          = Symbol("cwd")
const stdinSymbol        = Symbol("stdin")
const stdoutSymbol       = Symbol("stdout")
const stderrSymbol       = Symbol("stderr")
const stdoutAndErrSymbol = Symbol("stdoutAndErr")
const overwriteSymbol    = Symbol("overwrite")
const appendSymbol       = Symbol("append")
const asString  = Symbol("asString") // TODO: integrate this as a feature (returns { stdout: "blh", stderr: "bal", output: "blhbal" })
export const throwIfFails = Symbol("throwIfFails")
export const zipInto        = Symbol("zipInto")
export const mergeInto      = Symbol("mergeInto")
export const returnAsString = Symbol("returnAsString")
export const Timeout   = ({gentlyBy, waitBeforeUsingForce})=>[timeoutSymbol, {gentlyBy, waitBeforeUsingForce}]
export const Env       = (envVars)=>[envSymbol, envVars]
export const Cwd       = (newDirectory)=>[cwdSymbol, newDirectory]
export const Stdin     = (...streamsFilesOrStrings)=>[stdinSymbol , streamsFilesOrStrings]
export const Stdout    = (...pathsFilesStreamsOrSymbols)=>[stdoutSymbol, pathsFilesStreamsOrSymbols]
export const Stderr    = (...pathsFilesStreamsOrSymbols)=>[stderrSymbol, pathsFilesStreamsOrSymbols]
export const Out       = (...pathsFilesStreamsOrSymbols)=>[stdoutAndErrSymbol, pathsFilesStreamsOrSymbols]
export const Overwrite = (fileOrFilePath)=>[overwriteSymbol, fileOrFilePath]
export const AppendTo  = (fileOrFilePath)=>[appendSymbol, fileOrFilePath]

// 
// 
// Helpers
// 
// 

// based on this, thats all it is: https://deno.land/std@0.125.0/io/types.d.ts
// this does cause a bit of a problem though because files meet this defintion but are "readable" enough I suppose
// because they still need to be converted using readableStream
const isReadable = (obj) => obj instanceof Object && obj.read instanceof Function
const isWritable = (obj) => obj instanceof Object && obj.write instanceof Function

const concatUint8Arrays = (arrays) => new Uint8Array( // simplified from: https://stackoverflow.com/questions/49129643/how-do-i-merge-an-array-of-uint8arrays
        arrays.reduce((acc, curr) => (acc.push(...curr),acc), [])
    )
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

const { isWindows, isLinux, isMac } = OperatingSystem.commonChecks

export const pathsToAllCommands = async () => {
    const paths = Console.paths
    const executableFilePaths = (await Promise.all(paths.map(
        each=>FileSystem.listFilePathsIn(each, {
            shouldntInclude: async (path)=>{
                if (isWindows) { // currently cant check execute permissions in windows
                    return false
                }
                try {
                    const permissions = (await FileSystem.getPermissions({path}))
                    // filter out non-executable files
                    if (!(permissions.owner.canExecute||permissions.group.canExecute||permissions.others.canExecute)) {
                        return true
                    }
                } catch (error) {
                    console.debug(`error is:`,error)
                }
            }
        })
    ))).flat(1)
    
    const mapping = {}
    for (const each of executableFilePaths) {
        const basename = FileSystem.basename(each)
        const paths = mapping[basename] || []
        paths.push(each)
        mapping[basename] = paths
    }
    return mapping
}

/**
 * @example
 * ```js
 * const path = Deno.env.get("PATH").split(":")[0])
 * if (await pathHasCommand({command: "git", path })) {
 *     console.log(`which git = ${path}/git`)
 * }
 * ```
 *
 * @param {String} arg1.path - 
 * @param {String} arg1.command - 
 * @returns {Boolean} output - 
 *
 */
export const pathHasCommand = ({path, command})=> {
    if (isWindows) {
        // TODO: figure out if there is a "isExecutable" check on window
        return Promise.any([
            FileSystem.info(`${path}/${command}`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.exe`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.bat`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.ps1`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
        ]).catch(_=>false)
    } else {
        // TODO: currently this is misleading if, for example, only the group can execute, but the current user is not part of the group
        //       this requires an interface for getting the current user group and username, which isnt created yet
        return FileSystem.getPermissions({path}).then((permissions)=>(permissions.owner.canExecute||permissions.group.canExecute||permissions.others.canExecute)).catch(_=>false)
    }
}

export const pathsToCommands = async (commands) => {
    commands = new Set(commands)
    const paths = Console.paths
    const executableFilePaths = (await Promise.all(paths.map(
        each=>FileSystem.listFilePathsIn(each, {
            shouldntInclude: async (path)=>{
                const basename = FileSystem.basename(path)
                if (isWindows) { 
                    // TODO: figure out if there is a "isExecutable" check on window

                    // check all possible executable sources
                    if (!(commands.has(basename) || commands.has(basename+".exe") || commands.has(basename+".bat") || commands.has(basename+".ps1"))) {
                        return true
                    }
                } else {
                    // filter out files that dont match the names
                    if (!commands.has(basename)) {
                        return true
                    }
                    // filter out non-executable files
                    const permissions = (await FileSystem.getPermissions({path}))
                    if (!(permissions.owner.canExecute||permissions.group.canExecute||permissions.others.canExecute)) {
                        return true
                    }
                }
            }
        })
    ))).flat(1)
    
    const mapping = {}
    for (const each of executableFilePaths) {
        const basename = FileSystem.basename(each)
        const paths = mapping[basename] || []
        paths.push(each)
        mapping[basename] = paths
    }
    return mapping
}

export const checkCommands = async (commands) => {
    const mapping = await pathsToCommands(commands)
    return {
        missing: commands.filter(each=>!mapping[each]),
        available: commands.filter(each=>mapping[each]),
    }
}

export const hasCommand = (commandName)=>{
    if (isWindows) {
        // TODO: check if something like "hi.bat.bat" is allowed and what gets executed when './hi.bat' is attempted to be run
        if (!(commandName.endsWith(".exe")||commandName.endsWith(".ps1")||commandName.endsWith(".bat"))) {
            return checkCommands([commandName, `${commandName}.exe`, `${commandName}.bat`, `${commandName}.ps1`, ]).then(({available})=>available.length!=0)
        }
    }
    return checkCommands([commandName]).then(({missing})=>missing.length==0)
}

// 
// 
// patch Deno.open as to have a means of doing ridToPath
// 
// 
    const alreadyOpenFiles = {}
    const ridToPath = {}
    const realDenoOpen = Deno.open.bind(Deno)
    Deno.open = (function(...args) {
        const path = FileSystem.makeAbsolutePath(args[0])
        if (!alreadyOpenFiles[path]) {
            alreadyOpenFiles[path] = realDenoOpen(...args).then(file=>{
                ridToPath[file.rid] = path
                const realClose = file.close
                file.close = (function(...args) {
                    delete alreadyOpenFiles[path]
                    realClose.apply(file, ...args)
                }).bind(file)
                return file
            })
        }
        return alreadyOpenFiles[path]
    }).bind(Deno)
    const realDenoOpenSync = Deno.openSync.bind(Deno)
    Deno.openSync = (function(...args) {
        const path = FileSystem.makeAbsolutePath(args[0])
        if (!alreadyOpenFiles[path]) {
            const file = realDenoOpenSync(...args)
            ridToPath[file.rid] = path
            const realClose = file.close
            file.close = (function(...args) {
                delete alreadyOpenFiles[path]
                realClose(...args)
            }).bind(file)
            alreadyOpenFiles[path] = file
        }
        return alreadyOpenFiles[path]
    }).bind(Deno)

// 
// 
// Main function!
// 
// 
export const run = (maybeStrings, ...args) => {
    // 
    // add template support
    // 
    let newArgs = []
    const argSplitter = /[ \t]+/
    if (maybeStrings instanceof Array) {
        maybeStrings = [...maybeStrings] // for some reason the original one is non-editable so make a copy
        const lastString = maybeStrings.pop()
        for (const eachString of maybeStrings) {
            const innerArgs = eachString.split(argSplitter)
            for (const each of innerArgs) {
                if (each.length > 0) {
                    newArgs.push(each)
                }
            }
            newArgs.push(args.shift())
        }
        // edgecase of last string arg
        const endingArgsString = lastString.trim()
        if (endingArgsString.length > 0) {
            const endingArgs = endingArgsString.split(argSplitter)
            for (const each of endingArgs) {
                newArgs.push(each)
            }
        }
        args = newArgs
        // return (...args)=>run(newArgs, ...args) // <- next version use this
    } else {
        args = [ maybeStrings, ...args ]
    }
    
    // 
    // parse args
    // 
    const commandMetaData = {
        timeout: {gentlyBy: undefined, waitBeforeUsingForce: undefined},
        env: undefined,
        cwd: undefined,
        stdin: undefined,
        stdout: undefined,
        stderr: undefined,
        outAndError: [],
    }
    for (const each of args) {
        if (typeof each == 'symbol') {
            if (each == throwIfFails) {
                commandMetaData.throwIfFails = true
            }
        }
        if (each instanceof Array && typeof each[0] == 'symbol') {
            const [symbol, value] = each
            if (symbol === timeoutSymbol     ) { Object.assign(commandMetaData.timeout, value)}
            if (symbol === envSymbol         ) { commandMetaData.env         = value }
            if (symbol === cwdSymbol         ) { commandMetaData.cwd         = value }
            if (symbol === stdinSymbol       ) { commandMetaData.stdin       = value }
            if (symbol === stdoutSymbol      ) { commandMetaData.stdout      = value }
            if (symbol === stderrSymbol      ) { commandMetaData.stderr      = value }
            if (symbol === stdoutAndErrSymbol) { commandMetaData.outAndError = value }
        }
    }

    // 
    // start setting up the arg for Deno.run
    // 
    const runArg = {
        cmd: args.filter(each=>(typeof each == 'string')),
        env: commandMetaData.env,
        cwd: commandMetaData.cwd,
        stdin: undefined,
        stdout: undefined,
        stderr: undefined,
    }
    
    const syncStatus = { done: false, exitCode: undefined, success: undefined }

    // 
    // this is done to prevent the ugly (await (await run()).success()) syntax
    // 
    const asyncPart = async ()=> {
        // 
        // timeout check
        //
        if (
            // either both should be null or both should be set
            (commandMetaData.timeout.gentlyBy == null) !== (commandMetaData.timeout.waitBeforeUsingForce == null)
            ||
            (commandMetaData.timeout.gentlyBy != null) && (
                !(commandMetaData.timeout.gentlyBy >= 0)
                ||
                !(commandMetaData.timeout.waitBeforeUsingForce >= 0)
            )
        ) {
            throw Error(`\nWhen running command:\n    ${JSON.stringify(runArg.cmd)}\nit was given a:\n    Timeout(${JSON.stringify(commandMetaData.timeout)})\nhowever both "gentlyBy" and "waitBeforeUsingForce" are needed.\nFor example, if \n    gentlyBy: 1000\n    waitBeforeUsingForce: 500\nit would be force killed 1.5sec after the process started.\nIf you never want force to be used, do {waitBeforeUsingForce: Infinity}\n\n`)
        }
        
        // cmd doesn't need checking
        
        // env doesn't really need checking

        // 
        // check cwd 
        // 
        if (runArg.cwd !== undefined) {
            const folderExists = await Deno.stat(runArg.cwd).then(({isDirectory})=>isDirectory).catch(()=>false)
            if (!folderExists) {
                throw Error(`\nWhen running command:\n    ${JSON.stringify(runArg.cmd)}\nit was given a Cwd (cwd) of:\n${JSON.stringify(runArg.cwd)}\nbut that doesn't seem to be a path to a folder, so the command would fail.\n\n`)
            }
        }

        // 
        // handle stdin (pre-start)
        // 
        let stdinWriter = undefined
        if (commandMetaData.stdin !== undefined) {
            let stdinArgs = commandMetaData.stdin
            
            // await any promise values
            let index = 0
            for (const each of stdinArgs) {
                if (each instanceof Promise) {
                    stdinArgs[index] = await each
                }
                ++index
            }
            
            if (stdinArgs.length == 0) {
                runArg.stdin = 'piped'
            } else if (stdinArgs.length == 1 && stdinArgs[0] == null) {
                runArg.stdin = 'null'
            } else {
                // remove all the null's and undefined's
                stdinArgs = stdinArgs.filter(each=>each != null)
                // if no valid arguments after that, theres a problem
                if (stdinArgs.length == 0) {
                    throw Error(`when calling run() with the command: \n    ${JSON.stringify(runArg.cmd)}\nAn Stdin() was given, but it wasn't given any arguments\nif you want Stdin to be nothing (instead of the default Stdin(Deno.stdin)) put Stdin(null)\n\n`)
                } else {
                    runArg.stdin = 'piped'
                    
                    // all strings/bytes (this check is done for efficiency of throughput)
                    if (stdinArgs.every(each=>typeof each == 'string' || each instanceof Uint8Array)) {
                        const allUint8Arrays = stdinArgs.map(each=>typeof each != 'string' ? each : new TextEncoder().encode(each))
                        // creates a single Uint8 array
                        stdinWriter = concatUint8Arrays(allUint8Arrays)
                    } else {
                        // 
                        // create the initial stream
                        // 
                        const first = stdinArgs[0]
                        let prev
                        // string to readable stream
                        if (typeof first == 'string') {
                            stdinWriter = readableStreamFromReader(new StringReader(first))
                            prev = 'string'
                        // Uint8 (raw data) to readable stream
                        } else if (first instanceof Uint8Array) {
                            stdinWriter = readableStreamFromReader(new Buffer(first))
                            prev = 'uint8array'
                        // check for readable stream itself
                        } else if (first instanceof ReadableStream) {
                            stdinWriter = first
                            prev = 'readableStream'
                        // readable to readable stream
                        } else if (isReadable(first)) {
                            stdinWriter = readableStreamFromReader(first)
                            prev = 'readable'
                        } else {
                            throw Error(`when calling run() with the command: \n    ${JSON.stringify(runArg.cmd)}\nAn Stdin() was given, but there was a problem with one of the arguments.\nThe argument can be a string, a file (Deno.open("./path")), bytes (Uint8Array), or any readable object (like Deno.stdin or the .stdout of another run command)\nbut instead of any of those I received:\n    ${first}\n\n`)
                        }

                        // for all remaining args
                        for (const each of stdinArgs.slice(1,)) {
                            // check for overrides of the default merging methods
                            if (each === mergeInto || each === zipInto) {
                                prev = each
                                continue
                            }

                            let newStream
                            if (typeof each == 'string') {
                                newStream = readableStreamFromReader(new StringReader(each))
                                current = 'string'
                            // Uint8 (raw data) to readable stream
                            } else if (each instanceof Uint8Array) {
                                newStream = readableStreamFromReader(new Buffer(each))
                                current = 'uint8'
                            // check for readable stream itself
                            } else if (each instanceof ReadableStream) {
                                newStream = each
                                current = 'readableStream'
                            // readable to readable stream
                            } else if (isReadable(each)) {
                                newStream = readableStreamFromReader(each)
                                current = 'readable'
                            } else {
                                throw Error(`when calling run() with the command: \n    ${JSON.stringify(runArg.cmd)}\nAn Stdin() was given, but there was a problem with one of the arguments.\nThe argument can be a string, a file (Deno.open("./path")), bytes (Uint8Array), or any readable object (like Deno.stdin or the .stdout of another run command)\nbut instead of any of those I received:\n    ${each}\n\n`)
                            }
                            
                            // 
                            // combining method
                            // 
                            // let user specify, but if not specified the strat will be to always zip if both sides are readables, while merging if one side is a string/uint8array
                            if (prev !== zipInto && ( prev === mergeInto || prev == 'string' || prev == 'uint8array' || current == 'string' || current == 'uint8array')) {
                                // merge is kind of like concat, first one then the other (I believe)
                                stdinWriter = stdinWriter.mergeReadableStreams(stdinWriter, newStream)
                            } else {
                                // zip is well, like zip, it get 1 chunk from each and then repeats instead of concating
                                stdinWriter = stdinWriter.zipReadableStreams(stdinWriter, newStream)
                            }
                        }
                    }
                    
                }
            }
        }
        
        // 
        // handle stdout & stderr (pre-start)
        // 
        const outStreamNames = [ 'stdout', 'stderr' ]
        // outAndError
        if (commandMetaData.outAndError.length > 0) {
            for (const each of outStreamNames) {
                if (!(commandMetaData[each] instanceof Array)) {
                    commandMetaData[each] = []
                }
                commandMetaData[each] = commandMetaData[each].concat(commandMetaData.outAndError)
            }
        }
        // stdin, stdout seperatly
        for (const each of outStreamNames) {
            // if it was given at all
            if (commandMetaData[each] !== undefined) {
                // special case of Stdin(null) or Stdout(null)
                if (commandMetaData[each].length == 0) {
                    runArg[each] = 'piped'
                } else if (commandMetaData[each].length == 1 && commandMetaData[each][0] === null) {
                    runArg[each] = 'null'
                } else {
                    runArg[each] = 'piped'
                    // note: surprisingly Sets in ES6 are guarenteed to preserve order, so this only removes null's undefines, and duplicates
                    commandMetaData[each] = [ ... new Set(commandMetaData[each].filter(each=>each!=null))]
                }
            }
        }
        const openFiles = {}
        const convertReturnStreamArg = async (arg) => {
            // save this kind of arg for later
            if (arg === returnAsString) {
                return arg
            }
            // if [symbol, data], convert data to file
            if (arg instanceof Array) {
                if (typeof arg[0] == 'symbol') {
                    let [ symbol, value ] = arg
                    // 
                    // overwrite
                    // 
                    if (symbol === overwriteSymbol) {
                        if (typeof value == 'string') {
                            const path = FileSystem.makeAbsolutePath(value)
                            if (!openFiles[path]) {
                                // ensure parent folders exist
                                await FileSystem.clearAPathFor(value, {overwrite: true})
                                // convert string to a folder
                                openFiles[path] = await Deno.open(value, {write: true, truncate: true, create: true})
                            }
                            value = openFiles[path]
                        }
                        
                        if (value instanceof (Deno.File||class {})) {
                            // clear the file
                            value.truncate()
                        } else {
                            throw Error(`\nWhen running command:\n    ${JSON.stringify(runArg.cmd)}\nit was given one of:\n    Stdout(Overwrite(arg))\n    Stdin(Overwrite(arg))\n    Out(Overwrite(arg))\nHowever the given arg was not a string path or a file object.\nHere's what I know about the argument:${debugValueAsString(value)}\n\n`)
                        }
                    // 
                    // append
                    // 
                    } else if (symbol === appendSymbol) {
                        if (typeof value == 'string') {
                            const path = FileSystem.makeAbsolutePath(value)
                            if (!openFiles[path]) {
                                // ensure parent folders exist
                                await FileSystem.ensureIsFolder(FileSystem.parentPath(value))
                                // convert string to a folder
                                openFiles[path] = await Deno.open(value, {write: true, create: true})
                            }
                            value = openFiles[path]
                            // FIXME: this file never gets closed! it needs to be, but only if it was opened here
                        }
                        
                        if (value instanceof (Deno.File||class {})) {
                            // go to the end of a file (meaning everthing will be appended)
                            await Deno.seek(value.rid, 0, Deno.SeekMode.End)
                        } else {
                            throw Error(`\nWhen running command:\n    ${JSON.stringify(runArg.cmd)}\nit was given one of:\n    Stdout(AppendTo(arg))\n    Stdin(AppendTo(arg))\n    Out(AppendTo(arg))\nHowever the given arg was not a string path or a file object.\nHere's what I know about the argument:${debugValueAsString(value)}\n\n`)
                        }

                    }
                    // arg will be a file
                    arg = value
                }
            }
            
            // values that are alread writeable streams
            if (arg instanceof WritableStream) {
                return arg
            // convert files/writables to writeable streams
            } else if (isWritable(arg)) {
                return writableStreamFromWriter(arg)
            } else if (typeof arg == 'string') {
                throw Error(`\nWhen running command:\n    ${JSON.stringify(runArg.cmd)}\nit was given one of:\n    Stdout(${JSON.stringify(arg)})\n    Stdin(${JSON.stringify(arg)})\n    Out(${JSON.stringify(arg)})\nif you want to have them write to a file:\n    dont:    Out(${JSON.stringify(arg)})\n    instead: Out(Overwrite(${JSON.stringify(arg)}))\n    or:      Out(AppendTo(${JSON.stringify(arg)}))\n\n`)
            }
        }
        // stdin, stdout seperatly
        const alreadyComputed = new Map()
        const convertArgsToWritables = (...args) => args.map(eachArg=>{
            let key
            if (eachArg instanceof Array) {
                key = JSON.stringify(eachArg.map(each=>{
                    if (typeof each == "symbol") {
                        return each.toString()
                    } else if (each instanceof (Deno.File||class {})) {
                        if (ridToPath[each.id]) {
                            return FileSystem.makeAbsolutePath(ridToPath[each.id])
                        }
                        return `Deno.File(${each.rid})`
                    } else if (typeof each == 'string') {
                        return FileSystem.makeAbsolutePath(each)
                    } else {
                        return JSON.stringify(each)
                    }
                }))
            } else {
                key = JSON.stringify(eachArg) + Deno.inspect(eachArg)
            }
            // do not duplicate work (because of files/streams)
            if (alreadyComputed.has(key)) {
                return alreadyComputed.get(key)
            } else {
                const output = convertReturnStreamArg(eachArg)
                alreadyComputed.set(key, output)
                return output
            }
        })
        const stdoutWritables = await Promise.all(convertArgsToWritables(...(commandMetaData.stdout||[])))
        const stderrWritables = await Promise.all(convertArgsToWritables(...(commandMetaData.stderr||[])))
        
        
        
        // 
        // 
        // start the process
        // 
        // 
        let process = {}
        try {
            process = Deno.run(runArg)
        } catch (error) {
            const rejection = new Promise((resolve, reject)=>reject(`\n${error}\nThis was from a run() call, which was converted to Deno.run(${JSON.stringify(runArg,0,4)})`))
            return [ rejection, rejection, rejection ]
        }
        if (commandMetaData.timeout.gentlyBy) {
            // create a outcome check
            let outcome = false
            process.status().then(()=>outcome=true)
            // schedule a suggested stop time
            setTimeout(async () => {
                if (!outcome) {
                    // ask it to please stop
                    process.kill("SIGINT")
                    // and schedule it's death
                    setTimeout(()=>{
                        if (!outcome) {
                            process.kill("SIGKILL")
                        }
                    }, commandMetaData.timeout.waitBeforeUsingForce)
                }
            }, commandMetaData.timeout.gentlyBy)
        }

        // 
        // handle stdout/stderr
        // 
        let hasReturnString = false
        let stdoutAndStderrDoneWritingPromise = { then(func) { func() } } // dummy (e.g. immediately-done promise)
        const returnStringChunks = []
        if (runArg.stdout == 'piped' || runArg.stderr == 'piped') {
            stdoutAndStderrDoneWritingPromise = deferredPromise()
            let stdoutIsDone = false
            let stderrIsDone = false
            const writableToWriter = new Map()
            for (const eachWritable of stdoutWritables.concat(stderrWritables)) {
                if (!writableToWriter.has(eachWritable)) {
                    if (eachWritable == returnAsString) {
                        hasReturnString = true
                        const decoder = new TextDecoder()
                        writableToWriter.set(eachWritable, {
                            write(value) {
                                const stringValue = decoder.decode(value)
                                returnStringChunks.push(stringValue)
                            }
                        })
                    } else {
                        if (eachWritable!=null) {
                            const writer = eachWritable.getWriter()
                            writableToWriter.set(eachWritable, writer)
                        }
                    }
                }
            }
            const stdoutWriters = stdoutWritables.map(each=>writableToWriter.get(each))
            const stderrWriters = stderrWritables.map(each=>writableToWriter.get(each))

            // 
            // NOTE: this process is kind of complicated because of checking
            //       for stderr/stdout to the same source 
            //       and for outputing them to mulitple sources
            //
            if (runArg.stdout != 'piped') {
                stdoutIsDone = true
            } else {
                const reader = readableStreamFromReader(process.stdout).getReader()
                setTimeout(async ()=>{
                    while (1) {
                        const {value, done} = await reader.read()
                        if (done) {
                            stdoutIsDone = true
                            if (stderrIsDone) {
                                stdoutAndStderrDoneWritingPromise.resolve()
                            }
                            break
                        }
                        for (const each of stdoutWriters) {
                            each.write(value)
                        }
                    }
                })
            }
            
            if (runArg.stderr != 'piped') {
                stderrIsDone = true
            } else {
                const reader = readableStreamFromReader(process.stderr).getReader()
                setTimeout(async ()=>{
                    while (1) {
                        const {value, done} = await reader.read()
                        if (done) {
                            stderrIsDone = true
                            if (stdoutIsDone) {
                                stdoutAndStderrDoneWritingPromise.resolve()
                            }
                            break
                        }
                        for (const each of stderrWriters) {
                            each.write(value)
                        }
                    }
                })
            }
        }

        // 
        // send stdin
        // 
        if (runArg.stdin == 'piped') {
            if (stdinWriter instanceof Uint8Array) {
                // without the stdin.close() part the process will wait forever
                process.stdin.write(stdinWriter).then(()=>process.stdin.close())
            } else if (stdinWriter instanceof ReadableStream) {
                // actually pipe data
                writableStreamFromWriter(process.stdin)
            }
        }

        // 
        // update the syncStatus when process done
        // 
        let statusPromise = process.status()
        statusPromise.then(({code, success})=>{
            syncStatus.done = true
            syncStatus.exitCode = code
            syncStatus.success = success
        })
        
        // await string
        let processFinishedValue
        if (hasReturnString) {
            processFinishedValue = statusPromise.then(()=>stdoutAndStderrDoneWritingPromise.then(()=>returnStringChunks.join("")))
        // await object
        } else {
            processFinishedValue = statusPromise.then(({ success, code })=>{
                return {
                    isDone:     true,
                    status:     syncStatus,
                    sendSignal: ()=>0,
                    success:    success,
                    exitCode:   code,
                    pid:        process.pid,
                    rid:        process.rid,
                    kill:       ()=>0,
                    close:      process.close,
                    stdin:      runArg.stdin=='null' ? null : (process.stdin || Deno.stdin),
                    stdout:     process.stdout || Deno.stdout,
                    stderr:     process.stderr || Deno.stderr,
                }
            })
        }

        const returnValueOrError = new Promise(async (resolve, reject)=>{
            if (commandMetaData.throwIfFails) {
                const status = await statusPromise
                if (!status.success) {
                    reject(await processFinishedValue)
                    return
                }
            }
            resolve(processFinishedValue)
        })
        return [ process, returnValueOrError, statusPromise, ]
    }
    // 
    // this is done to prevent the ugly (await (await run()).success()) syntax
    // 
    const asyncPartPromise = asyncPart()
    const processPromise     = asyncPartPromise.then(([process, processFinishedValue, statusPromise]) => process).catch((err)=>err)
    const statusPromise      = asyncPartPromise.then(([process, processFinishedValue, statusPromise]) => statusPromise).catch((err)=>err)
    const returnValuePromise = asyncPartPromise.then(([process, processFinishedValue, statusPromise]) => processFinishedValue)
    Object.defineProperties(returnValuePromise, {
        status:     { get(){ return syncStatus      } },
        isDone:     { get(){ return syncStatus.done } },
        sendSignal: { get(){ return (         ...args)=>processPromise.then((process)=>process.kill(...args) ).catch(error=>error) } },
        kill:       { get(){ return (signal="SIGKILL")=>processPromise.then((process)=>process.kill(signal)  ) } },
        close:      { get(){ return (         ...args)=>processPromise.then((process)=>process.close(...args)) } },
        success:    { get(){ return statusPromise.then(({success})=>success) } },
        exitCode:   { get(){ return statusPromise.then(({code})=>code)       } },
        outcome:    { get(){ return statusPromise                            } },
        rid:        { get(){ return processPromise.then(({rid    })=>rid                                         ) } },
        pid:        { get(){ return processPromise.then(({pid    })=>pid                                         ) } },
        stdout:     { get(){ return processPromise.then(({stdout })=>stdout||Deno.stdout                         ) } },
        stderr:     { get(){ return processPromise.then(({stderr })=>stderr||Deno.stderr                         ) } },
        stdin:      { 
            get(){
                const realStdinPromise = processPromise.then(({stdin})=>stdin||Deno.stdin)
                return {
                    send(rawDataOrString) {
                        if (typeof rawDataOrString == 'string') {
                            return {...realStdinPromise.then(realStdin=>(realStdin.write(new TextEncoder().encode(rawDataOrString)))), ...this}
                        // assume its raw data
                        } else {
                            return {...realStdinPromise.then(realStdin=>(realStdin.write(rawDataOrString))), ...this}
                        }
                    },
                    close(...args) {
                        return realStdinPromise.then((realStdin)=>(realStdin.close(...args),this))
                    }
                }
            }
        },
    })
    return returnValuePromise
}

// namespace everything
run.Timeout = Timeout
run.Env = Env
run.Cwd = Cwd
run.Stdin = Stdin
run.Stdout = Stdout
run.Stderr = Stderr
run.Out = Out
run.Overwrite = Overwrite
run.AppendTo = AppendTo
run.zipInto = zipInto
run.mergeInto = mergeInto
run.returnAsString = returnAsString