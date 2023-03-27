import { deferred } from "https://deno.land/std@0.181.0/async/mod.ts"
import { writeAllSync } from "https://deno.land/std@0.181.0/streams/conversion.ts"
import { isReadable, isWritable, concatUint8Arrays } from "./stream_tools.js"
import { FileSystem } from "./file_system.js"

// 
// 
// Argument handling
// 
// 
    export const Cwd = (...args)=>new CwdClass(...args)
    class CwdClass {
        static name = "Cwd"
        constructor(value) {
            if (typeof value != 'string') {
                throw Error(`Found Cwd(${value}), however value is expected to be a string`)
            }
            const pathInfo = FileSystem.sync.info(value)
            if (!pathInfo.isFolder) {
                throw Error(`Found Cwd(${value}), however ${value} does not appear to be a valid folder`)
            }
            this.value = value
        }
    }

    export const Env = (...args)=>new EnvClass(...args)
    class EnvClass {
        static name = "Env"
        constructor(value) {
            if (!(value instanceof Object)) {
                throw Error(`Found Env(${value}), however value is expected to be an object with keys being ENV var names, and values being strings`)
            }
            this.value = value
        }
    }
    
    // stdin can be: readable stream, string, file
    export const Stdin = (...args)=>new StdinClass(...args)
    class StdinClass {
        static name = "Stdin"
        constructor(value) {
            if (
                value === null ||
                typeof value == 'string' ||
                value instanceof Uint8Array ||
                isReadable(value)
            ) {
                this.value = value
            } else {
                throw Error(`\n\nI found Stdin(${value}) as an argument. This is a problem as the value needs to be a readable stream, string, a file object, or null.`)
            }
        }
    }

    const validateOutput = (streamName,value)=> {
        // Common string mistake
        if (typeof value == 'string') {
            const possiblePath = JSON.stringify(value)
            throw Error(`\n\nI found ${streamName}(${possiblePath}). If you were trying to overwrite the file path ${value} with ${streamName} then do:\n    ${streamName}(FileStream({path: ${possiblePath}, overwrite: true}))\nIf you were looking to append to ${possiblePath} do:\n    ${streamName}(FileStream({path: ${possiblePath}, append: true}))`)
        // Unknown mistake
        } else if (
            !(
                value === null ||
                value instanceof FileStreamClass ||
                value instanceof Deno.File ||
                isWritable(value)
            )
        ) {
            throw Error(`\n\nI found ${streamName}(${value}) as an argument. However, the value should be a writable stream, a Deno.File, null`)
        }
    }

    export const Stdout = (...args)=>new StdoutClass(...args)
    class StdoutClass {
        static name = "Stdout"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    export const Stderr = (...args)=>new StderrClass(...args)
    class StderrClass {
        static name = "Stderr"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    export const Out = (...args)=>new OutClass(...args)
    class OutClass {
        static name = "Out"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    // this will be used for Stdin and Stdout/Stderr
    export const InteractiveStream = (...args)=>new InteractiveStreamClass(...args)
    class InteractiveStreamClass {
        constructor({ onWrite, onClose }) {
            this.onWrite = onWrite
            this.onClose = onClose
            this.buffer = []
            this.streamConnection = null
        }
        write(input) {
            let uint8Input = input
            if (typeof input == 'string') {
                uint8Input = new TextEncoder().encode(input)
            } else if (input instanceof Uint8Array) {
                uint8Input = input
            } else {
                throw Error(`When performing a .write(input) with an InteractiveStream object, the input needs to be a string or Uint8Array. However instead I received an input of ${input}`)
            }
            if (this.onWrite) {
                this.onWrite(input)
            }

            if (this.streamConnection) {
                this.streamConnection.write(uint8Input)
            } else {
                this.buffer.push(uint8Input)
            }
        }
        close() {
            if (this.streamConnection) {
                this.streamConnection.close()
            }
            if (this.onClose instanceof Function) {
                this.onClose()
            }
        }
    }

    // this will purely be used for going into the Stdout, Stderr, or Out argument
    export const FileStream = (...args)=>new FileStreamClass(...args)
    class FileStreamClass {
        constructor({path, append=false, overwrite=false, force=true}) {
            if (append!=overwrite) {
                throw Error(`\n\nWhen creating a FileStream(), it expects either\n    FileStream({path:"blah", append: true})\n    or FileStream({path:"blah", overwrite: true})\ninstead this call received: {append:${append},overwrite:${overwrite}}`)
            }
            if (typeof path != 'string') {
                throw Error(`\n\nWhen creating a FileStream(), it expects path to be a string.\nInstead we got FileStream({ path: ${path} })`)
            }
            this.path = path
            this.append = append
            this.overwrite = overwrite
            this.force = force
            this.isOpened = false
            this.file = null
            
            this.encoder = new TextEncoder()
            this.closed = deferred()
            this.ready = new Promise((resolve, reject)=>resolve(true))
            this.desiredSize = null
        }
        close() {
            if (this.isOpened) {
                this.file.close()
                this.file = null
            }
            this.isOpened = false
            this.closed.resolve()
        }
        abort() {
            this.close()
        }
        releaseLock() {

        }
        async write(data) {
            if (typeof data == 'string') {
                // convert to Uint8Array
                data = this.encoder.encode(data)
            }
            if (!this.isOpened) {
                if (this.force) {
                    await FileSystem.ensureIsFile(this.path)
                }
                this.file = await Deno.open({
                    read: true,
                    write: true,
                    truncate: !this.append,
                    create: true,
                })
            }
            this.file.write(data)
        }
    }

    // 
    // 
    // argument handler
    // 
    // 
    function validateAndStandardizeArguments(...args) {
        const cwdArgs             = []
        const envArgs             = []
        const stdinArgs           = []
        const stdoutArgs          = []
        const stderrArgs          = []
        const normalArgs          = []
        for (const each of args) {
            if (each instanceof CwdClass)        { cwdArgs.push(each)             }
            else if (each instanceof EnvClass)        { envArgs.push(each)             }
            else if (each instanceof StdinClass)      { stdinArgs.push(each)           }
            else if (each instanceof StdoutClass)     { stdoutArgs.push(each)          }
            else if (each instanceof StderrClass)     { stderrArgs.push(each)          }
            else if (each instanceof OutClass)        {
                stdoutArgs.push(each)
                stderrArgs.push(each)
            } else {
                normalArgs.push(each)
            }
        }
        
        // 
        // single-entry only arguments
        // 
        for (const eachArgList of [ cwdArgs, envArgs, stdinArgs  ]) {
            if (eachArgList.length > 1) {
                throw Error(`When creating a process I found ${eachArgList.length} instances of ${eachArgList[0].name}(), however only one is allowed per process`)
            }
        }

        // 
        // assign basics
        // 
        const cwd             = cwdArgs.length   > 0 ? cwdArgs[0].value   : Deno.cwd
        const env             = envArgs.length   > 0 ? envArgs[0].value   : ()=>Console.env
        const stdinSource     = stdinArgs.length > 0 ? stdinArgs[0].value : Deno.stdin
        const stdoutTargets   = stdoutArgs.length == 0 ? [ Deno.stdout ] : []
        const stderrTargets   = stderrArgs.length == 0 ? [ Deno.stderr ] : []

        // 
        // validate edgecase outputs
        // 
        for (const [ targets, args ] of [  [ stdoutTargets, stdoutArgs ], [ stderrTargets, stderrArgs ]  ]) {
            if (args.length == 0) {
                continue
            }
            // check for nullified argument
            const containsNull = args.some(each=>each.value === null)
            if (containsNull) {
                if (args.length > 1) {
                    throw Error(`\n\nWhen creating a process, I found ${streamName}(null), however I also found other ${streamName}() arguments.\nIf ${streamName} is going to be null, it cannot also be routed other places`)
                }
                targets.push(null)
            } else {
                for (const each of args) {
                    targets.push(each)
                }
            }
        }
        
        return {
            cwd,
            env,
            stdinSource,
            stdoutTargets,
            stderrTargets,
            normalArgs,
        }
    }

// 
// 
// main function
// 
// 
    // ProcessSetup (e.g. Command)
    // Process      (e.g. ChildProcess)
    // Result       (e.g. CommandResult)
    
    // FIXME: handle synchonous execution
    // FIXME: add wait options (Deno.ChildProcess.ref)
    // FIXME: uid, gid, windowsRawArguments inputs

    export const run = (...args)=>{
        const setup = new ProcessSetup(...args)
        const proimseOfProcess = new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    if (!setup.hasSpawned) {
                        resolve(setup.execute())
                    } else {
                        resolve(setup.process)
                    }
                } catch (error) {
                    reject(error)
                }
            }, 0)
        })
        Object.assign(proimseOfProcess, setup)
        return proimseOfProcess
    }
    const didClose = Symbol()
    export class ProcessSetup {
        constructor(...args) {
            this.args = {}
            Object.assign(this.args, validateAndStandardizeArguments(...args))
            // this.args.cwd
            // this.args.env
            // this.args.stdinSource
            // this.args.stdoutTargets
            // this.args.stderrTargets
            // this.args.normalArgs
            this.process = null
            this.hasSpawned = false
            this.pipeCallback = null
            this.andProcessSetup = null
            this.orProcessSetup = null
        }
        
        pipe(callback) {
            this.pipeCallback = callback
            return this
        }
        and(process) {
            this.andProcessSetup = process
            return this
        }
        or(process) {
            this.orProcessSetup = process
            return this
        }

        // always returns a process
        execute() {
            if (this.hasSpawned) {
                throw Error(`Cannot spawn a command twice. Command args are: ${this.args.normalArgs}`)
            }
            this.hasSpawned = true
            
            // FIXME: ensure that this.args.normalArgs[0] is an executable
            let { cwd, env, stdinSource, stdoutTargets, stderrTargets, normalArgs } = this.args
            if (cwd instanceof Function) {
                cwd = cwd()
            }
            if (env instanceof Function) {
                env = env()
            }
            
            // 
            // figure out stream assignment
            // 
                const assignment = {
                    stdin: null,
                    stdout: null,
                    stderr: null,
                }
                
                // stdin
                if (stdinSource === Deno.stdin) {
                    assignment.stdin = 'inherit'
                } else if (stdinSource === null) {
                    assignment.stdin = 'null'
                } else {
                    assignment.stdin = 'piped'
                }

                // stdout
                if (stdoutTargets[0] === null) {
                    assignment.stdout = 'null'
                } else {
                    assignment.stdout = 'piped'
                }
                
                // stderr
                if (stderrTargets[0] === null) {
                    assignment.stderr = 'null'
                } else {
                    assignment.stderr = 'piped'
                }
            // 
            // create the command
            // 
                const command = new Deno.Command(normalArgs[0], {
                    env,
                    cwd,
                    args: normalArgs.slice(1,),
                    ...assignment, // stdin, stdout, stderr
                })
                const childProcess = command.spawn()

            // 
            // Create the stdin stream variable
            // 
                let stdinStream = null
                if (assignment.stdin == 'piped') {
                    const directStdinWriter = childProcess.stdin.getWriter()
                    if (typeof stdinSource == 'string') {
                        // without the stdin.close() part the process will wait forever
                        directStdinWriter.write(new TextEncoder().encode(stdinSource)).then(()=>{
                            directStdinWriter.close()
                        })
                    } else if (stdinSource instanceof Uint8Array) {
                        // without the stdin.close() part the process will wait forever
                        directStdinWriter.write(stdinSource).then(()=>directStdinWriter.close())
                    } else if (stdinSource instanceof InteractiveStreamClass) {
                        const buffer = stdinSource.buffer
                        stdinSource.buffer.length = 0 // clear the contents
                        stdinSource.streamConnection = directStdinWriter
                        if (buffer.length > 0) {
                            directStdinWriter.write(concatUint8Arrays(buffer))
                        }
                        
                        // connect the stream
                        stdinStream = stdinSource
                    } else {
                        let reader
                        if (stdinSource instanceof ReadableStream) {
                            reader = stdinSource.getReader()
                        } else if (isReadable(stdinSource)) {
                            reader = stdinSource
                        } else {
                            throw Error(`Not sure how this happened, but stdin was piped and I don't know how to handle the stdinSource ${stdinSource}`)
                        }

                        const closedPromise = reader.closed().then(()=>didClose)
                        ;((async ()=>{
                            while (1) {
                                const result = await Promise.any([ reader.read(), closedPromise ])
                                if (result === didClose) {
                                    directStdinWriter.close()
                                } else {
                                    if (typeof result == 'string') {
                                        directStdinWriter.write(new TextEncoder().encode(result))
                                    } else {
                                        directStdinWriter.write(result)
                                    }
                                }
                            }
                        })())
                    }
                }
                
            // 
            // Create the out streams
            //
                const stdoutListeners = []
                const stderrListeners = []
                
                // 
                // outStream
                // 
                    const decoder = new TextDecoder()
                    const outStream = {
                        clearAccumulation() {
                            if (outStream.bytes.out instanceof Uint8Array   ) { outStream.bytes.out    = new Uint8Array() }
                            if (outStream.bytes.stdout instanceof Uint8Array) { outStream.bytes.stdout = new Uint8Array() }
                            if (outStream.bytes.stderr instanceof Uint8Array) { outStream.bytes.stderr = new Uint8Array() }
                        },
                        _stdoutNext: null,
                        _stderrNext: null,
                        _stdoutClose: null,
                        _stderrClose: null,
                        bytes: {
                            out: null,
                            stdout: null,
                            stderr: null,
                        },
                        string: {
                            get    out() { return outStream.bytes.out    === null ? null : decoder.decode(outStream.bytes.out) }
                            get stdout() { return outStream.bytes.stdout === null ? null : decoder.decode(outStream.bytes.stdout) }
                            get stderr() { return outStream.bytes.stderr === null ? null : decoder.decode(outStream.bytes.stderr) }
                            async *accumulate() {
                                const closedBothPromise = Promise.all([
                                    outStream._stdoutClose,
                                    outStream._stderrClose,
                                ]).then(()=>didClose)

                                while (1) {
                                    const signal = await Promise.any(
                                        outStream._stdoutNext,
                                        outStream._stderrNext, 
                                        closedBothPromise,
                                    )
                                    if (signal == didClose) {
                                        break
                                    }
                                    yield {
                                        out:    outStream.string.out,
                                        stdout: outStream.string.stdout,
                                        stderr: outStream.string.stderr,
                                    }
                                }
                            }
                        },
                    }
                    const listenToStdoutUint8Array = assignment.stdout != 'null'
                    const listenToStderrUint8Array = assignment.stderr != 'null'
                    // if both
                    if (listenToStdoutUint8Array && listenToStderrUint8Array) {
                        outStream.bytes.out = new Uint8Array()
                        outStream.bytes.stdout = new Uint8Array()
                        outStream.bytes.stderr = new Uint8Array()
                        outStream._stdoutNext  = deferred()
                        outStream._stdoutClose = deferred()
                        outStream._stderrNext  = deferred()
                        outStream._stderrClose = deferred()
                        stdoutListeners.push({
                            write(chunk) {
                                try {
                                    outStream.bytes.out    = concatUint8Arrays(outStream.bytes.out, chunk)
                                    outStream.bytes.stdout = concatUint8Arrays(outStream.bytes.stdout, chunk)
                                } catch (error) {
                                    
                                }
                                outStream._stdoutNext.resolve()
                                outStream._stdoutNext = deferred()
                            },
                            close() {
                                outStream._stdoutClose.resolve()
                            },
                        })
                        stderrListeners.push({
                            write(chunk) {
                                try {
                                    outStream.bytes.out    = concatUint8Arrays(outStream.bytes.out, chunk)
                                    outStream.bytes.stderr = concatUint8Arrays(outStream.bytes.stderr, chunk)
                                } catch (error) {
                                    
                                }
                                outStream._stderrNext.resolve()
                                outStream._stderrNext = deferred()
                            },
                            close() {
                                outStream._stderrClose.resolve()
                            },
                        })
                    // if only stdout
                    } else if (listenToStdoutUint8Array) {
                        outStream.bytes.stdout = new Uint8Array()
                        outStream._stdoutNext  = deferred()
                        outStream._stdoutClose = deferred()
                        stdoutListeners.push({
                            write(chunk) {
                                try {
                                    outStream.bytes.stdout = concatUint8Arrays(outStream.bytes.stdout, chunk)
                                } catch (error) {
                                    
                                }
                                outStream._stdoutNext.resolve()
                                outStream._stdoutNext = deferred()
                            },
                            close() {
                                outStream._stdoutClose.resolve()
                            },
                        })
                    // if only stderr
                    } else if (listenToStderrUint8Array) {
                        outStream.bytes.stderr = new Uint8Array()
                        outStream._stderrNext  = deferred()
                        outStream._stderrClose = deferred()
                        stderrListeners.push({
                            write(chunk) {
                                try {
                                    outStream.bytes.stderr = concatUint8Arrays(outStream.bytes.stderr, chunk)
                                } catch (error) {
                                    
                                }
                                outStream._stderrNext.resolve()
                                outStream._stderrNext = deferred()
                            },
                            close() {
                                outStream._stderrClose.resolve()
                            },
                        })
                    }

                // 
                // handle targets
                // 
                    for (const [targets, listeners] of [[stdoutTargets, stdoutListeners], [stderrTargets, stderrListeners]]) {
                        for (const eachTarget of targets.map(each=>each.value)) {
                            if (eachTarget === null) {
                                break
                            }

                            const listener = {
                                close() {}
                                write() {}
                            }

                            if (eachTarget instanceof FileStreamClass) {
                                listener.close = eachTarget.close
                                listener.write = eachTarget.write
                            } else if (eachTarget instanceof InteractiveStreamClass) {
                                listener.close = eachTarget.onClose || ()=>{}
                                listener.write = eachTarget.onWrite || ()=>{}
                            } else if (eachTarget === Deno.stdout) {
                                // don't close stdout, just write
                                listener.write = (chunk)=>writeAllSync(Deno.stdout, chunk)
                            } else if (eachTarget === Deno.stderr) {
                                // don't close stderr, just write
                                listener.write = (chunk)=>writeAllSync(Deno.stderr, chunk)
                            } else if (eachTarget instanceof Deno.File) {
                                // don't auto-close deno file objects (the whole point would be using an already-open file)
                                listener.write = eachTarget.write
                            } else {
                                let writer = eachTarget
                                if (eachTarget.getWriter instanceof Function) {
                                    writer = eachTarget.getWriter()
                                }
                                listener.write = writer.write
                                listener.close = writer.close
                            }
                        }
                    }

                //    
                // hook into stdout
                //    
                    if (assignment.stdout == 'piped') {
                        const directStdoutReader = childProcess.stdout.getReader()
                        const closedPromise = directStdoutReader.closed().then(()=>didClose)
                        ;((async ()=>{
                            while (1) {
                                const result = await Promise.any([ reader.read(), closedPromise ])
                                if (result === didClose) {
                                    for (const {close, write} of stdoutListeners) {
                                        try {
                                            close()
                                        } catch (error) {
                                            // should only be triggered if something from this library is broken
                                            console.error(error)
                                        }
                                    }
                                } else {
                                    for (const {close, write} of stdoutListeners) {
                                        try {
                                            write(result)
                                        } catch (error) {
                                            // should only be triggered if something from this library is broken
                                            console.error(error)
                                        }
                                    }
                                }
                            }
                        })())
                    }
                //    
                // hook into stderr
                //    
                    if (assignment.stderr == 'piped') {
                        const directStdoutReader = childProcess.stderr.getReader()
                        const closedPromise = directStdoutReader.closed().then(()=>didClose)
                        ;((async ()=>{
                            while (1) {
                                const result = await Promise.any([ reader.read(), closedPromise ])
                                if (result === didClose) {
                                    for (const {close, write} of stderrListeners) {
                                        try {
                                            close()
                                        } catch (error) {
                                            // should only be triggered if something from this library is broken
                                            console.error(error)
                                        }
                                    }
                                } else {
                                    for (const {close, write} of stderrListeners) {
                                        try {
                                            write(result)
                                        } catch (error) {
                                            // should only be triggered if something from this library is broken
                                            console.error(error)
                                        }
                                    }
                                }
                            }
                        })())
                    }
            
            // 
            // finalize the process object
            // 
            this.process = new Process({
                setupArgs: this.args,
                childProcess,
                stdinStream,
                outStream,
                // _premadeResult
            })

            return this.process
        }
    }

    // Wrapper around deno child process
    export class Process {
        // .pid
        // .done
        // .result
        // .signal
        // .kill
        // .forceKill
        // .stdinStream  // can be used for writing
        // .outStream    // can be used for reading
        constructor({setupArgs, childProcess, stdinStream, outStream, _premadeResult}) {
            this.setupArgs = setupArgs
            this.childProcess = childProcess
            this.pid = childProcess.pid
            this.stdinStream = stdinStream
            this.outStream = outStream
            if (_premadeResult) {
                this.result = result
            } else {
                this.result = this.childProcess.output().then(async ({stdout, stderr})=>{
                    const commandStatus = await this.childProcess.status()
                    return new Result({
                        commandStatus,
                        outStream,
                    })
                })
                this.stringResult = this.result.then((value)=>value.string)
                this.bytesResult  = this.result.then((value)=>value.bytes)
            }
        }
        signal(value) {
            return this.childProcess.kill(value)
        }
        kill(value) {
            // FIXME: make sure to interupt outStream.string.accumulate any time the process dies
            return this.childProcess.kill("SIGINT")
        }
        forceKill(value) {
            return this.childProcess.kill("SIGKILL")
        }
    }

    export class Result {
        constructor({ commandStatus, outStream, }) {
            this.exitCode = commandStatus.code
            this.success  = commandStatus.success
            this.signal   = commandStatus.signal
            
            this.string = {
                out: outStream.string.out,
                stdout: outStream.string.stdout,
                stderr: outStream.string.stderr,
                exitCode: this.exitCode,
                success: this.success,
                signal: this.signal,
            }
            this.bytes = {
                out: outStream.bytes.out,
                stdout: outStream.bytes.stdout,
                stderr: outStream.bytes.stderr,
                exitCode: this.exitCode,
                success: this.success,
                signal: this.signal,
            }
        }
    }
    
    // import { Cwd, Env, Stdin, Stdout, Stderr, Out, FileStream, InteractiveStream, run } from "runner.js"
    // const process = await run('echo', "blah").pipe((stdout, stderr)=>
    //     run("echo", Stdin(stdout)).and(
    //         run("echo", "that last thing worked")
    //     )
    // )
    // const { success, exitCode } = await process.result
    // const { success, exitCode, out, stdout, stderr } = await process.stringResult
    // const { success, exitCode, out, stdout, stderr } = await process.bytesResult
    
    // const process = await run`ssh pi@raspberry`.stdin(InteractiveStream()).out(InteractiveStream())
    // const process = await run('ssh', "pi@raspberry", Stdin(InteractiveStream()), Out(InteractiveStream()))
    // for await (const { out, stdout, stderr } in process.outStream.string.accumulate) {
    //     if (out.match(/please enter password\n/)) {
    //         process.outStream.clearAccumulation()
    //         process.stdinStream.write('howdy there\n')
    //     } else {
    //         process.stdinStream.close()
    //     }
    // }
    // const { success, exitCode } = await process.result

// var process = Deno.run({
//     "cmd": [
//         "nix",
//         "eval",
//         "-I", "nixpkgs=https://github.com/NixOS/nixpkgs/archive/aa0e8072a57e879073cee969a780e586dbe57997.tar.gz",
//         "--impure",
//         "--expr", "(builtins.attrNames (import <nixpkgs> {}))",
//     ],
//     "stdout": "piped"
// })
// console.debug(`process is:`,process)
// console.debug(`await process.status() is:`,await process.status())



// var command = new Deno.Command("nix", {
//     args: [
//         "eval",
//         "-I", "nixpkgs=https://github.com/NixOS/nixpkgs/archive/aa0e8072a57e879073cee969a780e586dbe57997.tar.gz",
//         "--impure",
//         "--expr", "(builtins.attrNames (import <nixpkgs> {}))",
//     ],
//     stdout: "piped",
// })