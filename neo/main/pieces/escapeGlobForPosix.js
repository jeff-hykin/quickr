/**
 * @example
 * ```js
 * console.log(escapeGlobForPosix("!\\*.js"))
 * ```
 */
export const escapeGlobForPosix = (glob)=>{
    return glob.replace(/[\[\\\*\{\?@\+\!]/g, `\\$&`)
}