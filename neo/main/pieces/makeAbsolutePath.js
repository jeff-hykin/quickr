import { normalize, isAbsolute, join } from "https://deno.land/std@0.128.0/path/mod.ts"
import { cwd } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { cwd }

/**
 * @example
 * ```js
 * console.log(makeAbsolutePath("file.txt"))
 * console.log(makeAbsolutePath("/file.txt"))
 * console.log(makeAbsolutePath("./file.txt"))
 * console.log(makeAbsolutePath("../file.txt"))
 * ```
 */
export const makeAbsolutePath = (path)=> {
    if (!isAbsolute(path)) {
        return normalize(join(Deno.cwd(), path))
    } else {
        return normalize(path)
    }
}