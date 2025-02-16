import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"
import { move as moveAndRename, moveSync as moveAndRenameSync, copy as basicCopy, copySync as basicCopySync } from "https://deno.land/std@0.133.0/fs/mod.ts"
import { findAll } from "https://deno.land/x/good@1.14.3.0/string.js"
import { makeIterable, asyncIteratorToList, concurrentlyTransform } from "https://deno.land/x/good@1.14.3.0/iterable.js"
import { globToRegExp } from "https://deno.land/std@0.214.0/path/glob.ts";
import { readLines } from "https://deno.land/std@0.191.0/io/read_lines.ts"
import { isGeneratorObject as isGeneratorType } from "https://deno.land/x/good@1.14.3.0/flattened/is_generator_object.js"
import { typedArrayClasses } from "https://deno.land/x/good@1.14.3.0/flattened/typed_array_classes.js"
import { pathPureName } from "https://deno.land/x/good@1.14.3.0/flattened/path_pure_name.js"

import { pathStandardize } from "./flat/_path_standardize.js"
import { makeAbsolutePath } from "./flat/make_absolute_path.js"
import { normalizePath } from "./flat/normalize_path.js"
import { Path as PathInfo } from "./flat/path.js"
import { escapeGlob } from "./flat/escape_glob.js"

// DONE when:
    // import Deno api's
    // all methods are flattened out
    // slightly redone Path class
    // good API for file locking
    // fenced-off file locking
    // consistent argument interface (probably always named arguments)
        // consistent handling of path string and path class
    // sync API on parity with async API

// extra:
    // folder recursive merge function
    // check LF vs CRLF detection
    // smart rate-limiting on concurrent responses to async iterator options
    // add path API's
        // rename function
        // merge folders
        // get/set item owner
        // current user's username with Deno.getUid()
        // item size
        // item timeCreated
        // item timeOfLastAccess
        // item timeOfLastModification
        // tempfile
        // tempfolder
        // readFileStream

const cache = {}

function setTrueBit(n, bit) {
    return n | (1 << bit)
}
function setFalseBit(n, bit) {
    return ~(~n | (1 << bit))
}

const defaultOptionsHelper = (options)=>({
    renameExtension: options.renameExtension || FileSystem.defaultRenameExtension,
    overwrite: options.overwrite,
})
// might seem dumb to have locking in a single threaded JS application but I assure you it is required for async file operations to not fight eachother
const fileLockSymbol = Symbol.for("fileLock")
const locker = globalThis[fileLockSymbol] || {}
const grabPathLock = async (path)=> {
    while (locker[path]) {
        await new Promise((resolve)=>setTimeout(resolve, 70))
    }
    locker[path] = true
}

