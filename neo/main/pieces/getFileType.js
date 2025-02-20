import { pathStandardize } from "./_pathStandardize.js"
import { stat } from "./stat.js"
import { lstat } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { lstat }

/**
 * @example
 * ```js
 * console.log(await getFileType(import.meta.dirname))
 * console.log(await getFileType("/home/user/file.txt"))
 * ```
 * @returns {"nonexistent"|"directory"|"normalFile"|"blockDevice"|"charDevice"|"fifo"|"socket"|"symlinkLoop"|"symlinkBroken"|"symlinkToBlockDevice"|"symlinkToCharDevice"|"symlinkToFifo"|"symlinkToSocket"|"symlinkToNormalFile"|"symlinkToUnknown"} output - description
 *
 */
export async function getFileType(path) {
    let _stat, _lstat
    if (path.path) {
        _stat = path._stat
        _lstat = path._lstat
    }
    path = pathStandardize(path)
    if (!_lstat) {
        _lstat = await Deno.lstat(path).catch(() => null)
    }

    if (!_lstat) {
        return 'nonexistent'
    } else if (_lstat.isDirectory) {
        return 'directory'
    } else if (_lstat.isFile) {
        return 'normalFile'
    } else if (_lstat.isBlockDevice) {
        return 'blockDevice'
    } else if (_lstat.isCharDevice) {
        return 'charDevice'
    } else if (_lstat.isFifo) {
        return 'fifo'
    } else if (_lstat.isSocket) {
        return 'socket'
    } else if (_lstat.isSymlink) {
        if (!_stat) {
            stat = await stat(path)
        }

        if (stat.isLoopOfLinks) {
            return 'symlinkLoop'
        } else if (stat.isBrokenLink) {
            return 'symlinkBroken'
        } else if (stat.isBlockDevice) {
            return 'symlinkToBlockDevice'
        } else if (stat.isCharDevice) {
            return 'symlinkToCharDevice'
        } else if (stat.isFifo) {
            return 'symlinkToFifo'
        } else if (stat.isSocket) {
            return 'symlinkToSocket'
        } else if (stat.isFile) {
            return 'symlinkToNormalFile'
        } else {
            return 'symlinkToUnknown'
        }
    }
}