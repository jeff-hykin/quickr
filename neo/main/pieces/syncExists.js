import { pathStandardize } from "./_pathStandardize.js"
import { lstatSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { lstatSync }

/**
 * @example
 * ```js
 * console.log(await syncExists(import.meta.dirname))
 * console.log(await syncExists(import.meta.filename))
 * ```
 */
export function exists(path) {
    let _lstat
    if (path.path) {
        _lstat = path._stat || path._lstat
    }
    path = pathStandardize(path)
    if (!_lstat) {
        try {
            _lstat = Deno.lstatSync(path).
        } catch (error) {
            
        }
    }
    return _lstat?.size !== undefined
}