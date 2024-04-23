import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"

export const pathStandardize = (path)=>{
    // PathInfo object to path
    path = path.path||path
    // url-like file path to POSIX path
    if (typeof path == 'string' && path.startsWith("file:///")) {
        path = Path.fromFileUrl(path)
    }
    return path
}