#!/usr/bin/env -S deno run --allow-all
import { run, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo, zipInto, mergeInto, returnAsString, throwIfFails, hasCommand, pathsToAllCommands } from "../main/run.js"

console.debug(`hasCommand(\`echo\`) is:`, await hasCommand(`echo`))
console.debug(`hasCommand(\`blah\`) is:`, await hasCommand(`blah`))


// runs async
run("echo", "hello")

// wait for a command
await run("echo", "hello")

// get outcome
var { success, exitCode } = await run("echo", "hello").outcome
var { success, exitCode } = await run("echo", "hello")

// split the output
var inputReceiver = {
    write:(chunk)=>console.log("writing", chunk)
}
await run`echo hello ${Stdout(inputReceiver, Deno.stdout)}`

// send stdin (a string, a file, or a stream)
await run("cat", Stdin("Bang\n")).outcome

// send stdin, but later
var {stdin} = run("cat", Stdin())
// send a string
stdin.send("Bang Bang\n")
// or send raw bytes (normally from reading a file or stream directly)
stdin.send(new TextEncoder().encode("Bang Bang\n"))
// (cant send file objects and streams yet, but maybe in the future)
// CLOSE IT! otherwise the process will never end!
await stdin.close()

// get output string as return value
const pathToGrep = await run("which", "grep", Out(returnAsString))
console.debug(`pathToGrep is:`,JSON.stringify(pathToGrep))

// get output string as return value
const miscOutput = await run("deno", "eval", "console.log('hi1')\nsetTimeout(()=>console.log('bye'),1000)", Out(returnAsString))
console.debug(`miscOutput is:`,miscOutput)

// append to a file (give a path or a Deno file object)
var success = await run("which", "grep",
    Stdout(Overwrite("tests/run.grep_path.txt")),
    Stderr(AppendTo("tests/run.errors.log")),
).success

// report status
var process = run("sleep", "5")
let int = setInterval(() => {
    console.log(`process.isDone? is:`,process.isDone)
    if (process.isDone) {
        clearInterval(int)
    }
}, 1000);
await process

// create timeouts
var { success, exitCode } = await run("yes", Stdout(null), Timeout({ gentlyBy: 100, waitBeforeUsingForce: 500}))

// do a manual timeout
var process = run("yes", Stdout(null))
setTimeout(() => {
    process.kill() // uses force
}, 100)
await process

// do an even more manual timeout
var process = run("yes", Stdout(null))
setTimeout(() => {
    // ask to please stop
    process.sendSignal("SIGINT")

    setTimeout(() => {
        if (!process.isDone) {
            // murder it
            process.sendSignal("SIGKILL")
        }
    }, 200)
}, 100)