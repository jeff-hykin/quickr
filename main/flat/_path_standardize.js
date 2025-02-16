import { fromFileUrl } from "https://deno.land/std@0.128.0/path/mod.ts"

export const pathStandardize = (path)=>{
    if (path instanceof Array) {
        return path.map(pathStandardize)
    }
    // PathInfo object to path
    path = path.path||path
    // url-like file path to POSIX path
    if (typeof path == 'string' && path.startsWith("file:///")) {
        path = fromFileUrl(path)
    }
    return path
}