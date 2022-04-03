#!/usr/bin/env sh
'\' -split "\\" -join ""# 2>/dev/null; : "' /*
<#" deno_version="1.20.3"; deno_install="$HOME/.deno/$deno_version";deno="$deno_install/bin/deno"; filepath="$deno"; has () { [ ! -z "$(command -v "unzip")" ]; } ; if [ ! -f "$filepath" ] || [ ! -r "$filepath" ] || [ ! -x "$filepath" ]; then if ! has unzip; then could_auto_install="true"; if has apt-get; then if has brew; then could_auto_install="false"; else if ! brew install unzip; then could_auto_install="false"; fi; fi; else if [ "$(whoami)" = "root" ]; then if ! apt-get install unzip -y; then could_auto_install="false"; fi; elif [ -n "$(command -v "sudo")" ]; then echo "Can I install unzip for you? (its required for this command to work)";read ANSWER;echo; if [ ! "$ANSWER" =~ ^[Yy] ]; then could_auto_install="false"; else if ! sudo apt-get install unzip -y; then could_auto_install="false"; fi; fi; elif has doas; then echo "Can I install unzip for you? (its required for this command to work)";read ANSWER;echo; if [ ! "$ANSWER" =~ ^[Yy] ]; then could_auto_install="false"; else if ! doas apt-get install unzip -y; then could_auto_install="false"; fi; fi; else could_auto_install="false"; fi; fi; fi; if [ "$could_auto_install" = "false" ]; then echo "";echo "So I couldn't find an 'unzip' command";echo "And I tried to auto install it, but it seems that failed";echo "(This script needs unzip and either curl or wget)";echo "Please install the unzip command manually then re-run this script";exit 1; fi; if [ "$OS" = "Windows_NT" ]; then target="x86_64-pc-windows-msvc" else ; case $(uname -sm) in "Darwin x86_64") target="x86_64-apple-darwin" ;; "Darwin arm64") target="aarch64-apple-darwin" ;; *) target="x86_64-unknown-linux-gnu" ;; esac; fi; deno_uri="https://github.com/denoland/deno/releases/download/v$deno_version/deno-$target.zip"; bin_dir="$deno_install/bin"; exe="$bin_dir/deno"; if [ ! -d "$bin_dir" ]; then mkdir -p "$bin_dir"; fi; if has curl; then curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri"; elif has curl ; then wget --output-document="$exe.zip" "$deno_uri"; else echo "Howdy! I looked for the 'curl' and for 'wget' commands but I didn't see either of them."; echo "Please install one of them"; echo "Otherwise I have no way to install the missing deno version needed to run this code"; fi; unzip -d "$bin_dir" -o "$exe.zip"; chmod +x "$exe"; rm "$exe.zip"; fi; "$deno" run -A "$0" "$@"; exit $? ; #> $deno_version = "1.19.0"; $env:DENO_INSTALL = "${HOME}/.deno/${deno_version}"; $deno = "${env:DENO_INSTALL}/bin/deno"; if (-not(Test-Path -Path "${deno}" -PathType Leaf)) { $v="${deno_version}"; iwr https://deno.land/x/install/install.ps1 -useb | iex; }; & "${deno}" run -A "${PSCommandPath}" @args; Exit $LastExitCode; #
*/

// var isReadable = (obj) => obj instanceof Object && obj.read instanceof Function
// var isWritable = (obj) => obj instanceof Object && obj.write instanceof Function

// var concatUint8Arrays = (arrays) =>
//     new Uint8Array(arrays.reduce((acc, curr) => (acc.push(...curr), acc), [])) // simplified from: https://stackoverflow.com/questions/49129643/how-do-i-merge-an-array-of-uint8arrays
// var streamToString = async (stream) => {
//     const returnReader = stream.getReader()
//     let blocks = []
//     while (true) {
//         const { value, done } = await returnReader.read()
//         if (done) {
//             break
//         }
//         blocks.push(value)
//     }
//     const string = new TextDecoder().decode(concatUint8Arrays(blocks))
//     return string
// }

// var chunks = []
// class TextLineStream extends TransformStream {
//     #buf = ""
//     #prevHadCR = false

//     constructor() {
//         super({
//             transform: (chunk, controller) => {
//                 chunks.push(chunk)
//                 this.#handle(chunk, controller)
//             },
//             flush: (controller) => {
//                 console.debug(`controller is:`, controller)
//                 controller.enqueue(this.#getBuf(false))
//             },
//         })
//     }

//     #handle(chunk, controller) {
//         const lfIndex = chunk.indexOf("\n")

//         if (this.#prevHadCR) {
//             this.#prevHadCR = false
//             if (lfIndex === 0) {
//                 controller.enqueue(this.#getBuf(true))
//                 this.#handle(chunk.slice(1), controller)
//                 return
//             }
//         }

//         if (lfIndex === -1) {
//             if (chunk.at(-1) === "\r") {
//                 this.#prevHadCR = true
//             }
//             this.#buf += chunk
//         } else {
//             let crOrLfIndex = lfIndex
//             if (chunk[lfIndex - 1] === "\r") {
//                 crOrLfIndex--
//             }
//             this.#buf += chunk.slice(0, crOrLfIndex)
//             controller.enqueue(this.#getBuf(false))
//             this.#handle(chunk.slice(lfIndex + 1), controller)
//         }
//     }

//     #getBuf(prevHadCR) {
//         const buf = this.#buf
//         this.#buf = ""

//         if (prevHadCR) {
//             return buf.slice(0, -1)
//         } else {
//             return buf
//         }
//     }
// }


Deno.addSignalListener("SIGINT", (...args)=>{
    console.debug(`args is:`,args)
})

setTimeout(() => {}, 5000); // Prevents exiting immediately.

// var stdinSoFar = ""
// var events = {
//     onStdinLine: (line)=>{
//         stdinSoFar += line+"\n"
//         console.debug(`stdinSoFar is:`,stdinSoFar)
//     },
//     onCtrlC() {
//         console.log(`stopping`)
//         // Deno.exit()
//     },
// }

// import { signal } from "https://deno.land/std/signal/mod.ts";
// const sig = signal("SIGUSR1", "SIGINT");
// setTimeout(() => {}, 5000); // Prevents exiting immediately.

// async function* signalGenerator() {
//     for await (const _ of sig) {
//         yield 1
//     }
// }

// ;((async ()=>{
//     for await (const _ of sig) {
//         console.debug(`sig is:`,sig)
//     }
// })())

// import { signal } from "https://deno.land/std/signal/mod.ts"
// const sig = signal("SIGINT")
// setTimeout($=>0, 1000)
// // console.debug(`sig is:`,sig)
// for await (const _ of sig) {
//     // events.onCtrlC()
// }
// ;((async ()=>{
// })())

// // import { readLines } from "https://deno.land/std@0.100.0/io/mod.ts"


// let lineGenerator = signalGenerator() // readLines(Deno.stdin)
// let callback = ({ value, done })=>{
//     events.onStdinLine(value)
//     done || lineGenerator.next().then(callback)
// }
// lineGenerator.next().then(callback)

// console.debug(`Deno.stdin.readable is:`, Deno.stdin.readable)
// var a = new TextLineStream()
// var b = await Deno.stdin.readable.pipeThrough(a)
// console.debug(`a is:`, a)
// console.debug(`b is:`, b)
// console.debug(`Deno.stdin.readable is:`, Deno.stdin.readable)
// var r = b.getReader()
// console.debug(`streamToString(b) is:`, await streamToString(b))
