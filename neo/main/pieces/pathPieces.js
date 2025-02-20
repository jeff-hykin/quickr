import { pathStandardize } from "./_pathStandardize.js"
import { parse, basename, dirname, } from "https://deno.land/std@0.128.0/path/mod.ts"
const Path = { parse, basename, dirname, }

/**
 * @example
 * ```js
 * const [ folders, itemName, itemExtensionWithDot ] = FileSystem.pathPieces(import.meta.filename)
 * console.log(pathPieces("file.thing.txt"))
 * console.log(pathPieces("file..thing.txt"))
 * console.log(pathPieces("/some/where/file..thing.txt"))
 * console.log(pathPieces("./file.txt"))
 * console.log(pathPieces("../file.txt"))
 * ```
 */
export function pathPieces(path) {
    path = pathStandardize(path)
    const result = Path.parse(path)
    const folderList = []
    let dirname = result.dir
    while (true) {
        folderList.push(Path.basename(dirname))
        // if at the top 
        if (dirname == Path.dirname(dirname)) {
            break
        }
        dirname = Path.dirname(dirname)
    }
    folderList.reverse()
    return [ folderList, result.name, result.ext ]
}