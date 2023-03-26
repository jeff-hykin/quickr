import { isReadable, isWritable } from "./stream_tools.js"
import { FileSystem } from "./file_system.js"

// 
// 
// Argument handling
// 
// 
    const Cwd = (...args)=>new CwdClass(...args)
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

    const Env = (...args)=>new EnvClass(...args)
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
    const Stdin = (...args)=>new StdinClass(...args)
    class StdinClass {
        static name = "Stdin"
        constructor(value) {
            if (
                typeof value == 'string' ||
                value === null ||
                isReadable(value) ||
                eachOutValue instanceof Deno.File
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
                value == Uint8Array || // not instanceof Uint8Array
                value == String || // not typeof value == 'string' but actually value == String
                value === null ||
                value instanceof FileStream ||
                value instanceof Deno.File ||
                isWritable(value)
            )
        ) {
            throw Error(`\n\nI found ${streamName}(${value}) as an argument. However, the value should be a writable stream, a Deno.File, null, or should === String (e.g. ${streamName}(String) not ${streamName}("a string")) or Uint8Array`)
        }
    }

    const Stdout = (...args)=>new StdoutClass(...args)
    class StdoutClass {
        static name = "Stdout"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    const Stderr = (...args)=>new StderrClass(...args)
    class StderrClass {
        static name = "Stderr"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    const Out = (...args)=>new OutClass(...args)
    class OutClass {
        static name = "Out"
        constructor(value) {
            validateOutput(this.name, validateOutput)
            this.value = value
        }
    }

    // this will purely be used for going into the Stdout, Stderr, or Out argument
    const FileStream = (...args)=>new FileStreamClass(...args)
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
        }
    }
    
    // this will purely be used for Stdin
    const InteractiveStream = (...args)=>new InteractiveStreamClass(...args)
    class InteractiveStreamClass {
        constructor() {
            this.buffer = []
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
            this.buffer.push(uint8Input)
        }
        read() {
            // FIXME: finish making this class a valid readable stream
        }
    }

    // this will purely be used for going into the Stdout, Stderr, or Out argument
    const FileStream = (...args)=>new FileStreamClass(...args)
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

    const run = (...args)=>{
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
    class ProcessSetup {
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

        get _builtinStreamOptionAssignment() {
            if (this.pipeCallback instanceof Function) {
                return null
            }
            const { stdinSource, stdoutTargets, stderrTargets } = this.args
            const thereAreMultipleStdouts = stdoutTargets.length > 1
            const thereAreMultipleStderrs = stderrTargets.length > 1
            if (thereAreMultipleStdouts || thereAreMultipleStderrs) {
                return null
            }

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
            }
            // stdout
            if (stdoutTargets[0] === Deno.stdout) {
                assignment.stdout = 'inherit'
            } else if (stdoutTargets[0] === null) {
                assignment.stdout = 'null'
            } else if (stdoutTargets[0] === String) {
                assignment.stdout = 'piped'
            }
            // stderr
            if (stderrTargets[0] === Deno.stderr) {
                assignment.stderr = 'inherit'
            } else if (stderrTargets[0] === null) {
                assignment.stderr = 'null'
            } else if (stderrTargets[0] === String) {
                assignment.stderr = 'piped'
            }

            if (assignment.stdin === null || assignment.stdout === null || assignment.stderr === null) {
                return false
            }
            
            return assignment
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
            
            const assignment = this._builtinStreamOptionAssignment
            // 
            // Very simple cases (edgecase)
            // 
            if (assignment) {
                const command = new Deno.Command(normalArgs[0], {
                    env,
                    cwd,
                    args: normalArgs.slice(1,),
                    ...assignment, // stdin, stdout, stderr
                })
                // FIXME: consider synchonous execution 
                this.process = new Process({
                    setupArgs: this.args,
                    childProcess: command.spawn(),
                    stdinStream: null,
                    stdoutStream: null,
                    stderrStream: null,
                })
            
            // 
            // suhcurity we've got a complicated order
            // 
            } else {
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
                    if (stdoutTargets[0] === Deno.stdout) {
                        assignment.stdout = 'inherit'
                    } else if (stdoutTargets[0] === null) {
                        assignment.stdout = 'null'
                    } else {
                        assignment.stdout = 'piped'
                    }
                    
                    // stderr
                    if (stderrTargets[0] === Deno.stderr) {
                        assignment.stderr = 'inherit'
                    } else if (stderrTargets[0] === null) {
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
                        stdinStream = directStdinWriter
                        if (typeof stdinSource == 'string') {
                            stdinStream = null // not accessable on Process object
                            // without the stdin.close() part the process will wait forever
                            directStdinWriter.write(new TextEncoder().encode(stdinSource)).then(()=>{
                                directStdinWriter.close()
                            })
                        } else if (stdinSource instanceof Uint8Array) {
                            stdinStream = null // not accessable on Process object
                            // without the stdin.close() part the process will wait forever
                            directStdinWriter.write(stdinSource).then(()=>directStdinWriter.close())
                        } else if (stdinSource instanceof Deno.File) {
                            // FIXME: add a close listener
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
                    
                    const listenToStdoutString = stdoutTargets.some(each=>each===String)
                    const listenToStderrString = stderrTargets.some(each=>each===String)
                    const stringOuts = {
                        out: null,
                        stdout: null,
                        stderr: null,
                    }
                    // if both
                    if (listenToStdoutString && listenToStderrString) {
                        stringOuts.out = ""
                        stringOuts.stdout = ""
                        stringOuts.stderr = ""
                        const stdoutDecoder = new TextDecoder()
                        stdoutListeners.push({
                            onWrite(chunk) {
                                try {
                                    const textString = stdoutDecoder.decode(chunk)
                                    stringOuts.out    += textString
                                    stringOuts.stdout += textString
                                } catch (error) {
                                    
                                }
                            },
                            onClose() {},
                        })
                        const stderrDecoder = new TextDecoder()
                        stderrListeners.push({
                            onWrite(chunk) {
                                try {
                                    const textString = stderrDecoder.decode(chunk)
                                    stringOuts.out    += textString
                                    stringOuts.stderr += textString
                                } catch (error) {
                                    
                                }
                            },
                            onClose() {},
                        })
                    // if only stdout
                    } else if (listenToStdoutString) {
                        stringOuts.stdout = ""
                        const stdoutDecoder = new TextDecoder()
                        stdoutListeners.push({
                            onWrite(chunk) {
                                try {
                                    const textString = stdoutDecoder.decode(chunk)
                                    stringOuts.stdout += textString
                                } catch (error) {
                                    
                                }
                            },
                            onClose() {},
                        })
                    // if only stderr
                    } else if (listenToStderrString) {
                        stringOuts.stderr = ""
                        const stderrDecoder = new TextDecoder()
                        stderrListeners.push({
                            onWrite(chunk) {
                                try {
                                    const textString = stderrDecoder.decode(chunk)
                                    stringOuts.stderr += textString
                                } catch (error) {
                                    
                                }
                            },
                            onClose() {},
                        })
                    }
                    
                    // 
                    // handle Uint8Array output
                    // 
                        // FIXME
                    
                    // 
                    // handle multiple write stream outputs
                    // 
                    for (const [targets, listeners] of [[stdoutTargets, stdoutListeners], [stderrTargets, stderrListeners]]) {
                        // String writers
                        if (targets.some(each=>each===String)) {
                            listeners.push({
                                onWrite(chunk) {
                                    try {
                                        stringOuts.
                                        new TextDecoder().decode(chunk)
                                    } catch (error) {
                                        
                                    }
                                }
                            })
                        }
                    }

                    // FIXME:
                        // record necessary string vars
                        // write to files
                        // write to 

                    let stdoutStream = null
                    if (assignment.stdout == 'piped') {
                        const directStdoutReader = childProcess.stdout.getReader()
                        const closedPromise = directStdoutReader.closed().then(()=>didClose)
                        ;((async ()=>{
                            while (1) {
                                const result = await Promise.any([ reader.read(), closedPromise ])
                                if (result === didClose) {
                                    for (const {onClose, onWrite} of stdoutListeners) {
                                        try {
                                            onClose()
                                        } catch (error) {
                                            // should only be triggered if something from this library is broken
                                            console.error(error)
                                        }
                                    }
                                } else {
                                    for (const {onClose, onWrite} of stdoutListeners) {
                                        try {
                                            onWrite(result)
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
                // Create the stderr stream
                // 
                    


                // 
                // finalize the process object
                // 
                this.process = new Process({
                    setupArgs: this.args,
                    childProcess,
                    stdinStream,
                    stdoutStream,
                    stderrStream,
                    // _premadeResult
                })
            }

            return this.process
        }
    }

    // Wrapper around deno child process
    class Process {
        // .pid
        // .done
        // .result
        // .signal
        // .kill
        // .forceKill
        // .stdinStream  // can be used for writing
        // .stdoutStream // can be used for reading
        // .stderrStream // can be used for reading
        constructor({setupArgs, childProcess, stdinStream, stdoutStream, stderrStream, _premadeResult}) {
            this.setupArgs = setupArgs
            this.childProcess = childProcess
            this.pid = childProcess.pid
            this.stdinStream = stdinStream
            this.stdoutStream = stdoutStream
            this.stderrStream = stderrStream
            if (_premadeResult) {
                this.result = result
            } else {
                this.result = this.childProcess.output().then(({stdout,stderr})=>{
                    // FIXME: handle the result here
                })
            }
            this._premadeResult = _premadeResult
        }
        signal(value) {
            return this.childProcess.kill(value)
        }
        kill(value) {
            return this.childProcess.kill("SIGINT")
        }
        forceKill(value) {
            return this.childProcess.kill("SIGKILL")
        }
    }

    class Result {
        constructor({exitCode, out, stdout, stderr, success,}) {
            this.exitCode = exitCode
            this.out      = out
            this.stdout   = stdout
            this.stderr   = stderr
            this.success  = success
        }
    }

    // const process = await run('echo', "blah").pipe(
    //     (stdout, stderr)=>run("echo", Stdin(stdout)).and(
    //         run("echo", "that last thing worked")
    //     )
    // )
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