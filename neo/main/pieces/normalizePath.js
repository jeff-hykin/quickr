import { normalize } from "https://deno.land/std@0.128.0/path/mod.ts"
import { pathStandardize } from "./_pathStandardize.js"

/**
 * @example
 * ```js
 * console.log(normalizePath("file.txt"))
 * console.log(normalizePath("/file.txt"))
 * console.log(normalizePath("./file.txt"))
 * console.log(normalizePath("../file.txt"))
 * ```
 */
export const normalizePath = (path)=>normalize(pathStandardize(path)).replace(/\/$/,"")