const booleanCheckNames = [
    "isRelativePath",
    "isAbsolutePath",
    "exists",
    "isSymlink",
    "isFileOrSymlinkToNormalFile",
    "isFolderOrSymlinkToFolder",
    "isFileHardlink",
    "isFolderHardlink",
    "isWeirdItem",
]
// NOTE: feature is disabled for now (is tested and works)
const logicalExtensionWrapper = (promise, path)=> {
    // Object.defineProperty(promise, "and", {
    //     get() {
    //         let andProperties = {}
    //         for (let each of booleanCheckNames) {
    //             andProperties[each] = {
    //                 get: ()=>promise.then(result=>result&&FileSystem[each](path)).catch(()=>false)
    //             }
    //         }
    //         return Object.defineProperties({}, andProperties)
    //     }
    // })
    return promise
}
export const FileSystem = {
    defaultRenameExtension: ".old",
    denoExecutablePath: Deno.execPath(),
    parentPath: Path.dirname,
    dirname: Path.dirname,
    basename: Path.basename,
    extname: Path.extname,
    join: Path.join,
    normalize: normalizePath,
    normalizePath,
    pureNameOf: pathPureName,
    isAbsolutePath: Path.isAbsolute,
    isRelativePath: (...args)=>!Path.isAbsolute(...args),
    makeRelativePath: ({from, to}) => Path.relative(from.path || from, to.path || to),
    makeAbsolutePath,
    pathDepth(path) {
        path = FileSystem.normalizePath(path)
        let count = 0
        for (const eachChar of (path.path||path)) {
            if (eachChar == "/") {
                count++
            }
        }
        if (path[0] == "/") {
            count--
        }
        return count+1
    },
    pathPieces(path) {
        // const [ folders, itemName, itemExtensionWithDot ] = FileSystem.pathPieces(path)
        path = (path.path || path) // if given PathInfo object
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
    },
    /**
     * add to name, preserve file extension
     *
     * @example
     * ```js
     * let newName = FileSystem.extendName({ path: "a/blah.thing.js", string: ".old" })
     * newName == "a/blah.old.thing.js"
     * ```
     *
     * @param arg1.path - item path
     * @param arg1.string - the string to append to the name
     * @return {string} - the new path
     */
    extendName({path, string}) {
        path = pathStandardize(path)
        const [name, ...extensions] = Path.basename(path).split(".")
        return `${Path.dirname(path)}/${name}${string}${extensions.length==0?"":`.${extensions.join(".")}`}`
    },
    /**
     * All Parent Paths
     *
     * @param {String} path - path doesnt need to exist
     * @return {[String]} longest to shortest parent path
     */
    allParentPaths(path) {
        const pathStartsWithDotSlash = path.startsWith("./")
        path = FileSystem.normalizePath(path)
        // just dot (or dot-slash) has no parents
        if (path === ".") {
            return []
        }
        // if there was a dot but normalize removed it, that means it was ./thing 
        const dotGotRemoved = pathStartsWithDotSlash && !path.startsWith("./")
        
        let previousPath = null
        let allPaths = []
        while (1) {
            previousPath = path
            path = FileSystem.parentPath(path)
            if (previousPath === path) {
                break
            }
            allPaths.push(path)
        }
        allPaths.reverse()
        allPaths = allPaths.filter(each=>each!=".")
        if (dotGotRemoved) {
            allPaths.push(".")
        }
        return allPaths
    },
    pathOfCaller(callerNumber=undefined) {
        const err = new Error()
        let filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
        if (callerNumber) {
            filePaths = filePaths.slice(callerNumber)
        }
        
        // TODO: make sure this works inside of anonymous functions (not sure if error stack handles that well)
        try {
            const secondPath = filePaths[1]
            if (secondPath) {
                try {
                    // if valid file
                    if (Deno.statSync(secondPath).isFile) {
                        return secondPath
                    }
                } catch (error) {
                }
            }
        } catch (error) {
        }
        // if in an interpreter
        return Deno.cwd()
    },
    get home() {
        if (!cache.home) {
            if (Deno.build.os!="windows") {
                cache.home = Deno.env.get("HOME")
            } else {
                // untested
                cache.home = Deno.env.get("HOMEPATH")
            }
        }
        return cache.home
    },
    get workingDirectory() {
        return Deno.cwd()
    },
    set workingDirectory(value) {
        Deno.chdir(value)
    },
    get cwd() { return FileSystem.workingDirectory },
    set cwd(value) { return FileSystem.workingDirectory = value },
    get pwd() { return FileSystem.cwd },
    set pwd(value) { return FileSystem.cwd = value },
    cd(path) {
        Deno.chdir(path)
    },
    changeDirectory(path) {
        Deno.chdir(path)
    },
    get thisFile() {
        const err = new Error()
        const filePaths = [...err.stack.matchAll(/^.+(file:\/\/\/[\w\W]*?):/gm)].map(each=>each[1]&&Path.fromFileUrl(each[1]))
        
        // if valid file
        // FIXME: make sure this works inside of anonymous functions (not sure if error stack handles that well)
        const firstPath = filePaths[0]
        if (firstPath) {
            try {
                if (Deno.statSync(firstPath).isFile) {
                    return firstPath
                }
            } catch (error) {
            }
        }
        // if in an interpreter
        return ':<interpreter>:'
    },
    get thisFolder() { // FIXME: fails inside of libraries that are pulled from URL's
        const err = new Error()
        const filePaths = [...err.stack.matchAll(/^.+(file:\/\/\/[\w\W]*?):/gm)].map(each=>each[1]&&Path.fromFileUrl(each[1]))
        
        // if valid file
        // FIXME: make sure this works inside of anonymous functions (not sure if error stack handles that well)
        const firstPath = filePaths[0]
        if (firstPath) {
            try {
                if (Deno.statSync(firstPath).isFile) {
                    return Path.dirname(firstPath)
                }
            } catch (error) {
            }
        }
        // if in an interpreter
        return Deno.cwd()
    },
    async read(path) {
        path = pathStandardize(path)
        await grabPathLock(path)
        let output
        try {
            output = await Deno.readTextFile(path)
        } catch (error) {
        }
        delete locker[path]
        return output
    },
    async readBytes(path) {
        path = pathStandardize(path)
        await grabPathLock(path)
        let output
        try {
            output = await Deno.readFile(path)
        } catch (error) {
        }
        delete locker[path]
        return output
    },
    async * readLinesIteratively(path) {
        path = pathStandardize(path)
        await grabPathLock(path)
        try {
            const file = await Deno.open(path)
            try {
                yield* readLines(file)
            } finally {
                Deno.close(file.rid)
            }
        } finally {
            delete locker[path]
        }
    },
    async info(fileOrFolderPath, _cachedLstat=null) {
        fileOrFolderPath = pathStandardize(fileOrFolderPath)
        await grabPathLock(fileOrFolderPath)
        try {
            // compute lstat and stat before creating PathInfo (so its async for performance)
            const lstat = _cachedLstat || await Deno.lstat(fileOrFolderPath).catch(()=>({doesntExist: true}))
            let stat = {}
            if (!lstat.isSymlink) {
                stat = {
                    isBrokenLink: false,
                    isLoopOfLinks: false,
                }
            // if symlink
            } else {
                try {
                    stat = await Deno.stat(fileOrFolderPath)
                } catch (error) {
                    if (error.message.match(/^Too many levels of symbolic links/)) {
                        stat.isBrokenLink = true
                        stat.isLoopOfLinks = true
                    } else if (error.message.match(/^No such file or directory/)) {
                        stat.isBrokenLink = true
                    } else {
                        if (!error.message.match(/^PermissionDenied:/)) {
                            return {doesntExist: true, permissionDenied: true}
                        }
                        // probably a permission error
                        // TODO: improve how this is handled
                        throw error
                    }
                }
            }
            return new PathInfo({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
        } finally {
            delete locker[fileOrFolderPath]
        }
    },
    exists(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false), path)
    },
    isSymlink(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false).then(item=>item.isSymlink), path)
    },
    isFileOrSymlinkToNormalFile(path) {
        return logicalExtensionWrapper(Deno.stat(path?.path||path).catch(()=>false).then(item=>item.isFile), path)
    },
    isFolderOrSymlinkToFolder(path) {
        return logicalExtensionWrapper(Deno.stat(path?.path||path).catch(()=>false).then(item=>item.isDirectory), path)
    },
    isFileHardlink(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false).then(item=>item.isFile), path)
    },
    isFolderHardlink(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false).then(item=>item.isDirectory), path)
    },
    isNonFolderHardlink(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false).then(item=>!item.isDirectory), path)
    },
    isWeirdItem(path) {
        return logicalExtensionWrapper(Deno.lstat(path?.path||path).catch(()=>false).then(item=>each.isBlockDevice || each.isCharDevice || each.isFifo || each.isSocket), path)
    },
    async move({ path, item, newParentFolder, newName, force=true, overwrite=false, renameExtension=null }) {
        item = item||path
        // force     => will MOVE other things out of the way until the job is done
        // overwrite => will DELETE things out of the way until the job is done 
        
        const oldPath = item.path || item
        const oldName = FileSystem.basename(oldPath)
        const pathInfo = item instanceof Object || FileSystem.sync.info(oldPath)
        const newPath = `${newParentFolder||FileSystem.parentPath(oldPath)}/${newName || oldName}`

        // if its a relative-linked item then the relative link will need to be adjusted after the move
        // todo: consider more about the broken link case (current .FileSystem.relativeLink() only works with linking to things that exist)
        if (pathInfo.isSymlink && !item.isBrokenLink) {
            const link = Deno.readLinkSync(pathInfo.path)
            if (!Path.isAbsolute(link)) {
                const linkTargetBeforeMove = `${FileSystem.parentPath(pathInfo.path)}/${link}`
                await FileSystem.relativeLink({
                    existingItem: linkTargetBeforeMove,
                    newItem: newPath,
                    force,
                    overwrite,
                    renameExtension,
                })
                // remove the original since it was "moved"
                await FileSystem.remove(pathInfo)
            }
        }
        
        if (force) {
            FileSystem.sync.clearAPathFor(newPath, { overwrite, renameExtension })
        }
        await moveAndRename(oldPath, newPath)
    },
    async rename({ from, to, force=true, overwrite=false, renameExtension=null }) {
        // force     => will MOVE other things out of the way until the job is done
        // overwrite => will DELETE things out of the way until the job is done 
        return FileSystem.move({ path: from, newParentFolder: FileSystem.parentPath(to), newName: FileSystem.basename(to), force, overwrite, renameExtension })
    },
    async remove(fileOrFolder) {
        fileOrFolder = pathStandardize(fileOrFolder)
        // for `await FileSystem.remove(glob(`*.js`))`
        if (fileOrFolder instanceof Array) {
            return Promise.all(fileOrFolder.map(FileSystem.remove))
        }
        let exists = false
        let item
        try {
            item = await Deno.lstat(fileOrFolder)
            exists = true
        } catch (error) {}
        if (exists) {
            // this is a weird check because isFile,isDirectory,isSymlink can all be false at the same time
            // basical all false=wierd file (pipe, socket, etc), we still want to remove it
            if (item.isFile || item.isSymlink || !item.isDirectory)) {
                return Deno.remove(fileOrFolder.replace(/\/+$/,""))
            } else {
                return Deno.remove(fileOrFolder.replace(/\/+$/,""), {recursive: true})
            }
        }
    },
    async finalTargetOf(path, options={}) {
        const { _parentsHaveBeenChecked, cache } = { _parentsHaveBeenChecked: false , cache: {}, ...options }
        const originalWasItem = path instanceof PathInfo
        path = (path.path || path) // if given PathInfo object
        let result = await Deno.lstat(path).catch(()=>({doesntExist: true}))
        if (result.doesntExist) {
            return null
        }
    
        // 
        // naively follow the path chain to build up a full chain
        // 
        path = await FileSystem.makeHardPathTo(path, {cache})
        const pathChain = []
        while (result.isSymlink) {
            // get the path to the target
            const relativeOrAbsolutePath = await Deno.readLink(path)
            if (Path.isAbsolute(relativeOrAbsolutePath)) {
                // absolute
                path = relativeOrAbsolutePath
            } else {
                // relative
                path = `${FileSystem.parentPath(path)}/${relativeOrAbsolutePath}`
            }
            result = await Deno.lstat(path).catch(()=>({doesntExist: true}))
            // check if target exists
            if (result.doesntExist) {
                return null
            }
            // regardless of if absolute or relative, we need to re-harden
            path = await FileSystem.makeHardPathTo(path, {cache})
            if (pathChain.includes(path)) {
                // circular loop of links
                return null
            }
            pathChain.push(path)
        }

        path = FileSystem.normalizePath(path)
        if (originalWasItem) {
            return new PathInfo({path})
        } else {
            return path
        }
    },
    async nextTargetOf(path, options={}) {
        const originalWasItem = path instanceof PathInfo
        const item = originalWasItem ? path : new PathInfo({path})
        const lstat = item.lstat
        if (lstat.isSymlink) {
            const relativeOrAbsolutePath = Deno.readLinkSync(item.path)
            if (Path.isAbsolute(relativeOrAbsolutePath)) {
                if (originalWasItem) {
                    return new PathInfo({path:relativeOrAbsolutePath})
                } else {
                    return relativeOrAbsolutePath
                }
            } else {
                const path = `${await FileSystem.makeHardPathTo(Path.dirname(item.path))}/${relativeOrAbsolutePath}`
                if (originalWasItem) {
                    return new PathInfo({path})
                } else {
                    return path
                }
            }
        } else {
            if (originalWasItem) {
                return item
            } else {
                return item.path
            }
        }
    },
    async ensureIsFile(path, options={overwrite:false, renameExtension:null}) {
        const {overwrite, renameExtension} = defaultOptionsHelper(options)
        await FileSystem.ensureIsFolder(FileSystem.parentPath(path), {overwrite, renameExtension})

        path = path.path || path // if given PathInfo object
        const pathInfo = await FileSystem.info(path)
        if (pathInfo.isFile && !pathInfo.isDirectory) { // true for hardlinks and symbolic links to non-wierd files (like pipes)
            return path
        } else {
            await FileSystem.write({path, data:""}) // this will clear everything out of the way
            return path
        }
    },
    async ensureIsFolder(path, options={overwrite:false, renameExtension:null}) {
        const {overwrite, renameExtension} = defaultOptionsHelper(options)
        path = path.path || path // if given PathInfo object
        path = FileSystem.makeAbsolutePath(path)
        const parentPath = Path.dirname(path)
        // root is always a folder
        if (parentPath == path) {
            return
        } 
        // make sure parent is a folder
        const parent = await FileSystem.info(parentPath)
        if (!parent.isDirectory) {
            FileSystem.sync.ensureIsFolder(parentPath, {overwrite, renameExtension})
        }
        
        // move/remove files in the way
        let pathInfo = FileSystem.sync.info(path)
        if (pathInfo.exists && !pathInfo.isDirectory) {
            if (overwrite) {
                await FileSystem.remove(path)
            } else {
                await FileSystem.moveOutOfTheWay(eachPath, {extension: renameExtension})
            }
        }
        
        await Deno.mkdir(path, { recursive: true })
        // finally create the folder
        return path
    },
    /**
     * Move/Remove everything and Ensure parent folders
     *
     * @param path
     * @param options.overwrite - if false, then things in the way will be moved instead of deleted
     * @param options.renameExtension - the string to append when renaming files to get them out of the way
     * 
     * @note
     *     very agressive: will change whatever is necessary to make sure a parent exists
     * 
     * @example
     * ```js
     * await FileSystem.clearAPathFor("./something")
     * ```
     */
    async clearAPathFor(path, options={overwrite:false, renameExtension:null}) {
        const {overwrite, renameExtension} = defaultOptionsHelper(options)
        const originalPath = path
        const paths = []
        while (Path.dirname(path) !== path) {
            paths.push(path)
            path = Path.dirname(path)
        }
        // start at root "/" then get more and more specific
        for (const eachPath of paths.reverse()) {
            const info = await FileSystem.info(eachPath)
            if (!info.exists) {
                break
            } else if (!info.isDirectory) { // directory or symlink to directory
                if (overwrite) {
                    await FileSystem.remove(eachPath)
                } else {
                    await FileSystem.moveOutOfTheWay(eachPath, {extension:renameExtension})
                }
            }
        }
        await Deno.mkdir(Path.dirname(originalPath), { recursive: true })
        return originalPath
    },
    async moveOutOfTheWay(path, options={extension:null}) {
        const extension = options?.extension || FileSystem.defaultRenameExtension
        const info = await FileSystem.info(path)
        if (info.exists) {
            // make sure nothing is in the way of what I'm about to move
            const newPath = path+extension
            await FileSystem.moveOutOfTheWay(newPath, {extension})
            await moveAndRename(path, newPath)
        }
    },
    /**
     * find a root folder based on a child path
     *
     * @example
     * ```js
     *     import { FileSystem } from "https://deno.land/x/quickr/main/file_system.js"
     * 
     *     // option1: single subpath
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil(".git")
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil(".git/config")
     *     // option2: multiple subpaths
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil([".git/config", ".git/refs/heads/master"])
     *     // option3: function checker
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil(path=>FileSystem.exists(`${path}/.git`))
     *
     *     // change the startPath with a subPath
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil({startPath: FileSystem.pwd, subPath:".git"})
     *     // change the startPath with a function checker
     *     var gitParentFolderOrNull = await FileSystem.walkUpUntil({startPath: FileSystem.pwd}, path=>FileSystem.exists(`${path}/.git`))
     *```
     */
    async walkUpUntil(subPath, startPath=null) {
        // real args
        var func, subPathStrs, startPath
        // 
        // arg processing
        // 
        if (subPath instanceof Function) {
            func = subPath
            subPathStrs = []
        } else if (subPath instanceof Object) {
            func = startPath
            var {subPath, startPath} = subPath
            subPathStrs = [subPath]
        } else {
            subPathStrs = [subPath]
        }
        subPathStrs = subPathStrs.map(each=>each instanceof PathInfo ? each.path : each)
        if (!startPath) {
            startPath = Deno.cwd()
        } else if (Path.isAbsolute(startPath)) {
            startPath = startPath
        } else {
            startPath = Path.join(here, startPath)
        }
        // 
        // actual loop
        // 
        let here = startPath
        while (1) {
            const check = func ? await func(here) : (await Promise.all(subPathStrs.map((each)=>Deno.lstat(Path.join(here, each)).catch(()=>false)))).some(each=>each)
            if (check) {
                return here
            }
            // reached the top
            if (here == Path.dirname(here)) {
                return null
            } else {
                // go up a folder
                here =  Path.dirname(here)
            }
        }
    },
    async copy({from, to, preserveTimestamps=true, force=true, overwrite=false, renameExtension=null}) {
        const existingItemDoesntExist = (await Deno.stat(from).catch(()=>({doesntExist: true}))).doesntExist
        if (existingItemDoesntExist) {
            throw Error(`\nTried to copy from:${from}, to:${to}\nbut "from" didn't seem to exist\n\n`)
        }
        if (force) {
            FileSystem.sync.clearAPathFor(to, { overwrite, renameExtension })
        }
        return basicCopy(from, to, {force, preserveTimestamps: true})
    },
    async relativeLink({existingItem, newItem, force=true, overwrite=false, allowNonExistingTarget=false, renameExtension=null }) {
        const existingItemPath = (existingItem.path || existingItem).replace(/\/+$/, "") // the replace is to remove trailing slashes, which will cause painful nonsensical errors if not done
        const newItemPath = FileSystem.normalizePath((newItem.path || newItem).replace(/\/+$/, "")) // if given PathInfo object
        
        const existingItemDoesntExist = (await Deno.lstat(existingItemPath).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (!allowNonExistingTarget && existingItemDoesntExist) {
            throw Error(`\nTried to create a relativeLink between existingItem:${existingItemPath}, newItem:${newItemPath}\nbut existingItem didn't actually exist`)
        } else {
            const parentOfNewItem = FileSystem.parentPath(newItemPath)
            await FileSystem.ensureIsFolder(parentOfNewItem, {overwrite, renameExtension})
            const hardPathToNewItem = `${await FileSystem.makeHardPathTo(parentOfNewItem)}/${FileSystem.basename(newItemPath)}`
            const hardPathToExistingItem = await FileSystem.makeHardPathTo(existingItemPath)
            const pathFromNewToExisting = Path.relative(hardPathToNewItem, hardPathToExistingItem).replace(/^\.\.\//,"") // all paths should have the "../" at the begining
            if (force) {
                FileSystem.sync.clearAPathFor(hardPathToNewItem, {overwrite, renameExtension})
            }
            return Deno.symlink(
                pathFromNewToExisting,
                hardPathToNewItem,
            )
        }
    },
    async absoluteLink({existingItem, newItem, force=true, allowNonExistingTarget=false, overwrite=false, renameExtension=null, }) {
        existingItem = (existingItem.path || existingItem).replace(/\/+$/, "") // remove trailing slash, because it can screw stuff up
        const newItemPath = FileSystem.normalizePath(newItem.path || newItem).replace(/\/+$/, "") // if given PathInfo object
        
        const existingItemDoesntExist = (await Deno.lstat(existingItem).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (!allowNonExistingTarget && existingItemDoesntExist) {
            throw Error(`\nTried to create a relativeLink between existingItem:${existingItem}, newItemPath:${newItemPath}\nbut existingItem didn't actually exist`)
        } else {
            const parentOfNewItem = FileSystem.parentPath(newItemPath)
            await FileSystem.ensureIsFolder(parentOfNewItem, {overwrite, renameExtension})
            const hardPathToNewItem = `${await FileSystem.makeHardPathTo(parentOfNewItem)}/${FileSystem.basename(newItemPath)}`
            if (force) {
                FileSystem.sync.clearAPathFor(hardPathToNewItem, {overwrite, renameExtension})
            }
            
            return Deno.symlink(
                FileSystem.makeAbsolutePath(existingItem), 
                newItemPath,
            )
        }
    },
    async hardLink({existingItem, newItem, force=true, overwrite=false, renameExtension=null, hardLink=false}) {
        existingItem = (existingItem.path || existingItem).replace(/\/+$/, "") // remove trailing slash, because it can screw stuff up
        const newItemPath = FileSystem.normalizePath(newItem.path || newItem).replace(/\/+$/, "") // if given PathInfo object
        
        const existingItemDoesntExist = (await Deno.lstat(existingItem).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (existingItemDoesntExist) {
            throw Error(`\nTried to create a relativeLink between existingItem:${existingItem}, newItemPath:${newItemPath}\nbut existingItem didn't actually exist`)
        } else {
            const parentOfNewItem = FileSystem.parentPath(newItemPath)
            await FileSystem.ensureIsFolder(parentOfNewItem, {overwrite, renameExtension})
            if (force) {
                FileSystem.sync.clearAPathFor(newItem, {overwrite, renameExtension})
            }
            
            return Deno.link(
                FileSystem.makeAbsolutePath(existingItem), 
                newItemPath,
            )
        }
    },
    async * iterateBasenamesIn(pathOrFileInfo){
        const info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        // if file or doesnt exist
        if (info.isFolder) {
            for await (const dirEntry of Deno.readDir(info.path)) {
                yield dirEntry.name
            }
        }
    },
    listBasenamesIn(pathOrFileInfo) {
        return asyncIteratorToList(FileSystem.iterateBasenamesIn(pathOrFileInfo))
    },
    async * iteratePathsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, dontFollowSymlinks: false, dontReturnSymlinks: false, maxDepthFromRoot: null }) {
        let info
        try {
            info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        } catch (error) {
            if (!error.message.match(/^PermissionDenied:/)) {
                throw error
            }
        }
        const path = info.path
        const startingDepth = FileSystem.makeAbsolutePath(path).split("/").length-1
        options.recursively = options.recursively == false && options.maxDepth == 1 ? false : options.recursively
        if (options.maxDepthFromRoot == null) {
            options.maxDepthFromRoot = Infinity
        }
        if (options.maxDepth != Infinity && options.maxDepth != null) {
            options.maxDepthFromRoot = startingDepth+options.maxDepth
        }
        options.maxDepth = null // done for recursive calles
        if (startingDepth < options.maxDepthFromRoot) {
            if (!options.recursively) {
                // if its a file or if doesnt exist
                if (info.isFolder) {
                    // no filter
                    if (!options.shouldntInclude) {
                        for await (const each of Deno.readDir(path)) {
                            if (options.dontReturnSymlinks && each.isSymlink) {
                                continue
                            }
                            yield Path.join(path, each.name)
                        }
                    // filter
                    } else {
                        const shouldntInclude = options.shouldntInclude
                        for await (const each of Deno.readDir(path)) {
                            const eachPath = Path.join(path, each.name)
                            if (options.dontReturnSymlinks && each.isSymlink) {
                                continue
                            }
                            // 
                            // add the path
                            // 
                            const shouldntIncludeThis = shouldntInclude && await shouldntInclude(eachPath)
                            if (!shouldntIncludeThis) {
                                yield eachPath
                            }
                        }
                    }
                }
            } else {
                // merge defaults
                options = { exclude: new Set(), searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
                options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
                const { shouldntExplore, shouldntInclude } = options
                // check args
                if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
                    throw Error(`when calling FileSystem.iterateItemsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
                }
                const useBreadthFirstSearch = options.searchOrder == 'breadthFirstSearch'
                const shouldntExploreThis = shouldntExplore && await shouldntExplore(info.path, info)
                if (!shouldntExploreThis && info.isFolder) {
                    options.exclude = options.exclude instanceof Set ? options.exclude : new Set(options.exclude)

                    // note: exclude includes already-searched paths in the recursive case
                    if (!options.exclude.has(path)) {
                        const followSymlinks = !options.dontFollowSymlinks
                        const absolutePathVersion = FileSystem.makeAbsolutePath(path)
                        options.exclude.add(absolutePathVersion)
                        const searchAfterwords = []
                        for await (const entry of Deno.readDir(path)) {
                            const eachPath = Path.join(path, entry.name)
                            if (options.dontReturnSymlinks && each.isSymlink) {
                                continue
                            }

                            // 
                            // add the path
                            // 
                            const shouldntIncludeThis = shouldntInclude && await shouldntInclude(eachPath)
                            if (!shouldntIncludeThis) {
                                yield eachPath
                            }
                            
                            // 
                            // schedule children
                            // 
                            
                            // skip files
                            const isNormalFileHardlink = entry.isFile
                            const isWeirdItem = !entry.isDirectory && !isNormalFileHardlink && !entry.isSymlink
                            if (isNormalFileHardlink || isWeirdItem) {
                                continue
                            }
                            // skip symlink-ed files (but not symlinked folders)
                            if (followSymlinks && !entry.isDirectory) {
                                let isSymlinkToDirectory = false
                                // must be a symlink
                                try {
                                    isSymlinkToDirectory = (await Deno.stat(eachPath)).isDirectory
                                } catch (error) {}
                                
                                // if not a directory, skip
                                if (!isSymlinkToDirectory) {
                                    continue
                                }
                            }
                            
                            // then actually schedule children
                            if (useBreadthFirstSearch) {
                                searchAfterwords.push(eachPath)
                            } else {
                                // yield* doesn't seem to work for async iterators
                                for await (const eachSubPath of FileSystem.iteratePathsIn(eachPath, options)) {
                                    // shouldntInclude would already have been executed by ^ so dont re-check
                                    yield eachSubPath
                                }
                            }
                        }
                        // BFS
                        options.recursively = false
                        while (searchAfterwords.length > 0) {
                            const next = searchAfterwords.shift()
                            // "yield*" doesn't seem to work for async iterators
                            for await (const eachSubPath of FileSystem.iteratePathsIn(next, options)) {
                                // shouldntInclude would already have been executed by ^ so dont re-check
                                yield eachSubPath
                                searchAfterwords.push(eachSubPath)
                            }
                        }
                    }
                }
            }
        }
    },
    listPathsIn(pathOrFileInfo, options){
        return asyncIteratorToList(FileSystem.iteratePathsIn(pathOrFileInfo, options))
    },
    async * iterateItemsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, }) {
        // merge defaults
        options = { exclude: new Set(), searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
        options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
        // maxDepth == 1 forces recursively to false
        options.recursively = options.recursively == false && options.maxDepth == 1 ? false : options.recursively
        const { shouldntExplore, shouldntInclude } = options
        // setup args
        const info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        const path = info.path
        // check args
        if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
            throw Error(`when calling FileSystem.iterateItemsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
        }
        const useBreadthFirstSearch = options.searchOrder == 'breadthFirstSearch'
        const shouldntExploreThis = shouldntExplore && await shouldntExplore(info)
        if (!shouldntExploreThis && options.maxDepth > 0 && info.isFolder) {
            options.exclude = options.exclude instanceof Set ? options.exclude : new Set(options.exclude)
            
            // note: exclude includes already-searched paths in the recursive case
            if (!options.exclude.has(path)) {
                const absolutePathVersion = FileSystem.makeAbsolutePath(path)
                options.exclude.add(absolutePathVersion)
                options.maxDepth -= 1
                
                const searchAfterwords = []
                for await (const entry of Deno.readDir(path)) {
                    const eachItem = await FileSystem.info(Path.join(path, entry.name))
                    // 
                    // add the item
                    // 
                    const shouldntIncludeThis = shouldntInclude && await shouldntInclude(eachItem)
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
                                for await (const eachSubPath of FileSystem.iterateItemsIn(eachItem, options)) {
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
                    for await (const eachSubItem of FileSystem.iterateItemsIn(next, options)) {
                        // shouldntInclude would already have been executed by ^ so dont re-check
                        yield eachSubItem
                        if (eachSubItem.isFolder) {
                            searchAfterwords.push(eachSubItem)
                        }
                    }
                }
            }
        }
    },
    async listItemsIn(pathOrFileInfo, options) {
        const outputPromises = []
        // loop+push so that the info lookup can happen in parallel instead of sequentially
        for await (const eachPath of FileSystem.iteratePathsIn(pathOrFileInfo, options)) {
            outputPromises.push(FileSystem.info(eachPath))
        }
        return Promise.all(outputPromises)
    },
    // includes symlinks if they link to files and pipes
    async listFileItemsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        const { treatAllSymlinksAsFiles } = {treatAllSymlinksAsFiles:false, ...options}
        const items = await FileSystem.listItemsIn(pathOrFileInfo, options)
        if (treatAllSymlinksAsFiles) {
            return items.filter(eachItem=>(eachItem.isFile || eachItem.isSymlink))
        } else {
            return items.filter(eachItem=>eachItem.isFile)
        }
    },
    async listFilePathsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        return (await FileSystem.listFileItemsIn(pathOrFileInfo, options)).map(each=>each.path)
    },
    async listFileBasenamesIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        return (await FileSystem.listFileItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
    },
    async listFolderItemsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        const { ignoreSymlinks } = {ignoreSymlinks:false, ...options}
        const items = await FileSystem.listItemsIn(pathOrFileInfo, options)
        if (ignoreSymlinks) {
            return items.filter(eachItem=>(eachItem.isFolder && !eachItem.isSymlink))
        } else {
            return items.filter(eachItem=>eachItem.isFolder)
        }
    },
    async listFolderPathsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        return (await FileSystem.listFolderItemsIn(pathOrFileInfo, options)).map(each=>each.path)
    },
    async listFolderBasenamesIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        return (await FileSystem.listFolderItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
    },
    recursivelyIterateItemsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
        options.recursively = true
        // convert shorthand option to shouldntInclude
        if (options.onlyHardlinks) {
            if (options.shouldntInclude) {
                const originalshouldntInclude = options.shouldntInclude
                options.shouldntInclude = (each)=>each.isSymlink||originalshouldntInclude(each)
            } else {
                options.shouldntInclude = (each)=>each.isSymlink
            }
        }
        // convert shorthand option to shouldntExplore
        if (options.dontFollowSymlinks) {
            if (options.shouldntExplore) {
                const originalShouldntExplore = options.shouldntInclude
                options.shouldntExplore = (each)=>each.isSymlink||originalShouldntExplore(each)
            } else {
                options.shouldntExplore = (each)=>each.isSymlink
            }
        }
        return FileSystem.iterateItemsIn(pathOrFileInfo, options)
    },
    recursivelyIteratePathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
        options.recursively = true
        // convert shorthand option to shouldntInclude
        if (options.onlyHardlinks) {
            if (options.shouldntInclude) {
                const originalshouldntInclude = options.shouldntInclude
                options.shouldntInclude = (each)=>each.isSymlink||originalshouldntInclude(each)
            } else {
                options.shouldntInclude = (each)=>each.isSymlink
            }
        }
        return FileSystem.iteratePathsIn(pathOrFileInfo, options)
    },
    recursivelyListPathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
        return asyncIteratorToList(FileSystem.recursivelyIteratePathsIn(pathOrFileInfo, options))
    },
    recursivelyListItemsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
        return asyncIteratorToList(FileSystem.recursivelyIterateItemsIn(pathOrFileInfo, options))
    },
    async * globIterator(pattern, options={startPath:null, returnFullPaths: false}) {
        pattern = FileSystem.normalizePath(pattern)
        var { startPath, ...iteratePathsOptions } = options
        startPath = startPath || "./"
        const originalStartPath = startPath
        const firstGlob = pattern.match(/[\[\*\{\?]/)
        let extendedStartPath = startPath
        if (firstGlob) {
            const startingString = pattern.slice(0,firstGlob.index)
            const furthestConstantSlash = startingString.lastIndexOf("/")
            if (furthestConstantSlash != -1) {
                if (pattern[0] == "/") {
                    extendedStartPath = pattern.slice(0, furthestConstantSlash)
                } else {
                    extendedStartPath = `${extendedStartPath}/${pattern.slice(0, furthestConstantSlash)}`
                }
            }
            pattern = pattern.slice(furthestConstantSlash+1, )
        }
        extendedStartPath = FileSystem.makeAbsolutePath(extendedStartPath)
        
        let maxDepthFromRoot
        if (pattern.match(/\*\*/)) {
            maxDepthFromRoot = Infinity
        } else {
            maxDepthFromRoot = `${extendedStartPath}/${pattern}`.split("/").length-1
        }
        
        const fullPattern = `${escapeGlob(extendedStartPath)}/${pattern}`
        const regex = globToRegExp(fullPattern)
        const partials = fullPattern.split("/")
        let partialPattern = partials.shift()
        let partialRegexString = `^\\.$|${globToRegExp(partialPattern||"/").source}`
        for (const each of partials) {
            partialPattern += "/" + each
            partialRegexString += "|" + globToRegExp(partialPattern).source
        }
        const partialRegex = new RegExp(partialRegexString)
        for await (const eachPath of FileSystem.iteratePathsIn(extendedStartPath, { recursively: true, maxDepthFromRoot, ...iteratePathsOptions, shouldntExplore: (eachInnerPath) => !eachInnerPath.match(partialRegex) })) {
            if (eachPath.match(regex) || FileSystem.makeAbsolutePath(eachPath).match(regex)) {
                if (options.returnFullPaths) {
                    yield eachPath
                } else {
                    yield FileSystem.makeRelativePath({
                        from: originalStartPath,
                        to: eachPath,
                    })
                }
            }
        }
    },
    glob(pattern, options={startPath:null}) {
        return asyncIteratorToList(FileSystem.globIterator(pattern, options))
    },
    async getPermissions(path) {
        const {mode} = await Deno.lstat(path?.path||path)
        // see: https://stackoverflow.com/questions/15055634/understanding-and-decoding-the-file-mode-value-from-stat-function-output#15059931
        return {
            owner: {        //          rwxrwxrwx
                canRead:    !!(0b0000000100000000 & mode),
                canWrite:   !!(0b0000000010000000 & mode),
                canExecute: !!(0b0000000001000000 & mode),
            },
            group: {
                canRead:    !!(0b0000000000100000 & mode),
                canWrite:   !!(0b0000000000010000 & mode),
                canExecute: !!(0b0000000000001000 & mode),
            },
            others: {
                canRead:    !!(0b0000000000000100 & mode),
                canWrite:   !!(0b0000000000000010 & mode),
                canExecute: !!(0b0000000000000001 & mode),
            },
        }
    },
    /**
    * Add/set file permissions
    *
    * @param {String} args.path - 
    * @param {Object|Boolean} args.recursively - 
    * @param {Object} args.permissions - 
    * @param {Object} args.permissions.owner - 
    * @param {Boolean} args.permissions.owner.canRead - 
    * @param {Boolean} args.permissions.owner.canWrite - 
    * @param {Boolean} args.permissions.owner.canExecute - 
    * @param {Object} args.permissions.group - 
    * @param {Boolean} args.permissions.group.canRead - 
    * @param {Boolean} args.permissions.group.canWrite - 
    * @param {Boolean} args.permissions.group.canExecute - 
    * @param {Object} args.permissions.others - 
    * @param {Boolean} args.permissions.others.canRead - 
    * @param {Boolean} args.permissions.others.canWrite - 
    * @param {Boolean} args.permissions.others.canExecute - 
    * @return {null} 
    *
    * @example
    * ```js
    *  await FileSystem.addPermissions({
    *      path: fileOrFolderPath,
    *      permissions: {
    *          owner: {
    *              canExecute: true,
    *          },
    *      }
    *  })
    * ```
    */
    async addPermissions({path, permissions={owner:{}, group:{}, others:{}}, recursively=false}) {
        // just ensure the names exist
        permissions = { owner:{}, group:{}, others:{}, ...permissions }
        let permissionNumber = 0b000000000
        let fileInfo
        // if not all permissions are specified, go get the existing permissions
        if ([permissions.owner, permissions.group, permissions.others].some(each=>(!each)||Object.keys(each).length!=3)) {
            fileInfo = await FileSystem.info(path)
            // just grab the last 9 binary digits of the mode number. See: https://stackoverflow.com/questions/15055634/understanding-and-decoding-the-file-mode-value-from-stat-function-output#15059931
            permissionNumber = fileInfo.lstat.mode & 0b0000000111111111
        }

        // 
        // set bits for the corrisponding permissions
        // 
        if (permissions.owner.canRead     != null ) {  permissionNumber = (permissions.owner.canRead)      ? setTrueBit(permissionNumber, 8) : setFalseBit(permissionNumber, 8) }
        if (permissions.owner.canWrite    != null ) {  permissionNumber = (permissions.owner.canWrite)     ? setTrueBit(permissionNumber, 7) : setFalseBit(permissionNumber, 7) }
        if (permissions.owner.canExecute  != null ) {  permissionNumber = (permissions.owner.canExecute)   ? setTrueBit(permissionNumber, 6) : setFalseBit(permissionNumber, 6) }
        if (permissions.group.canRead     != null ) {  permissionNumber = (permissions.group.canRead)      ? setTrueBit(permissionNumber, 5) : setFalseBit(permissionNumber, 5) }
        if (permissions.group.canWrite    != null ) {  permissionNumber = (permissions.group.canWrite)     ? setTrueBit(permissionNumber, 4) : setFalseBit(permissionNumber, 4) }
        if (permissions.group.canExecute  != null ) {  permissionNumber = (permissions.group.canExecute)   ? setTrueBit(permissionNumber, 3) : setFalseBit(permissionNumber, 3) }
        if (permissions.others.canRead    != null ) {  permissionNumber = (permissions.others.canRead)     ? setTrueBit(permissionNumber, 2) : setFalseBit(permissionNumber, 2) }
        if (permissions.others.canWrite   != null ) {  permissionNumber = (permissions.others.canWrite)    ? setTrueBit(permissionNumber, 1) : setFalseBit(permissionNumber, 1) }
        if (permissions.others.canExecute != null ) {  permissionNumber = (permissions.others.canExecute)  ? setTrueBit(permissionNumber, 0) : setFalseBit(permissionNumber, 0) }
        
        // 
        // actually set the permissions
        // 
        if (
            !recursively
            || (
                // init fileInfo if doesnt exist
                (fileInfo || (fileInfo=await FileSystem.info(path)))
                && 
                !fileInfo.isDirectory
            )
        ) {
            return Deno.chmod(path?.path || path, permissionNumber)
        } else {
            const promises = []
            const paths = await FileSystem.recursivelyListPathsIn(path, {onlyHardlinks: false, dontFollowSymlinks: false, ...recursively})
            // schedule all of them asyncly
            for (const eachPath of paths) {
                promises.push(
                    Deno.chmod(eachPath, permissionNumber).catch(console.error)
                )
            }
            // create a promise to then wait on all of them
            return Promise.all(promises)
        }
    },
    // alias
    setPermissions(...args) { return FileSystem.addPermissions(...args) },
    async write({path, data, force=true, overwrite=false, renameExtension=null}) {
        path = pathStandardize(path)
        await grabPathLock(path)
        if (force) {
            FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension, })
            const info = FileSystem.sync.info(path)
            if (info.isDirectory) {
                FileSystem.sync.remove(path)
            }
        }
        let output
        if (typeof data == 'string') {
            output = await Deno.writeTextFile(path, data)
        } else if (typedArrayClasses.some(dataClass=>(data instanceof dataClass))) {
            output = await Deno.writeFile(path, data)
        // incremental data
        } else if (isGeneratorType(data) || data[Symbol.iterator] || data[Symbol.asyncIterator]) {
            const file = await Deno.open(path, {read:true, write: true, create: true, truncate: true})
            const encoder = new TextEncoder()
            const encode = encoder.encode.bind(encoder)
            try {
                let index = 0
                for await (let packet of data) {
                    if (typeof packet == 'string') {
                        packet = encode(packet)
                    }
                    await Deno.write(file.rid, packet)
                }
            } finally {
                Deno.close(file.rid)
            }
        }
        delete locker[path]
        return output
    },
    async append({path, data, force=true, overwrite=false, renameExtension=null}) {
        path = pathStandardize(path)
        await grabPathLock(path)
        if (force) {
            FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension })
            const info = FileSystem.sync.info(path)
            if (info.isDirectory) {
                FileSystem.sync.remove(path)
            }
        }
        // convert string to bytes
        if (typeof data == 'string') {
            data = new TextEncoder().encode(data)
        }
        // using the async version and awaiting HAS PROBLEMS
        // on 1.42.1 (e.g. 2024) it creates a race condition, where reading file immediately after says "no such file"
        // so we have to use the sync version isntead
        // in fact, this problem might exist for other API's as well but has not been found yet
        const file = Deno.openSync(path, {read:true, write: true, create: true})
        file.seekSync(0, Deno.SeekMode.End)
        file.writeSync(data)
        // TODO: consider the possibility of this same file already being open somewhere else in the program, address/test how that might lead to problems
        file.close()
        delete locker[path]
    },
    async makeHardPathTo(path, options={}) {
        var { cache } = { cache:{}, ...options}
        if (cache[path]) {
            return cache[path]
        }
        // on hardpaths, there are no symbolically linked parent folders, and the path is (must be) absolute
        const [ folders, name, extension ] = FileSystem.pathPieces(FileSystem.makeAbsolutePath(path))
        let topDownPath = ``
        for (const eachFolderName of folders) {
            topDownPath += `/${eachFolderName}`
            if (cache[topDownPath]) {
                topDownPath = cache[topDownPath]
                continue
            }
            const unchangedPath = topDownPath
            const info = await FileSystem.info(topDownPath)
            if (info.isSymlink) {
                const absolutePathToIntermediate = await FileSystem.finalTargetOf(info.path, {_parentsHaveBeenChecked: true, cache })
                // shouldn't be true/possible outside of a race condition, but good to handle it anyways
                if (absolutePathToIntermediate == null) {
                    return null
                }
                // remove the path to the syslink parent folder + the slash
                topDownPath = topDownPath.slice(0, -(eachFolderName.length+1))

                const relativePath = FileSystem.makeRelativePath({
                    from: topDownPath,
                    to: absolutePathToIntermediate,
                })
                // replace it with the real intermediate path
                topDownPath += `/${relativePath}`
                topDownPath = Path.normalize(topDownPath)
            }
            cache[unchangedPath] = topDownPath
        }
        const hardPath = Path.normalize(`${topDownPath}/${name}${extension}`)
        cache[path] = hardPath
        
        // now all parents are verified as real folders 
        return hardPath
    },
    async walkUpImport(path, start) {
        const startPath = start || FileSystem.pathOfCaller(1)
        const nearestPath = await FileSystem.walkUpUntil(path, startPath)
        if (nearestPath) {
            const absolutePath = FileSystem.makeAbsolutePath(`${nearestPath}/${path}`)
            return import(Path.toFileUrl(absolutePath).href)
        } else {
            throw Error(`Tried to walkUpImport ${path}, starting at ${startPath}, but was unable to find any files`)
        }
    },
    async withPwd(tempPwd,func) {
        const originalPwd = FileSystem.pwd
        const originalPwdEnvVar = Deno.env.get("PWD")
        tempPwd = FileSystem.makeAbsolutePath(tempPwd)
        try {
            FileSystem.pwd = tempPwd
            Deno.env.set("PWD",tempPwd)
            await func(originalPwd)
        } finally {
            FileSystem.pwd = originalPwd
            Deno.env.set("PWD",originalPwdEnvVar)
        }
    },
    parentOfAllPaths(paths) {
        let parentPaths = []
        if (!paths.every(FileSystem.isRelativePath)) {
            paths = paths.map(FileSystem.makeAbsolutePath)
        }
        for (let eachPath of paths) {
            const [ folders, itemName, itemExtensionWithDot ] = FileSystem.pathPieces(eachPath)
            parentPaths.push(folders.join("/")+"/") // standardizes windows/unix
        }
        let possiblyBrokenPath = commonPrefix(parentPaths)
        // edgecase: /b/aaa/ and /b/aaab/ both have common prefix "/b/aaa" but the parent of both are "/b/"
        if (!possiblyBrokenPath.endsWith("/")) {
            possiblyBrokenPath = possiblyBrokenPath.split("/").slice(0,-1).join("/")+"/"
        }
        return FileSystem.normalizePath(possiblyBrokenPath)
    },
    sync: {
        // things that are already sync
        get parentPath()        { return FileSystem.parentPath       },
        get dirname()           { return FileSystem.dirname          },
        get basename()          { return FileSystem.basename         },
        get extname()           { return FileSystem.extname          },
        get join()              { return FileSystem.join             },
        get thisFile()          { return FileSystem.thisFile         },
        get pureNameOf()        { return pathPureName                },
        get thisFolder()        { return FileSystem.thisFolder       },
        get normalize()         { return FileSystem.normalizePath    },
        get isAbsolutePath()    { return FileSystem.isAbsolutePath   },
        get isRelativePath()    { return FileSystem.isRelativePath   },
        get makeRelativePath()  { return FileSystem.makeRelativePath },
        get makeAbsolutePath()  { return FileSystem.makeAbsolutePath },
        get pathDepth()         { return FileSystem.pathDepth        },
        get pathPieces()        { return FileSystem.pathPieces       },
        get extendName()        { return FileSystem.extendName       },
        get allParentPaths()    { return FileSystem.allParentPaths   },
        get pathOfCaller()      { return FileSystem.pathOfCaller     },
        get home()              { return FileSystem.home             },
        get workingDirectory()  { return FileSystem.workingDirectory },
        get cwd()               { return FileSystem.cwd              },
        get pwd()               { return FileSystem.pwd              },
        get cd()                { return FileSystem.cd               },
        get changeDirectory()   { return FileSystem.changeDirectory  },
        set workingDirectory(value) { return FileSystem.workingDirectory = value },
        set cwd(value)              { return FileSystem.workingDirectory = value },
        set pwd(value)              { return FileSystem.workingDirectory = value },
        info(fileOrFolderPath, _cachedLstat=null) {
            // compute lstat and stat before creating PathInfo (so its async for performance)
            let lstat = _cachedLstat
            try {
                lstat = Deno.lstatSync(fileOrFolderPath)
            } catch (error) {
                lstat = {doesntExist: true}
            }

            let stat = {}
            if (!lstat.isSymlink) {
                stat = {
                    isBrokenLink: false,
                    isLoopOfLinks: false,
                }
            // if symlink
            } else {
                try {
                    stat = Deno.statSync(fileOrFolderPath)
                } catch (error) {
                    if (error.message.match(/^Too many levels of symbolic links/)) {
                        stat.isBrokenLink = true
                        stat.isLoopOfLinks = true
                    } else if (error.message.match(/^No such file or directory/)) {
                        stat.isBrokenLink = true
                    } else {
                        // probably a permission error
                        // TODO: improve how this is handled
                        throw error
                    }
                }
            }
            return new PathInfo({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
        },
        read(path) {
            path = pathStandardize(path)
            let output
            try {
                output = Deno.readTextFileSync(path)
            } catch (error) {
            }
            return output
        },
        readBytes(path) {
            path = pathStandardize(path)
            let output
            try {
                output = Deno.readFileSync(path)
            } catch (error) {
            }
            return output
        },
        * readLinesIteratively(path) {
            path = pathStandardize(path)
            const file = Deno.openSync(path)
            try {
                yield* readLines(file)
            } finally {
                Deno.close(file.rid)
            }
        },
        /**
         * find a root folder based on a child path
         *
         * @example
         * ```js
         *     import { FileSystem } from "https://deno.land/x/quickr/main/file_system.js"
         * 
         *     var gitParentFolderOrNull = FileSystem.sync.walkUpUntil(".git")
         *     var gitParentFolderOrNull = FileSystem.sync.walkUpUntil({
         *         subPath:".git",
         *         startPath: FileSystem.pwd,
         *     })
         *
         *     // below will result in that^ same folder (assuming all your .git folders have config files)
         *     var gitParentFolderOrNull = FileSystem.sync.walkUpUntil(".git/config")
         * 
         *     // below will result in the same folder, but only if theres a local master branch
         *     var gitParentFolderOrNull = FileSystem.sync.walkUpUntil(".git/refs/heads/master")
         *```
         */
        walkUpUntil(subPath, startPath=null) {
            subPath = subPath instanceof PathInfo ? subPath.path : subPath
            // named arguments
            if (subPath instanceof Object) {
                var {subPath, startPath} = subPath
            }
            let here
            if (!startPath) {
                here = Deno.cwd()
            } else if (Path.isAbsolute(startPath)) {
                here = startPath
            } else {
                here = Path.join(here, startPath)
            }
            while (1) {
                let checkPath = Path.join(here, subPath)
                const pathInfo = Deno.lstatSync(checkPath).catch(()=>({doesntExist: true}))
                if (!pathInfo.doesntExist) {
                    return here
                }
                // reached the top
                if (here == Path.dirname(here)) {
                    return null
                } else {
                    // go up a folder
                    here =  Path.dirname(here)
                }
            }
        },
        nextTargetOf(path, options={}) {
            const originalWasItem = path instanceof PathInfo
            const item = originalWasItem ? path : new PathInfo({path})
            const lstat = item.lstat
            if (lstat.isSymlink) {
                const relativeOrAbsolutePath = Deno.readLinkSync(item.path)
                if (Path.isAbsolute(relativeOrAbsolutePath)) {
                    if (originalWasItem) {
                        return new PathInfo({path:relativeOrAbsolutePath})
                    } else {
                        return relativeOrAbsolutePath
                    }
                } else {
                    const path = `${FileSystem.sync.makeHardPathTo(Path.dirname(item.path))}/${relativeOrAbsolutePath}`
                    if (originalWasItem) {
                        return new PathInfo({path})
                    } else {
                        return path
                    }
                }
            } else {
                if (originalWasItem) {
                    return item
                } else {
                    return item.path
                }
            }
        },
        finalTargetOf(path, options={}) {
            const { _parentsHaveBeenChecked, cache } = { _parentsHaveBeenChecked: false , cache: {}, ...options }
            const originalWasItem = path instanceof PathInfo
            path = (path.path || path) // if given PathInfo object
            let result = Deno.lstatSync(path).catch(()=>({doesntExist: true}))
            if (result.doesntExist) {
                return null
            }
        
            // 
            // naively follow the path chain to build up a full chain
            // 
            path = FileSystem.sync.makeHardPathTo(path, {cache})
            const pathChain = []
            while (result.isSymlink) {
                // get the path to the target
                const relativeOrAbsolutePath = Deno.readLinkSync(path)
                if (Path.isAbsolute(relativeOrAbsolutePath)) {
                    // absolute
                    path = relativeOrAbsolutePath
                } else {
                    // relative
                    path = `${FileSystem.parentPath(path)}/${relativeOrAbsolutePath}`
                }
                result = Deno.lstatSync(path).catch(()=>({doesntExist: true}))
                // check if target exists
                if (result.doesntExist) {
                    return null
                }
                // regardless of if absolute or relative, we need to re-harden
                path = FileSystem.sync.makeHardPathTo(path, {cache})
                if (pathChain.includes(path)) {
                    // circular loop of links
                    return null
                }
                pathChain.push(path)
            }

            path = FileSystem.normalizePath(path)
            if (originalWasItem) {
                return new PathInfo({path})
            } else {
                return path
            }
        },
        makeHardPathTo(path, options={}) {
            var { cache } = { cache:{}, ...options}
            if (cache[path]) {
                return cache[path]
            }
            // on hardpaths, there are no symbolically linked parent folders, and the path is (must be) absolute
            const [ folders, name, extension ] = FileSystem.pathPieces(FileSystem.makeAbsolutePath(path))
            let topDownPath = ``
            for (const eachFolderName of folders) {
                topDownPath += `/${eachFolderName}`
                if (cache[topDownPath]) {
                    topDownPath = cache[topDownPath]
                    continue
                }
                const unchangedPath = topDownPath
                const info = FileSystem.sync.info(topDownPath)
                if (info.isSymlink) {
                    const absolutePathToIntermediate = FileSystem.sync.finalTargetOf(info.path, {_parentsHaveBeenChecked: true, cache })
                    // shouldn't be true/possible outside of a race condition, but good to handle it anyways
                    if (absolutePathToIntermediate == null) {
                        return null
                    }
                    // remove the path to the syslink parent folder + the slash
                    topDownPath = topDownPath.slice(0, -(eachFolderName.length+1))

                    const relativePath = FileSystem.makeRelativePath({
                        from: topDownPath,
                        to: absolutePathToIntermediate,
                    })
                    // replace it with the real intermediate path
                    topDownPath += `/${relativePath}`
                    topDownPath = Path.normalize(topDownPath)
                }
                cache[unchangedPath] = topDownPath
            }
            const hardPath = Path.normalize(`${topDownPath}/${name}${extension}`)
            cache[path] = hardPath
            
            // now all parents are verified as real folders 
            return hardPath
        },
        remove(fileOrFolder) {
            fileOrFolder = pathStandardize(fileOrFolder)
            if (fileOrFolder instanceof Array) {
                return fileOrFolder.map(FileSystem.sync.remove)
            }
            let exists = false
            let item
            try {
                item = Deno.lstatSync(fileOrFolder)
                exists = true
            } catch (error) {}
            if (exists) {
                // this is a weird check because isFile,isDirectory,isSymlink can all be false at the same time
                // basical all false=wierd file (pipe, socket, etc), we still want to remove it
                if (item.isFile || item.isSymlink || !item.isDirectory)) {
                    return Deno.removeSync(fileOrFolder.replace(/\/+$/,""))
                } else {
                    return Deno.removeSync(fileOrFolder.replace(/\/+$/,""), {recursive: true})
                }
            }
        },
        moveOutOfTheWay(path, options={extension:null}) {
            path = pathStandardize(path)
            const extension = options?.extension || FileSystem.defaultRenameExtension
            const info = FileSystem.sync.info(path)
            if (info.exists) {
                // make sure nothing is using the new-name I just picked
                const newPath = path+extension
                FileSystem.sync.moveOutOfTheWay(newPath, {extension})
                moveAndRenameSync(path, newPath)
            }
        },
        ensureIsFolder(path, options={overwrite:false, renameExtension:null}) {
            path = pathStandardize(path)
            const {overwrite, renameExtension} = defaultOptionsHelper(options)
            path = path.path || path // if given PathInfo object
            path = FileSystem.makeAbsolutePath(path)
            const parentPath = Path.dirname(path)
            // root is always a folder
            if (parentPath == path) {
                return
            } 
            // make sure parent is a folder
            const parent = FileSystem.sync.info(parentPath)
            if (!parent.isDirectory) {
                FileSystem.sync.ensureIsFolder(parentPath, {overwrite, renameExtension})
            }
            
            // delete files in the way
            let pathInfo = FileSystem.sync.info(path)
            if (pathInfo.exists && !pathInfo.isDirectory) {
                if (overwrite) {
                    FileSystem.sync.remove(path)
                } else {
                    FileSystem.sync.moveOutOfTheWay(path, {extension:renameExtension})
                }
            }
            
            Deno.mkdirSync(path, { recursive: true })
            // finally create the folder
            return path
        },
        ensureIsFile(path, options={overwrite:false, renameExtension:null}) {
            const {overwrite, renameExtension} = defaultOptionsHelper(options)
            FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), {overwrite, renameExtension})

            path = path.path || path // if given PathInfo object
            const pathInfo = FileSystem.sync.info(path)
            if (pathInfo.isFile && !pathInfo.isDirectory) { // true for symbolic links to non-directories
                return path
            } else {
                FileSystem.sync.write({path, data:""}) // this will clear everything out of the way
                return path
            }
        },
        /**
         * Move/Remove everything and Ensure parent folders
         *
         * @param path
         * @param options.overwrite - if false, then things in the way will be moved instead of deleted
         * @param options.extension - the string to append when renaming files to get them out of the way
         * 
         * @example
         * ```js
         *     FileSystem.sync.clearAPathFor("./something")
         * ```
         */
        clearAPathFor(path, options={overwrite:false, renameExtension:null}) {
            const {overwrite, renameExtension} = defaultOptionsHelper(options)
            const originalPath = path
            const paths = []
            while (Path.dirname(path) !== path) {
                paths.push(path)
                path = Path.dirname(path)
            }
            for (const eachPath of paths.reverse()) {
                const info = FileSystem.sync.info(eachPath)
                if (!info.exists) {
                    break
                } else if (info.isFile) {
                    if (overwrite) {
                        FileSystem.sync.remove(eachPath)
                    } else {
                        FileSystem.sync.moveOutOfTheWay(eachPath, {extension:renameExtension})
                    }
                }
            }
            Deno.mkdirSync(Path.dirname(originalPath), { recursive: true })
            return originalPath
        },
        append({path, data, force=true, overwrite=false, renameExtension=null}) {
            path = pathStandardize(path)
            if (force) {
                FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension })
                const info = FileSystem.sync.info(path)
                if (info.isDirectory) {
                    FileSystem.sync.remove(path)
                }
            }
            const file = Deno.openSync(path, {read:true, write: true, create: true})
            file.seekSync(0, Deno.SeekMode.End)
            // string
            if (typeof data == 'string') {
                file.writeSync(new TextEncoder().encode(data))
            // assuming bytes (maybe in the future, readables and pipes will be supported)
            } else {
                file.writeSync(data)
            }
            // TODO: consider the possibility of this same file already being open somewhere else in the program, address/test how that might lead to problems
            file.close()
        },
        write({path, data, force=true, overwrite=false, renameExtension=null}) {
            path = pathStandardize(path)
            if (force) {
                FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension, })
                const info = FileSystem.sync.info(path)
                if (info.isDirectory) {
                    FileSystem.sync.remove(path)
                }
            }
            let output
            if (typeof data == 'string') {
                output = Deno.writeTextFileSync(path, data)
            } else if (typedArrayClasses.some(dataClass=>(data instanceof dataClass))) {
                output = Deno.writeFileSync(path, data)
            // incremental data
            } else if (isGeneratorType(data) || data[Symbol.iterator] || data[Symbol.asyncIterator]) {
                const file = Deno.openSync(path, {read:true, write: true, create: true, truncate: true})
                const encoder = new TextEncoder()
                const encode = encoder.encode.bind(encoder)
                try {
                    let index = 0
                    for (let packet of data) {
                        if (typeof packet == 'string') {
                            packet = encode(packet)
                        }
                        Deno.writeSync(file.rid, packet)
                    }
                } finally {
                    Deno.close(file.rid)
                }
            }
            return output
        },
        absoluteLink({existingItem, newItem, force=true, allowNonExistingTarget=false, overwrite=false, renameExtension=null, }) {
            existingItem = (existingItem.path || existingItem).replace(/\/+$/, "") // remove trailing slash, because it can screw stuff up
            const newItemPath = FileSystem.normalizePath(newItem.path || newItem).replace(/\/+$/, "") // if given PathInfo object
            
            const existingItemDoesntExist = (Deno.lstatSync(existingItem).catch(()=>({doesntExist: true}))).doesntExist
            // if the item doesnt exists
            if (!allowNonExistingTarget && existingItemDoesntExist) {
                throw Error(`\nTried to create a relativeLink between existingItem:${existingItem}, newItemPath:${newItemPath}\nbut existingItem didn't actually exist`)
            } else {
                const parentOfNewItem = FileSystem.parentPath(newItemPath)
                FileSystem.sync.ensureIsFolder(parentOfNewItem, {overwrite, renameExtension})
                const hardPathToNewItem = `${FileSystem.syncmakeHardPathTo(parentOfNewItem)}/${FileSystem.basename(newItemPath)}`
                if (force) {
                    FileSystem.sync.clearAPathFor(hardPathToNewItem, {overwrite, renameExtension})
                }
                
                return Deno.symlinkSync(
                    FileSystem.makeAbsolutePath(existingItem), 
                    newItemPath,
                )
            }
        },
        relativeLink({existingItem, newItem, force=true, overwrite=false, allowNonExistingTarget=false, renameExtension=null }) {
            const existingItemPath = (existingItem.path || existingItem).replace(/\/+$/, "") // the replace is to remove trailing slashes, which will cause painful nonsensical errors if not done
            const newItemPath = FileSystem.normalizePath((newItem.path || newItem).replace(/\/+$/, "")) // if given PathInfo object
            
            const existingItemDoesntExist = (Deno.lstatSync(existingItemPath).catch(()=>({doesntExist: true}))).doesntExist
            // if the item doesnt exists
            if (!allowNonExistingTarget && existingItemDoesntExist) {
                throw Error(`\nTried to create a relativeLink between existingItem:${existingItemPath}, newItem:${newItemPath}\nbut existingItem didn't actually exist`)
            } else {
                const parentOfNewItem = FileSystem.parentPath(newItemPath)
                FileSystem.sync.ensureIsFolder(parentOfNewItem, {overwrite, renameExtension})
                const hardPathToNewItem = `${FileSystem.sync.makeHardPathTo(parentOfNewItem)}/${FileSystem.basename(newItemPath)}`
                const hardPathToExistingItem = FileSystem.sync.makeHardPathTo(existingItemPath)
                const pathFromNewToExisting = Path.relative(hardPathToNewItem, hardPathToExistingItem).replace(/^\.\.\//,"") // all paths should have the "../" at the begining
                if (force) {
                    FileSystem.sync.clearAPathFor(hardPathToNewItem, {overwrite, renameExtension})
                }
                return Deno.symlinkSync(
                    pathFromNewToExisting,
                    hardPathToNewItem,
                )
            }
        },
        move({ path, item, newParentFolder, newName, force=true, overwrite=false, renameExtension=null }) {
            item = item||path
            // force     => will MOVE other things out of the way until the job is done
            // overwrite => will DELETE things out of the way until the job is done 
            
            const oldPath = item.path || item
            const oldName = FileSystem.basename(oldPath)
            const pathInfo = item instanceof Object || FileSystem.sync.info(oldPath)
            const newPath = `${newParentFolder||FileSystem.parentPath(oldPath)}/${newName || oldName}`

            // if its a relative-linked item then the relative link will need to be adjusted after the move
            // todo: consider more about the broken link case (current .FileSystem.relativeLink() only works with linking to things that exist)
            if (pathInfo.isSymlink && !item.isBrokenLink) {
                const link = Deno.readLinkSync(pathInfo.path)
                if (!Path.isAbsolute(link)) {
                    const linkTargetBeforeMove = `${FileSystem.parentPath(pathInfo.path)}/${link}`
                    FileSystem.sync.relativeLink({
                        existingItem: linkTargetBeforeMove,
                        newItem: newPath,
                        force,
                        overwrite,
                        renameExtension,
                    })
                    // remove the original since it was "moved"
                    FileSystem.sync.remove(pathInfo)
                }
            }
            
            if (force) {
                FileSystem.sync.clearAPathFor(newPath, { overwrite, renameExtension })
            }
            return moveAndRenameSync(oldPath, newPath)
        },
        rename({ from, to, force=true, overwrite=false, renameExtension=null }) {
            // force     => will MOVE other things out of the way until the job is done
            // overwrite => will DELETE things out of the way until the job is done 
            return FileSystem.sync.move({ path: from, newParentFolder: FileSystem.parentPath(to), newName: FileSystem.basename(to), force, overwrite, renameExtension })
        },
        copy({from, to, preserveTimestamps=true, force=true, overwrite=false, renameExtension=null}) {
            const existingItemDoesntExist = (Deno.statSync(from).catch(()=>({doesntExist: true}))).doesntExist
            if (existingItemDoesntExist) {
                throw Error(`\nTried to copy from:${from}, to:${to}\nbut "from" didn't seem to exist\n\n`)
            }
            if (force) {
                FileSystem.sync.clearAPathFor(to, { overwrite, renameExtension })
            }
            return basicCopySync(from, to, {force, preserveTimestamps: true})
        },
        *iterateBasenamesIn(pathOrFileInfo){
            const info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : FileSystem.sync.info(pathOrFileInfo)
            // if file or doesnt exist
            if (info.isFolder) {
                for (const dirEntry of Deno.readDirSync(info.path)) {
                    yield dirEntry.name
                }
            }
        },
        listBasenamesIn(pathOrFileInfo) {
            return [...FileSystem.sync.iterateBasenamesIn(pathOrFileInfo)]
        },
        * iteratePathsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, dontFollowSymlinks: false, dontReturnSymlinks: false, maxDepthFromRoot: null }) {
            let info
            try {
                info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : FileSystem.sync.info(pathOrFileInfo)
            } catch (error) {
                if (!error.message.match(/^PermissionDenied:/)) {
                    throw error
                }
            }
            const path = info.path
            const startingDepth = FileSystem.makeAbsolutePath(path).split("/").length-1
            options.recursively = options.recursively == false && options.maxDepth == 1 ? false : options.recursively
            if (options.maxDepthFromRoot == null) {
                options.maxDepthFromRoot = Infinity
            }
            if (options.maxDepth != Infinity && options.maxDepth != null) {
                options.maxDepthFromRoot = startingDepth+options.maxDepth
            }
            options.maxDepth = null // done for recursive calles
            if (startingDepth < options.maxDepthFromRoot) {
                if (!options.recursively) {
                    // if its a file or if doesnt exist
                    if (info.isFolder) {
                        // no filter
                        if (!options.shouldntInclude) {
                            for (const each of Deno.readDirSync(path)) {
                                if (options.dontReturnSymlinks && each.isSymlink) {
                                    continue
                                }
                                yield Path.join(path, each.name)
                            }
                        // filter
                        } else {
                            const shouldntInclude = options.shouldntInclude
                            for (const each of Deno.readDirSync(path)) {
                                const eachPath = Path.join(path, each.name)
                                if (options.dontReturnSymlinks && each.isSymlink) {
                                    continue
                                }
                                // 
                                // add the path
                                // 
                                const shouldntIncludeThis = shouldntInclude && shouldntInclude(eachPath)
                                if (!shouldntIncludeThis) {
                                    yield eachPath
                                }
                            }
                        }
                    }
                } else {
                    // merge defaults
                    options = { exclude: new Set(), searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
                    options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
                    const { shouldntExplore, shouldntInclude } = options
                    // check args
                    if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
                        throw Error(`when calling FileSystem.sync.iterateItemsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
                    }
                    const useBreadthFirstSearch = options.searchOrder == 'breadthFirstSearch'
                    const shouldntExploreThis = shouldntExplore && shouldntExplore(info.path, info)
                    if (!shouldntExploreThis && info.isFolder) {
                        options.exclude = options.exclude instanceof Set ? options.exclude : new Set(options.exclude)

                        // note: exclude includes already-searched paths in the recursive case
                        if (!options.exclude.has(path)) {
                            const followSymlinks = !options.dontFollowSymlinks
                            const absolutePathVersion = FileSystem.makeAbsolutePath(path)
                            options.exclude.add(absolutePathVersion)
                            const searchAfterwords = []
                            for (const entry of Deno.readDirSync(path)) {
                                const eachPath = Path.join(path, entry.name)
                                if (options.dontReturnSymlinks && each.isSymlink) {
                                    continue
                                }

                                // 
                                // add the path
                                // 
                                const shouldntIncludeThis = shouldntInclude && shouldntInclude(eachPath)
                                if (!shouldntIncludeThis) {
                                    yield eachPath
                                }
                                
                                // 
                                // schedule children
                                // 
                                
                                // skip files
                                const isNormalFileHardlink = entry.isFile
                                const isWeirdItem = !entry.isDirectory && !isNormalFileHardlink && !entry.isSymlink
                                if (isNormalFileHardlink || isWeirdItem) {
                                    continue
                                }
                                // skip symlink-ed files (but not symlinked folders)
                                if (followSymlinks && !entry.isDirectory) {
                                    let isSymlinkToDirectory = false
                                    // must be a symlink
                                    try {
                                        isSymlinkToDirectory = (Deno.statSync(eachPath)).isDirectory
                                    } catch (error) {}
                                    
                                    // if not a directory, skip
                                    if (!isSymlinkToDirectory) {
                                        continue
                                    }
                                }
                                
                                // then actually schedule children
                                if (useBreadthFirstSearch) {
                                    searchAfterwords.push(eachPath)
                                } else {
                                    // yield* doesn't seem to work for async iterators
                                    for (const eachSubPath of FileSystem.sync.iteratePathsIn(eachPath, options)) {
                                        // shouldntInclude would already have been executed by ^ so dont re-check
                                        yield eachSubPath
                                    }
                                }
                            }
                            // BFS
                            options.recursively = false
                            while (searchAfterwords.length > 0) {
                                const next = searchAfterwords.shift()
                                // "yield*" doesn't seem to work for async iterators
                                for (const eachSubPath of FileSystem.sync.iteratePathsIn(next, options)) {
                                    // shouldntInclude would already have been executed by ^ so dont re-check
                                    yield eachSubPath
                                    searchAfterwords.push(eachSubPath)
                                }
                            }
                        }
                    }
                }
            }
        },
        listPathsIn(pathOrFileInfo, options){
            return [...FileSystem.sync.iteratePathsIn(pathOrFileInfo, options)]
        },
        * iterateItemsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, }) {
            // merge defaults
            options = { exclude: new Set(), searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
            options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
            // maxDepth == 1 forces recursively to false
            options.recursively = options.recursively == false && options.maxDepth == 1 ? false : options.recursively
            const { shouldntExplore, shouldntInclude } = options
            // setup args
            const info = pathOrFileInfo instanceof PathInfo ? pathOrFileInfo : FileSystem.sync.info(pathOrFileInfo)
            const path = info.path
            // check args
            if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
                throw Error(`when calling FileSystem.iterateItemsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
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
                        const eachItem = FileSystem.sync.info(Path.join(path, entry.name))
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
                                    for (const eachSubPath of FileSystem.sync.iterateItemsIn(eachItem, options)) {
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
                        for (const eachSubItem of FileSystem.sync.iterateItemsIn(next, options)) {
                            // shouldntInclude would already have been executed by ^ so dont re-check
                            yield eachSubItem
                            if (eachSubItem.isFolder) {
                                searchAfterwords.push(eachSubItem)
                            }
                        }
                    }
                }
            }
        },
        listItemsIn(pathOrFileInfo, options) {
            const output = []
            for (const eachPath of FileSystem.sync.iteratePathsIn(pathOrFileInfo, options)) {
                output.push(FileSystem.sync.info(eachPath))
            }
            return output
        },
        // includes symlinks if they link to files and pipes
        listFileItemsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
            const { treatAllSymlinksAsFiles } = {treatAllSymlinksAsFiles:false, ...options}
            const items = FileSystem.sync.listItemsIn(pathOrFileInfo, options)
            if (treatAllSymlinksAsFiles) {
                return items.filter(eachItem=>(eachItem.isFile || eachItem.isSymlink))
            } else {
                return items.filter(eachItem=>eachItem.isFile)
            }
        },
        listFilePathsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
            return (FileSystem.sync.listFileItemsIn(pathOrFileInfo, options)).map(each=>each.path)
        },
        listFileBasenamesIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
            return (FileSystem.sync.listFileItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
        },
        listFolderItemsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
            const { ignoreSymlinks } = {ignoreSymlinks:false, ...options}
            const items = FileSystem.sync.listItemsIn(pathOrFileInfo, options)
            if (ignoreSymlinks) {
                return items.filter(eachItem=>(eachItem.isFolder && !eachItem.isSymlink))
            } else {
                return items.filter(eachItem=>eachItem.isFolder)
            }
        },
        listFolderPathsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
            return (FileSystem.sync.listFolderItemsIn(pathOrFileInfo, options)).map(each=>each.path)
        },
        listFolderBasenamesIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
            return (FileSystem.sync.listFolderItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
        },
        recursivelyIterateItemsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
            options.recursively = true
            // convert shorthand option to shouldntInclude
            if (options.onlyHardlinks) {
                if (options.shouldntInclude) {
                    const originalshouldntInclude = options.shouldntInclude
                    options.shouldntInclude = (each)=>each.isSymlink||originalshouldntInclude(each)
                } else {
                    options.shouldntInclude = (each)=>each.isSymlink
                }
            }
            // convert shorthand option to shouldntExplore
            if (options.dontFollowSymlinks) {
                if (options.shouldntExplore) {
                    const originalShouldntExplore = options.shouldntInclude
                    options.shouldntExplore = (each)=>each.isSymlink||originalShouldntExplore(each)
                } else {
                    options.shouldntExplore = (each)=>each.isSymlink
                }
            }
            return FileSystem.sync.iterateItemsIn(pathOrFileInfo, options)
        },
        recursivelyIteratePathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
            options.recursively = true
            // convert shorthand option to shouldntInclude
            if (options.onlyHardlinks) {
                if (options.shouldntInclude) {
                    const originalshouldntInclude = options.shouldntInclude
                    options.shouldntInclude = (each)=>each.isSymlink||originalshouldntInclude(each)
                } else {
                    options.shouldntInclude = (each)=>each.isSymlink
                }
            }
            return FileSystem.sync.iteratePathsIn(pathOrFileInfo, options)
        },
        recursivelyListPathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
            return [...FileSystem.sync.recursivelyIteratePathsIn(pathOrFileInfo, options)]
        },
        recursivelyListItemsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, shouldntExplore:null, shouldntInclude:null, }) {
            return [...FileSystem.sync.recursivelyIterateItemsIn(pathOrFileInfo, options)]
        },
        // sync TODO:
            // globIterator
            // getPermissions
            // addPermissions
        // Note:
            // cannot be sync:
                // walkUpImport 
    },
}

export const glob = FileSystem.glob
export { escapeGlob as escapeGlob }