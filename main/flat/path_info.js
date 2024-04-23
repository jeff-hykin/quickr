import { lstatSync, statSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { lstatSync, statSync }
import { Path } from "./path.js"

export function pathInfo(fileOrFolderPath, _cachedLstat=null) {
    // compute lstat and stat before creating PathInfo (so its async for performance)
    let lstat = _cachedLstat
    try {
        lstat = Deno.lstatSync(fileOrFolderPath)
    } catch (error) {
        lstat = {doesntExist: true}
    }

    let stat = {}
    if (!lstat.isSymlink) {
        stat = {
            isBrokenLink: false,
            isLoopOfLinks: false,
        }
    // if symlink
    } else {
        try {
            stat = Deno.statSync(fileOrFolderPath)
        } catch (error) {
            if (error.message.match(/^Too many levels of symbolic links/)) {
                stat.isBrokenLink = true
                stat.isLoopOfLinks = true
            } else if (error.message.match(/^No such file or directory/)) {
                stat.isBrokenLink = true
            } else {
                // probably a permission error
                // TODO: improve how this is handled
                throw error
            }
        }
    }
    return new Path({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
}