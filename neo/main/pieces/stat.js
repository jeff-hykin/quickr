import { pathStandardize } from "./_pathStandardize.js"
import { stat as denoStat, lstat } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { stat: denoStat, lstat }

/**
 * @example
 * ```js
 * console.log(await stat(import.meta.dirname))
 * console.log(await stat(import.meta.filename))
 * ```
 */
export async function stat(path) {
    path = pathStandardize(path)
    let _stat
    try {
        _stat = await Deno.stat(path) 
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
        _stat = {}
        if (error.message.match(/^Too many levels of symbolic links/)) {
            _stat.isLoopOfLinks = true
            _stat.isBrokenLink = true
        } else if (error.message.match(/^No such file or directory/)) {
            // check if the path exists at all
            let lstat = await Deno.lstat(path).catch(()=>null)
            if (!lstat) {
                return {path, exists: false}
            } else {
                _stat.isBrokenLink = true
            }
        } else {
            // probably a permission error
            throw error
        }
    }
    return _stat
}