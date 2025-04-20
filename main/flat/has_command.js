import { FileSystem } from "./file_system.js"
import { Console } from "./console.js"
import { OperatingSystem } from "./operating_system.js"
import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.121.0/streams/conversion.ts"
import { zipReadableStreams, mergeReadableStreams } from "https://deno.land/std@0.121.0/streams/merge.ts"
import { StringReader } from "https://deno.land/std@0.128.0/io/mod.ts"
import * as Path from "https://deno.land/std@0.117.0/path/mod.ts"
import { toRepresentation as debugValueAsString } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/flattened/to_representation.js"
import { deferredPromise } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/async.js"

const timeoutSymbol      = Symbol("timeout")
const envSymbol          = Symbol("env")
const cwdSymbol          = Symbol("cwd")
const stdinSymbol        = Symbol("stdin")
const stdoutSymbol       = Symbol("stdout")
const stderrSymbol       = Symbol("stderr")
const stdoutAndErrSymbol = Symbol("stdoutAndErr")
const overwriteSymbol    = Symbol("overwrite")
const appendSymbol       = Symbol("append")
const asString  = Symbol("asString") // TODO: integrate this as a feature (returns { stdout: "blh", stderr: "bal", output: "blhbal" })
export const throwIfFails = Symbol("throwIfFails")
export const zipInto        = Symbol("zipInto")
export const mergeInto      = Symbol("mergeInto")
export const returnAsString = Symbol("returnAsString")
export const Timeout   = ({gentlyBy, waitBeforeUsingForce})=>[timeoutSymbol, {gentlyBy, waitBeforeUsingForce}]
export const Env       = (envVars)=>[envSymbol, envVars]
export const Cwd       = (newDirectory)=>[cwdSymbol, newDirectory]
export const Stdin     = (...streamsFilesOrStrings)=>[stdinSymbol , streamsFilesOrStrings]
export const Stdout    = (...pathsFilesStreamsOrSymbols)=>[stdoutSymbol, pathsFilesStreamsOrSymbols]
export const Stderr    = (...pathsFilesStreamsOrSymbols)=>[stderrSymbol, pathsFilesStreamsOrSymbols]
export const Out       = (...pathsFilesStreamsOrSymbols)=>[stdoutAndErrSymbol, pathsFilesStreamsOrSymbols]
export const Overwrite = (fileOrFilePath)=>[overwriteSymbol, fileOrFilePath]
export const AppendTo  = (fileOrFilePath)=>[appendSymbol, fileOrFilePath]

// 
// 
// Helpers
// 
// 

// based on this, thats all it is: https://deno.land/std@0.125.0/io/types.d.ts
// this does cause a bit of a problem though because files meet this defintion but are "readable" enough I suppose
// because they still need to be converted using readableStream
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

const { isWindows, isLinux, isMac } = OperatingSystem.commonChecks
let isWindows
let envPathString
try {
    isWindows = Deno.build.os=="windows"
    envPathString = Deno.env.get("PATH")
} catch (error) {}

export const pathsToAllCommands = async ({isWindows, envPathString}={isWindows, envPathString}) => {
    const spliter = isWindows ? ";" : ":"
    const paths = envPathString.split(spliter)
    const executableFilePaths = (await Promise.all(paths.map(
        each=>FileSystem.listFilePathsIn(each, {
            shouldntInclude: async (path)=>{
                if (isWindows) { // currently cant check execute permissions in windows
                    return false
                }
                try {
                    const permissions = (await FileSystem.getPermissions({path}))
                    // filter out non-executable files
                    if (!(permissions.owner.canExecute||permissions.group.canExecute||permissions.others.canExecute)) {
                        return true
                    }
                } catch (error) {
                    console.debug(`error is:`,error)
                }
            }
        })
    ))).flat(1)
    
    const mapping = {}
    for (const each of executableFilePaths) {
        const basename = FileSystem.basename(each)
        const paths = mapping[basename] || []
        paths.push(each)
        mapping[basename] = paths
    }
    return mapping
}

/**
 * @example
 * ```js
 * const path = Deno.env.get("PATH").split(":")[0])
 * if (await pathHasCommand({command: "git", path })) {
 *     console.log(`which git = ${path}/git`)
 * }
 * ```
 *
 * @param {String} arg1.path - 
 * @param {String} arg1.command - 
 * @returns {Boolean} output - 
 *
 */
export const pathHasCommand = ({path, command})=> {
    if (isWindows) {
        // TODO: figure out if there is a "isExecutable" check on window
        return Promise.any([
            FileSystem.info(`${path}/${command}`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.exe`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.bat`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
            FileSystem.info(`${path}/${command}.ps1`).then(pathInfo=>{ if (!pathInfo.isFile) { throw Error() } else { return true; } }),
        ]).catch(_=>false)
    } else {
        // TODO: currently this is misleading if, for example, only the group can execute, but the current user is not part of the group
        //       this requires an interface for getting the current user group and username, which isnt created yet
        return FileSystem.getPermissions({path}).then((permissions)=>(permissions.owner.canExecute||permissions.group.canExecute||permissions.others.canExecute)).catch(_=>false)
    }
}