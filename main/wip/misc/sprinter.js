import { zip } from "https://deno.land/x/good@0.7.8/array.js"

// 
// examples
// 
    // await run`echo hi`.stdoutString
    
    // var process = run.interactive("bash", {
    //     async onOutput(block) {
    //         const outputSinceLastSend = process.out.sinceSend
    //         if (outputSinceLastSend.match(/started/)) {
    //             process.sendLine("echo ending")
    //         } else if (outputSinceLastSend.match(/ending/)) {
    //             process.sendLine("exit")
    //         }
    //     }
    // })
    // process.stdin.sendLine("echo started")

    // process = execute(command`echo hi`.pipeTo(command`cat`))
    
    // execute(command`cat .zshrc`.stdoutOverwrite("./my_file.txt"))
    
    // await execute(command`cat .zshrc`.with({ cwd: OperatingSystem.home }).pipeStdoutTo(
    //     command`grep ${"thing"}`
    // ).success && run`echo great your .zshrc has a thing`

async function simpleRun({ command, cwd, env, silent, interactive, stdin, stdoutOverwrite, stdoutAppendTo, stderrOverwrite, stderrAppendTo, outOverwrite, outAppendTo, stopAfter, killAfter, onStdoutUpdate, onStderrUpdate, onUpdate }) {
    // if interactive is null
        // regular Deno.stdin will be used
    // if interactive is true
        // Deno.stdin will be refused (because it currently causes problems by not allowing the program to exit)
        // process.stdin will exist
        // process.stdin.sendLine()
        // static stdin sources will be piped in first
        // dynamic stdin sources will be zip-piped
    // if interactive is false
        // process.stdin will be null
    
    // stdout/stderr will always be collected as a string
    // stdout will not include Deno.stdout if silent is true
    // stderr will not include Deno.stderr if silent is true
    if (stopAfter) { setTimeout(()=>process.kill("SIGINT"), stopAfter) }
    if (killAfter) { setTimeout(()=>process.kill("SIGKILL"), killAfter) }
    
    return {
        rid,
        pid,
        result, // promise, should include awaited values of all all other promises (success, exitCode, etc)
        stopped: false,
        stdin,
        stdout, // flow
        stderr, // flow
        out, // flow
        sendLine(string) {},
        sendString(string) {},
        signal(string) {},
        stop() {},
        forceKill() {},
        success, // promise
        exitCode, // promise
        outString, // promise
        stdoutString, // promise
        stderrString, // promise
    }
}

// TODO: have standardizeCommandArgs check for pure objects and extract them as an options-input
const run = (...args)=>simpleRun({ command: standardizeCommandArgs(...args) })
run.interactive = (...args)=>simpleRun({ command: standardizeCommandArgs(...args), interactive: true })

class Command {
    constructor(args) {
        this.args = args
        this.options = {
            interactive: false,
            stdin: [], // always concat's (rather than zipping)
            stdoutOverwrite: [],
            stdoutAppend: [],
            stderrOverwrite: [],
            stderrAppend: [],
        }
    }
    get interactive() {
        this.options.interactive = true
        return this
    }
    stdin(stdinSource) {
        this.options.stdin.push(stdinSource)
        return this
    }
    stdoutOverwrite(source) { 
        this.options.stdoutOverwrite = source
        return this
    }
    stderrOverwrite(source) { 
        this.options.stderrOverwrite = source
        return this
    }
    outOverwrite(source) { 
        this.options.outOverwrite = source
        return this 
    }
    stdoutAppendTo(source) { 
        this.options.stdoutAppendTo = source
        return this 
    }
    stderrAppendTo(source) { 
        this.options.stderrAppendTo = source
        return this 
    }
    outAppendTo(source) { 
        this.options.outAppendTo = source
        return this 
    }
    stopAfter(miliseconds) { 
        this.options.stopAfter = miliseconds
        return this
    }
    killAfter(miliseconds) { 
        this.options.killAfter = miliseconds
        return this
    }
    with({ cwd, env, envPlus }) {
        this.options.cwd = cwd
        this.options.env = env
        return this
    }
    // and(command) { 
    // }
    // or(command) { 
    // }
    // pipeStdoutTo(command) { 
    // }
    // pipeStderrTo(command) {
    // }
}

export function execute(command) {
    return simpleRun({
        ...command.options,
        command: command.args,
    })
}

export const command = (maybeStrings, ...values)=>{
    return new Command(standardizeCommandArgs(maybeStrings, ...args))
}