import { pathStandardize } from "./_pathStandardize.js"
import { lstat } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { lstat }

/**
 * @example
 * ```js
 * console.log(await exists(import.meta.dirname))
 * console.log(await exists(import.meta.filename))
 * ```
 */
export async function exists(path) {
    let _lstat
    if (path.path) {
        _lstat = path._stat || path._lstat
    }
    path = pathStandardize(path)
    if (!_lstat) {
        _lstat = await Deno.lstat(path).catch(() => null)
    }
    return _lstat?.size !== undefined
}