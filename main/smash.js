import { Event, trigger, everyTime, once } from "https://deno.land/x/good@0.5.14/events.js"

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


// 
// clean/core logic
// 
async function simpleRun({ command, stdin, stdout, stderr, out, cwd, env, interactive }) {
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
function standardizeArguments({ command, stdin, stdout, stderr, out, cwd, env, interactive }) {
    // 
    // stdin
    // 
    if (stdin == notGiven) {
        stdin = {
            fromUser: true,
            overwrite: [],
            appendTo: [],
        }
    }

    // 
    // out
    // 
    // if its not a file object, ignore the overwrite vs appendTo


}



const methods = (thisTask, outputPromise) => ({
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
    // mutate the promise output, make all methods return the promise again (chaining)
    // 
    Object.assign(outputPromise, methods(thisTask, outputPromise))

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