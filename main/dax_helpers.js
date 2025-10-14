import { build$, default as $$ } from "https://esm.sh/@jsr/david__dax@0.43.2/mod.ts"
import { env } from "https://deno.land/x/quickr@0.8.10/main/env.js"
export var _$ = build$({commandBuilder: (builder) => builder.exportEnv().noThrow(), })
export var $ = Object.assign((strings,...args)=>{
    strings = [...strings]
    const firstWord = strings[0].trim().split(" ")[0]
    if (firstWord.match(new RegExp("^("+Object.keys(aliases).sort().join("|")+")$"))) {
        strings[0] = aliases[firstWord]
    }
    return _$(strings,...args)
},$$)
export const aliases = {}
export const $stdout = [ Deno.stdout.readable, {preventClose:true} ]
export const $stderr = [ Deno.stderr.readable, {preventClose:true} ]
export const appendTo = (pathString)=>$$.path(pathString).openSync({ write: true, create: true, truncate: false })
export const overwrite = (pathString)=>$$.path(pathString).openSync({ write: true, create: true })
export const hasCommand = (cmd)=>$$.commandExistsSync(cmd)
export { env } from "./env.js"