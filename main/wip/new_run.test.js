import { run } from "./new_run.js"


// await everything (defaults to deno.stdin, but pipes stdout and stderr)
var { stdout, stderr, out, success, exitCode } = await run`something`

// modifying args
var { stdout, stderr, out, success, exitCode } = await run`something`
    .freshEnv({ PATH: "someOtherPath" })
    .extraEnv({ PATH: `./my/path:${Console.env.PATH}` })
    .cwd("someOtherPath")
    .windowsRawArguments(true)
    .setUid()
    .setGid()
    .killAfter(100) // miliseconds
    .forceKillAfter(100) // miliseconds
    .killAfter(100, { forceKillIfNotDeadAfter: 1000 }) // miliseconds

// await specific things (behaves differently under the hood)
var stdout       = await run`echo hello`.stdout
var stdoutBytes  = await run`echo hello`.stdoutBytes
var out          = await run`echo hello`.out

// interactive (control stdin)
var process      = await run`ssh pi@raspberry`.interactive
var piResponse   = process.send("echo starting something\n").then(()=>process.stdout.grabString())
var piLs         = process.send("ls -l\n"                  ).then(()=>process.out.grabString())
process.stdin.close()
process.sendSignal("kill")
process.isRunning // might still be true because of delay time
var { exitCode } = await process.result


// stacking
await run`echo hello`
    .pipe("stdout", run`cat`)
    .pipe("stdout", Deno.stdout)
    .pipe("stdout", run`head -n1`.pipe("stdout", Overwrite("./some_file.txt")))
    .pipe("stderr", run`tail -n1`)
    .and(run`echo finished successfully`.and(run`echo that <- echo finished successfully`))
    .or(run`echo finished successfully`)