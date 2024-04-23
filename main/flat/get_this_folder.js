import { findAll } from "https://deno.land/x/good@1.6.0.1/string.js"
const GoodJs = { findAll }
import { dirname } from "https://deno.land/std@0.128.0/path/mod.ts"
const PathTools = { dirname }
import { statSync, cwd } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { statSync, cwd }

export function getThisFolder() { // FIXME: fails inside of libraries that are pulled from URL's
    const err = new Error()
    const filePaths = GoodJs.findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
    
    // if valid file
    // FIXME: make sure this works inside of anonymous functions (not sure if error stack handles that well)
    const secondPath = filePaths[1]
    if (secondPath) {
        try {
            if (Deno.statSync(secondPath).isFile) {
                return PathTools.dirname(secondPath)
            }
        } catch (error) {
        }
    }
    // if in an interpreter
    return Deno.cwd()
}