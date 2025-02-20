import { pathStandardize } from "./_pathStandardize.js"
import { statSync as denoStatSync, lstatSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { statSync: denoStatSync, lstatSync }

/**
 * @example
 * ```js
 * console.log(statSync(import.meta.dirname))
 * console.log(statSync(import.meta.filename))
 * ```
 */
export function statSync(path) {
    path = pathStandardize(path)
    let _statSync
    try {
        _statSync = Deno.statSync(path) 
        // {
        //     size: 5173,
        //     mtime: 2025-02-20T20:37:50.361Z,
        //     atime: 2025-02-20T20:37:50.398Z,
        //     birthtime: 2025-02-20T14:07:48.711Z,
        //     ctime: 2025-02-20T20:37:50.000Z,
        //     dev: 16777234,
        //     ino: 113602288,
        //     mode: 33188,
        //     nlink: 1,
        //     uid: 501,
        //     gid: 20,
        //     rdev: 0,
        //     blksize: 4096,
        //     blocks: 16,
        //     isFile: true,
        //     isDirectory: false,
        //     isSymlink: false,
        //     isBlockDevice: false,
        //     isCharDevice: false,
        //     isFifo: false,
        //     isSocket: false
        // }
    } catch (error) {
        _statSync = {}
        if (error.message.match(/^Too many levels of symbolic links/)) {
            _statSync.isLoopOfLinks = true
            _statSync.isBrokenLink = true
        } else if (error.message.match(/^No such file or directory/)) {
            // check if the path exists at all
            let lstatSync
            try {
                lstatSync = Deno.lstatSync(path)
            } catch (error) {
                
            }
            if (!lstatSync) {
                return {path, exists: false}
            } else {
                _statSync.isBrokenLink = true
            }
        } else {
            // probably a permission error
            throw error
        }
    }
    return _statSync
}