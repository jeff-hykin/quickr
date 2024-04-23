import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"
import Deno from "https://deno.land/x/deno_deno@1.42.1.7/main.js"

export const makeAbsolutePath = (path)=> {
    if (!Path.isAbsolute(path)) {
        return Path.normalize(Path.join(Deno.cwd(), path))
    } else {
        return Path.normalize(path)
    }
}