import { writerFromStreamWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { resolve } from "https://deno.land/std@0.128.0/path/win32.ts"
import { deferredPromise, recursivePromiseAll } from "https://deno.land/x/good@1.4.4.1/async.js"
import { toRepresentation, indent } from "https://deno.land/x/good@1.4.4.1/string.js"


// TODO:
    // handle processing of stdout&stderr
    // handle output
    // create run() function that standardizes arguments
    // handle the interactive case


const isReadable = (obj) => obj instanceof Object && obj.read instanceof Function
const isWritable = (obj) => obj instanceof Object && obj.write instanceof Function
const concatUint8Arrays = (arrays) => new Uint8Array( // simplified from: https://stackoverflow.com/questions/49129643/how-do-i-merge-an-array-of-uint8arrays
        arrays.reduce((acc, curr) => (acc.push(...curr),acc), [])
    )

const cancelled = Symbol("CancelledPromise")
function cancelableAsyncAction(timeout, action) {
    const promise = deferredPromise()
    let cancelled = false
    const id = setTimeout(async ()=>{
        try {
            if (!cancelled) { // check is a bit redunant but whatever
                promise.resolve(await action)
            }
        } catch (error) {
            promise.reject(error)
        }
    }, timeout)
    promise.cancel = ()=>{
        cancelled = true
        clearTimeout(id)
        // resolve instead of reject to prevent uncaught rejections crashing everthing
        promise.resolve(cancelled) 
    }
    return promise
}

const encoder = new TextDecoder()
const toBytes = (stringOrBytes)=>{
    if (typeof stringOrBytes == 'string') {
        return encoder.encode(stringOrBytes)
    } else if (stringOrBytes instanceof Uint8Array) {
        return stringOrBytes
    } else {
        throw Error(`Tried to convert this to Uint8Array but couldn't, ${toRepresentation(stringOrBytes)}`)
    }
}

class DeferedPromise extends Promise {
    constructor(...args) {
        let methods
        let state = "pending"
        super((resolve, reject)=>{
            methods = {
                async resolve(value) {
                    await value
                    state = "fulfilled"
                    resolve(value)
                },
                reject(reason) {
                    state = "rejected"
                    reject(reason)
                },
            }
        })
        Object.defineProperty(this, "state", {
            get: () => state,
        })
        Object.assign(this, methods)
    }
}

export class RunAggregator {
    // the job of this class is to figure out what output the user wants
    constructor(args, options) {
        this.options = {}
        this._hasExecuted = false
        this._promiseAlls = Promise.resolve()
        this._throwHelperFunc = (error)=>{
            if (!this._executePromise.hasThrown) {
                this._executePromise.reject(error)
            }
            this._executePromise.hasThrown = true
        }
        Object.assign(this.options, {
            interactive:false,
            cwd:null,
            freshEnv: false,
            env: {},
            killAfter:null,
            forceKillAfter: null,
            forceKillIfNotDeadAfter: null,
            windowsRawArguments: false,
            stdin:[],
            stdout:[],
            stderr:[],
            out:[],
            runAfterSuccess:[],
            runAfterFail:[],
            autostart: true,
            ...options,
        })
        this.args = args
        if (this.autostart) {
            this._executePromise = cancelableAsyncAction(0, ()=>this.execute())
        } else {
            this._executePromise = { cancel() {}, reject() {} }
        }
        this._executePromise.throw = this._throwHelperFunc
        this.commandOutput = new DeferedPromise()
    }
    // 
    // internal
    // 
        // delay auto-execution one time
        waitFor(promise) {
            // the catch is necessary to make sure that the error only gets thrown one time on whatever the latest this._executePromise is
            // (instead of getting thrown on a promise that we no longer even have a reference to)
            this._promiseAlls = Promise.all([this._promiseAlls, promise]).catch(this._throwHelperFunc)
            // must cancel in addition to replacing with the new
            this._executePromise.cancel()
            this._executePromise = cancelableAsyncAction(
                0,
                ()=>this._promiseAlls.then(
                    (result)=>(result==cancelled)?cancelled:this.execute()
                )
            )
            return this
        }
        execute() {
            // this is to make the waitFor() logic more simple
            if (this._hasExecuted) {
                return this._hasExecuted
            }


            if (this.interactive) {
                // FIXME
            } else {
                // 
                // 
                // pre new Deno.Command
                // 
                // 
                    const denoCommandArguments = {
                        args: this.args.slice(1,),
                    }

                    // 
                    // cwd
                    // 
                        if (this.options.cwd) {
                            denoCommandArguments.cwd = this.options.cwd
                        }
                    // 
                    // env
                    // 
                        if (this.options.freshEnv) {
                            denoCommandArguments.clearEnv = true
                            denoCommandArguments.env = this.options.extraEnv
                        }
                    // 
                    // windowsRawArguments
                    // 
                        denoCommandArguments.windowsRawArguments = this.options.windowsRawArguments
                    // 
                    // uid
                    // 
                        denoCommandArguments.uid = this.options.uid
                    // 
                    // gid
                    // 
                        denoCommandArguments.gid = this.options.gid
                    // 
                    // stdin: piped or not
                    // 
                        const shouldUseDenoStdin = this.options.stdin.every(each=>each == Deno.stdin)
                        if (!shouldUseDenoStdin) {
                            // TODO: this is a current limitation of because of the Deno API, update it once its able to be removed
                            if (this.options.stdin.some(each=>each == Deno.stdin)) {
                                throw Error(`Deno.stdin was listed as one of multiple stdin sources. Sadly this isn't possible at the moment (July 2023) because of limitations in the Deno API. If you want to use Deno.stdin then make sure its the only stdin source.`)
                            }
                            if (this.options.stdin.every(each=>each == null)) {
                                denoCommandArguments.stdin = 'null'
                            } else {
                                denoCommandArguments.stdin = 'piped'
                            }
                        }
                    
                    // nulls are ignored for out
                    this.options.out = this.options.out.filter(each=>each != null)
                    
                    // 
                    // stdout piped or not
                    // 
                        // TODO: double check for edgecases on this statement, maybe add warnings
                        denoCommandArguments.stdout = this.options.out.length == 0 && this.options.stdout.length != 0 && this.options.stdout[0] == null ? null : 'piped'
                    // 
                    // stderr piped or not
                    // 
                        denoCommandArguments.stderr = this.options.out.length == 0 && this.options.stderr.length != 0 && this.options.stderr[0] == null ? null : 'piped'
                try {
                // 
                // 
                // new Deno.Command
                // 
                // 
                    const command = new Deno.Command(
                        this.args[0], 
                        denoCommandArguments,
                    )
                // 
                // 
                // after new Deno.Command
                // 
                // 
                    const child = command.spawn()
                    
                    // 
                    // feed stdin if needed
                    // 
                        if (denoCommandArguments.stdin == 'piped') {
                            let stdinSource
                            // this is a common case with piping
                            if (this.options.stdin.length == 1 && this.options.stdin[0] instanceof ReadableStream) {
                                stdinSource = this.options.stdin[0]
                            // if all sync data
                            } else if (this.options.stdin.every(each=>typeof each == 'string' || each instanceof Uint8Array)) {
                                stdinSource = concatUint8Arrays(this.options.stdin.map(toBytes))
                            } else {
                                stdinSource = new ReadableStream({
                                    start(controller) {
                                        ;((async ()=>{
                                            
                                            for (const eachStdinStreamSource of this.options.stdin) {
                                                const sourceIsReadable = isReadable(eachStdinStreamSource)
                                                if (eachStdinStreamSource instanceof ReadableStream || sourceIsReadable) {
                                                    const reader = sourceIsReadable ? eachStdinStreamSource : eachStdinStreamSource.getReader()
                                                    try {
                                                        const { done, value } = await reader.read()
                                                        if (done) {
                                                            continue
                                                        }
                                                        controller.enqueue(toBytes(value))
                                                    } catch (error) {
                                                        this._throwHelperFunc(error)
                                                    }
                                                } else if (eachStdinStreamSource == null) {
                                                    continue
                                                } else if (typeof eachStdinStreamSource == 'string') {
                                                    controller.enqueue(encoder.encode(eachStdinStreamSource))
                                                    continue
                                                } else if (eachStdinStreamSource instanceof Uint8Array) {
                                                    controller.enqueue(eachStdinStreamSource)
                                                    continue
                                                }
                                            }
                                            
                                            controller.close()
                                        })());
                                    },
                                })
                            }
                            const stdinWriter = child.stdin
                            if (stdinSource instanceof Uint8Array) {
                                stdinWriter.write(stdinSource).catch(this._throwHelperFunc).then(()=>stdinWriter.close().catch(this._throwHelperFunc))
                            } else {
                                // asyncly dump everything needed into the writer
                                ;((async ()=>{
                                    while (true) {
                                        try {
                                            const { done, value } = await stdinSource.read()
                                            if (done) {
                                                await stdinWriter.close()
                                                break
                                            }
                                            await stdinWriter.write(toBytes(value))
                                        } catch (error) {
                                            this._throwHelperFunc(error)
                                        }
                                    }
                                })())
                            }
                        }
                    // 
                    // handle stdout & stderr if needed
                    // 
                        if (denoCommandArguments.stdout == 'piped' || denoCommandArguments.stderr == 'piped') {
                            
                            // FIXME
                        }
                    
                    // 
                    // formulate output
                    // 
                        // const processHandle = new ProcessHandle({
                        //     isRunning: true,
                        //     pid: child.pid,
                        //     stdout: new DeferedPromise(),
                        // })
                        // ;((async ()=>{
                        //     try {
                        //         await child.status
                        //         // FIXME: set  this.commandOutput
                        //     } catch (error) {
                                
                        //     }

                        // })())
                    return processHandle
                
                // 
                // saftey
                // 
                } catch (error) {
                    error.message = `There was a problem when trying to run the following command: ${JSON.stringify(this.args)}\nWhich was run with:\nnew Deno.Command(\n${JSON.stringify(this.args[0])},\n${indent({string:JSON.stringify(denoCommandArguments,0,4), by: "    "})})\n\nError thrown: ${error.message}`
                    this._throwHelperFunc(error)
                }
            }
        }
    // 
    // modifying
    // 
        freshEnv(env) {
            this.options.freshEnv = true
            this.options.env = {...env}
            return this
        }
        extraEnv(extraEnv) {
            Object.assign(this.options.env, extraEnv)
            return this
        }
        cwd(path) {
            this.options.cwd = path
            return this
        }
        windowsRawArguments(trueOrFalse) {
            this.options.windowsRawArguments = trueOrFalse
            return this
        }
        setUid(uid) {
            this.options.uid = uid
            return this
        }
        setGid(gid) {
            this.options.gid = gid
            return this
        }
        killAfter(miliseconds, options={ forceKillIfNotDeadAfter: null }) {
            const { forceKillIfNotDeadAfter } = {...options}
            this.options.killAfter = miliseconds
            this.options.forceKillIfNotDeadAfter = forceKillIfNotDeadAfter
            return this
        }
        forceKillAfter(miliseconds) {
            this.options.forceKillAfter = miliseconds
            return this
        }
        stdinFrom(source) {
            // FIXME: allow RunAggregator as an input value
            // FIXME: allow file as an input

            // validation
            if (!(source == null || source == Deno.stdin || typeof source == 'string' || source instanceof Uint8Array || isReadable(source) || source instanceof ReadableStream)) {
                throw Error(`Tried to add an stdin source that wasn't a string, Uint8Array, or ReadableStream. Value was: ${toRepresentation(source)}`)
            }

            this.options.stdin.push(source)
            return this
        }
    // 
    // stacking args
    // 
        pipe(streamName, output) {
            // output can be equal to String  (not typeof string, but the string class)
            // output can be equal to Uint8Array  (not instanceof Uint8Array, but the Uint8Array class)
            // output instanceof Deno.openSync("")
            this.options[streamName].push(output)
            if (output instanceof RunAggregator) {
                output._executePromise.cancel()
            }
            return this
        }
        and(funcOrCommand) {
            if (funcOrCommand instanceof RunAggregator) {
                // this command will manually execute it now
                funcOrCommand._executePromise.cancel()
                funcOrCommand = ()=>funcOrCommand.execute()
            }
            this.options.runAfterSuccess.push(funcOrCommand)
            return this
        }
        or(funcOrCommand) {
            if (funcOrCommand instanceof RunAggregator) {
                // this command will manually execute it now
                funcOrCommand._executePromise.cancel()
                funcOrCommand = ()=>funcOrCommand.execute()
            }
            this.options.runAfterFail.push(funcOrCommand)
            return this
        }
    // 
    // special args
    // 
        // interactive 
        get interactive() {
            this.options.interactive = true
            return this._executePromise
        }
    
    // 
    // promise return args
    // 
        get stdoutBytes() {
            this.options.stdout.push(Uint8Array)
            // FIXME
        }
        get stdoutString() {
            // FIXME
            this.options.stdout.push(String)
            return new Promise((resolve, reject)=>{
            })
        }
}