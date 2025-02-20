/**
 * @example
 * ```js
 * console.log(escapeGlobForWindows("[1]@*.js"))
 * ```
 */
export const escapeGlobForWindows = (glob)=>{
    return glob.replace(/[\[`\*\{\?@\+\!]/g, "`$&")
}