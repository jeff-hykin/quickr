import { EzReadStream, EzWriteStream } from "../stream_tools.js"

export function process(...args, options) {
    if (typeof options == 'string') {
        args.push(options)
        options = undefined
    }
    const { env, ref } = { env:{}, ...options }
    const cwd = env?.PWD||Deno.cwd()

    const command = new Deno.Command(normalArgs[0], {
        env,
        cwd,
        args: normalArgs.slice(1,),
        {
            stdin: 'piped',
            stdout: 'piped',
            stderr: 'piped',
        },
    })
    const childProcess = command.spawn()
    if (ref) {
        childProcess.ref()
    }
    const stdinStream = new EzWriteStream(childProcess.stdin)
    const stdoutStream = new EzReadStream(childProcess.stdout)
    const stderrStream = new EzReadStream(childProcess.stderr)
    const output = {
        stdin: new EzWriteStream(childProcess.stdin),
        out: EzReadStream.zip(stderr, stdout),
        stdout: stdoutStream,
        stderr: stderrStream,
        signal: (...args)=>childProcess.kill(...args),
        stop: ()=>(childProcess.kill("SIGTERM"),output),
        forceStop: ()=>(childProcess.kill("SIGKILL"),output),
        pause: ()=>(childProcess.kill("SIGTSTOP"),output),
        resume: ()=>(childProcess.kill("SIGCONT"),output),
        status: childProcess.status,
        pid: childProcess.pid,
        ref: ()=>childProcess.ref(),
        unref: ()=>childProcess.unref(),
    }
    return output
}