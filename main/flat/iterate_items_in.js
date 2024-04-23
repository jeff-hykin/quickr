import { readDirSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { readDirSync }
import { join } from "https://deno.land/std@0.128.0/path/mod.ts"
const PathTools = { join }
import { pathInfo } from './path_info.js'
import { makeAbsolutePath } from './make_absolute_path.js'
const FileSystem = { makeAbsolutePath, sync: { info: pathInfo } }

export function *  iterateItemsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, }) {
    // merge defaults
    options = { exclude: new Set(), searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
    options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
    // maxDepth == 1 forces recursively to false
    options.recursively = options.recursively == false && options.maxDepth == 1 ? false : options.recursively
    const { shouldntExplore, shouldntInclude } = options
    // setup args
    const info = FileSystem.sync.info(pathOrFileInfo)
    const path = info.path
    // check args
    if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
        throw Error(`when calling iterateItemsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
    }
    const useBreadthFirstSearch = options.searchOrder == 'breadthFirstSearch'
    const shouldntExploreThis = shouldntExplore && shouldntExplore(info)
    if (!shouldntExploreThis && options.maxDepth > 0 && info.isFolder) {
        options.exclude = options.exclude instanceof Set ? options.exclude : new Set(options.exclude)
        
        // note: exclude includes already-searched paths in the recursive case
        if (!options.exclude.has(path)) {
            const absolutePathVersion = FileSystem.makeAbsolutePath(path)
            options.exclude.add(absolutePathVersion)
            options.maxDepth -= 1
            
            const searchAfterwords = []
            for (const entry of Deno.readDirSync(path)) {
                const eachItem = FileSystem.sync.info(PathTools.join(path, entry.name))
                // 
                // add the item
                // 
                const shouldntIncludeThis = shouldntInclude && shouldntInclude(eachItem)
                if (!shouldntIncludeThis) {
                    yield eachItem
                }
                
                // 
                // schedule children
                // 
                if (options.recursively) {
                    if (eachItem.isFolder) {
                        if (useBreadthFirstSearch) {
                            searchAfterwords.push(eachItem)
                        } else {
                            // "yield*" doesn't seem to work for async iterators
                            for (const eachSubPath of iterateItemsIn(eachItem, options)) {
                                // shouldntInclude would already have been executed by ^ so dont re-check
                                yield eachSubPath
                            }
                        }
                    }
                }
            }
            // BFS
            options.recursively = false
            while (searchAfterwords.length > 0) {
                const next = searchAfterwords.shift()
                // "yield*" doesn't seem to work for async iterators
                for (const eachSubItem of iterateItemsIn(next, options)) {
                    // shouldntInclude would already have been executed by ^ so dont re-check
                    yield eachSubItem
                    if (eachSubItem.isFolder) {
                        searchAfterwords.push(eachSubItem)
                    }
                }
            }
        }
    }
}