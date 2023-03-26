import { isReadable, isWritable } from "./stream_tools.js"
import { FileSystem } from "./file_system.js"

// 
// 
// Argument handling
// 
// 
    class PreviousProcess {
        static name = "PreviousProcess"
        constructor(value) {
            // TODO: validate that this is a process class once the process class is defined
            this.value = value
        }
    }
    
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
                isReadable(value) ||
                eachOutValue instanceof Deno.File
            ) {
                this.value = value
            } else {
                throw Error(`\n\nI found Stdin(${value}) as an argument. This is a problem as the value needs to be a readable stream, string, or a file object.`)
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
                value == String || // not typeof value == 'string' but actually value == String
                value === null ||
                value instanceof FileStream ||
                value instanceof Deno.File ||
                isWritable(value)
            )
        ) {
            throw Error(`\n\nI found ${streamName}(${value}) as an argument. However, the value should be a writable stream, a Deno.File, null, or should === String (e.g. ${streamName}(String) not ${streamName}("a string"))`)
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
        const previousProcessArgs = []
        const cwdArgs             = []
        const envArgs             = []
        const stdinArgs           = []
        const stdoutArgs          = []
        const stderrArgs          = []
        const normalArgs          = []
        for (const each of args) {
            if (each instanceof PreviousProcess) { previousProcessArgs.push(each) }
            else if (each instanceof CwdClass)        { cwdArgs.push(each)             }
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
        for (const eachArgList of [ previousProcessArgs, cwdArgs, envArgs, stdinArgs  ]) {
            if (eachArgList.length > 1) {
                throw Error(`When creating a process I found ${eachArgList.length} instances of ${eachArgList[0].name}(), however only one is allowed per process`)
            }
        }

        // 
        // assign basics
        // 
        const previousProcess = previousProcessArgs[0] // will be undefined if not given as an argument
        const cwd             = cwdArgs.length   > 0 ? cwdArgs[0].value   : Deno.cwd()
        const env             = envArgs.length   > 0 ? envArgs[0].value   : Console.env
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

        // FIXME: analyze previousProcess and figure out how it will work with stdin

        return {
            previousProcess,
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
    const run = (...args)=>new Process(...args)
    class Process {
        constructor(...args) {
            Object.assign(this, validateAndStandardizeArguments(...args))
            // this.previousProcess
            // this.cwd
            // this.env
            // this.stdinSource
            // this.stdoutTargets
            // this.stderrTargets
            // this.normalArgs
        }
    }

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