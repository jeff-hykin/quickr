import { statSync, cwd } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
import { findAll } from "https://deno.land/x/good@1.14.3.0/flattened/find_all.js"
import { dirname } from "https://deno.land/std@0.128.0/path/mod.ts"

const Deno = { statSync, cwd }

/**
 * @example
 * ```js
 * console.log(getThisFolder())
 * console.log((()=>eval("getThisFolder()"))())
 * ```
 */
export function getThisFolder() { // FIXME: fails inside of libraries that are pulled from URL's
    const err = new Error()
    const filePaths = findAll(/^.+(?:file|@https?):\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
    
    const secondPath = filePaths[1]
    if (secondPath) {
        try {
            if (Deno.statSync(secondPath).isFile) {
                return dirname(secondPath)
            }
        } catch (error) {
        }
    }
    // if in an interpreter
    return Deno.cwd()
}