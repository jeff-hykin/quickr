import { ensure } from 'https://deno.land/x/ensure/mod.ts'; ensure({ denoVersion: "1.17.1", })
import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"
import { move as moveAndRename, moveSync as moveAndRenameSync, copy as basicCopy } from "https://deno.land/std@0.133.0/fs/mod.ts"
import { findAll } from "https://deno.land/x/good@1.1.1.2/string.js"
import { makeIterable, asyncIteratorToList, concurrentlyTransform } from "https://deno.land/x/good@1.1.1.2/iterable.js"
import { globToRegExp } from "https://deno.land/std@0.191.0/path/glob.ts"
import { readLines } from "https://deno.land/std@0.191.0/io/read_lines.ts"
import { isGeneratorType } from "https://deno.land/x/good@1.1.1.2/value.js"

// TODO:
    // ensure that all path arguments also accept ItemInfo objects
    // make sure the .sync api is in parity with the async API
    // check LF vs CRLF detection
    // add API's
        // rename function
        // move function
            // needs to handle relative symbolic links
        // copy function
            // decide how to handle symlinks
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

const emptyIterator = (async function *() {})()
const cache = {}

class ItemInfo {
    constructor({path,_lstatData,_statData}) {
        this.path = path
        // expects doesntExist, path,
        this._lstat = _lstatData
        this._data = _statData
    }

    // 
    // core data sources
    // 
    refresh() {
        this._lstat = null
        this._data = null
    }
    get lstat() {
        if (!this._lstat) {
            try {
                this._lstat = Deno.lstatSync(this.path)
            } catch (error) {
                this._lstat = {doesntExist: true}
            }
        }
        return this._lstat
    }
    get stat() {
        // compute if not cached
        if (!this._stat) {
            const lstat = this.lstat
            if (!lstat.isSymlink) {
                this._stat = {
                    isBrokenLink: false,
                    isLoopOfLinks: false,
                }
            // if symlink
            } else {
                try {
                    this._stat = Deno.statSync(this.path) 
                } catch (error) {
                    this._stat = {}
                    if (error.message.match(/^Too many levels of symbolic links/)) {
                        this._stat.isBrokenLink = true
                        this._stat.isLoopOfLinks = true
                    } else if (error.message.match(/^No such file or directory/)) {
                        this._stat.isBrokenLink = true
                    } else {
                        // probably a permission error
                        // TODO: improve how this is handled
                        throw error
                    }
                }
            }
        }
        return this._stat
    }

    // 
    // main attributes
    // 
    get exists() {
        const lstat = this.lstat
        return !lstat.doesntExist
    }
    get name() {
        return Path.parse(this.path).name
    }
    get extension() {
        return Path.parse(this.path).ext
    }
    get basename() {
        return this.path && Path.basename(this.path)
    }
    get parentPath() {
        return this.path && Path.dirname(this.path)
    }
    relativePathFrom(parentPath) {
        return Path.relative(parentPath, this.path)
    }
    get link() {
        const lstat = this.lstat
        if (lstat.isSymlink) {
            return Deno.readLinkSync(this.path)
        } else {
            return null
        }
    }
    get isSymlink() {
        const lstat = this.lstat
        return !!lstat.isSymlink
    }
    get isRelativeSymlink() {
        const lstat = this.lstat
        const isNotSymlink = !lstat.isSymlink
        if (isNotSymlink) {
            return false
        }
        const relativeOrAbsolutePath = Deno.readLinkSync(this.path)
        return !Path.isAbsolute(relativeOrAbsolutePath)
    }
    get isAbsoluteSymlink() {
        const lstat = this.lstat
        const isNotSymlink = !lstat.isSymlink
        if (isNotSymlink) {
            return false
        }
        const relativeOrAbsolutePath = Deno.readLinkSync(this.path)
        return Path.isAbsolute(relativeOrAbsolutePath)
    }
    get isBrokenLink() {
        const stat = this.stat
        return !!stat.isBrokenLink
    }
    get isLoopOfLinks() {
        const stat = this.stat
        return !!stat.isLoopOfLinks
    }
    get isFile() {
        const lstat = this.lstat
        // if doesnt exist then its not a file!
        if (lstat.doesntExist) {
            return false
        }
        // if hardlink
        if (!lstat.isSymlink) {
            return lstat.isFile
        // if symlink
        } else {
            return !!this.stat.isFile
        }
    }
    get isFolder() {
        const lstat = this.lstat
        // if doesnt exist then its not a folder!
        if (lstat.doesntExist) {
            return false
        }
        // if hardlink
        if (!lstat.isSymlink) {
            return lstat.isDirectory
        // if symlink
        } else {
            return !!this.stat.isDirectory
        }
    }
    get sizeInBytes() {
        const lstat = this.lstat
        return lstat.size
    }
    get permissions() {
        const {mode} = this.lstat
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
    }
    
    // aliases
    get isDirectory() { return this.isFolder }
    get dirname()     { return this.parentPath }

    toJSON() {
        return {
            exists: this.exists,
            name: this.name,
            extension: this.extension,
            basename: this.basename,
            parentPath: this.parentPath,
            isSymlink: this.isSymlink,
            isBrokenLink: this.isBrokenLink,
            isLoopOfLinks: this.isLoopOfLinks,
            isFile: this.isFile,
            isFolder: this.isFolder,
            sizeInBytes: this.sizeInBytes,
            permissions: this.permissions,
            isDirectory: this.isDirectory,
            dirname: this.dirname,
        }
    }
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
const pathStandardize = (path)=>{
    // ItemInfo object to path
    path = path.path||path
    // url-like file path to POSIX path
    if (typeof path == 'string' && path.startsWith("file:///")) {
        path = Path.fromFileUrl(path)
    }
    return path
}
export const FileSystem = {
    denoExecutablePath: Deno.execPath(),
    parentPath: Path.dirname,
    dirname: Path.dirname,
    basename: Path.basename,
    extname: Path.extname,
    join: Path.join,
    defaultRenameExtension: ".old",
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
        const filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
        
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
        const filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
        
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
            // compute lstat and stat before creating ItemInfo (so its async for performance)
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
            return new ItemInfo({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
        } finally {
            delete locker[fileOrFolderPath]
        }
    },
    async move({ item, newParentFolder, newName, force=true, overwrite=false, renameExtension=null }) {
        // force     => will MOVE other things out of the way until the job is done
        // overwrite => will DELETE things out of the way until the job is done
        
        const oldPath = item.path || item
        const oldName = FileSystem.basename(oldPath)
        const itemInfo = item instanceof Object || await FileSystem.info(oldPath)
        const newPath = `${newParentFolder}/${newName || oldName}`

        // if its a relative-linked item the the relative link will need to be adjusted after the move
        // todo: consider more about the broken link case (current .FileSystem.relativeLink() only works with linking to things that exist)
        if (itemInfo.isSymlink && !item.isBrokenLink) {
            const link = Deno.readLinkSync(itemInfo.path)
            if (!Path.isAbsolute(link)) {
                const linkTargetBeforeMove = `${FileSystem.parentPath(itemInfo.path)}/${link}`
                await FileSystem.relativeLink({
                    existingItem: linkTargetBeforeMove,
                    newItem: newPath,
                    force,
                    overwrite,
                    renameExtension,
                })
                // remove the original since it was "moved"
                await FileSystem.remove(itemInfo)
            }
        }
        
        if (force) {
            FileSystem.sync.clearAPathFor(newPath, { overwrite, renameExtension })
        }
        // FIXME: this needs to recursively check for realtive symlinks!
        //          if there is a relative symlink to something OUTSIDE the folder being moved, it needs to be adjusted in order to not break
        //          if there is a relative symlink to something INSIDE the folder being moved, then it doesn't need to be adjusted
        //          however "inside" and "outside" are difficult because folders can be symlinks.
        //              So find the absolute path to the target, check if that hard path is external or internal
        //          another edgecase is what if the folder contains a symlink with an absolute path of the folder being moved (or something inside of the folder being moved)
        await moveAndRename(oldPath, newPath)
    },
    async remove(fileOrFolder) {
        fileOrFolder = pathStandardize(fileOrFolder)
        // for `await FileSystem.remove(glob(`*.js`))`
        if (fileOrFolder instanceof Array) {
            return Promise.all(fileOrFolder.map(FileSystem.remove))
        }
        fileOrFolder = fileOrFolder.path || fileOrFolder
        const itemInfo = await FileSystem.info(fileOrFolder)
        if (itemInfo.isFile || itemInfo.isSymlink) {
            return Deno.remove(itemInfo.path.replace(/\/+$/,""))
        } else if (itemInfo.exists) {
            return Deno.remove(itemInfo.path.replace(/\/+$/,""), {recursive: true})
        }
    },
    normalize: (path)=>Path.normalize(pathStandardize(path)).replace(/\/$/,""),
    isAbsolutePath: Path.isAbsolute,
    isRelativePath: (...args)=>!Path.isAbsolute(...args),
    makeRelativePath: ({from, to}) => Path.relative(from.path || from, to.path || to),
    makeAbsolutePath: (path)=> {
        if (!Path.isAbsolute(path)) {
            return Path.normalize(Path.join(Deno.cwd(), path))
        } else {
            return Path.normalize(path)
        }
    },
    async finalTargetOf(path, options={}) {
        const { _parentsHaveBeenChecked, cache } = { _parentsHaveBeenChecked: false , cache: {}, ...options }
        const originalWasItem = path instanceof ItemInfo
        path = (path.path || path) // if given ItemInfo object
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

        path = FileSystem.normalize(path)
        if (originalWasItem) {
            return new ItemInfo({path})
        } else {
            return path
        }
    },
    async nextTargetOf(path, options={}) {
        const originalWasItem = path instanceof ItemInfo
        const item = originalWasItem ? path : new ItemInfo({path})
        const lstat = item.lstat
        if (lstat.isSymlink) {
            const relativeOrAbsolutePath = Deno.readLinkSync(item.path)
            if (Path.isAbsolute(relativeOrAbsolutePath)) {
                if (originalWasItem) {
                    return new ItemInfo({path:relativeOrAbsolutePath})
                } else {
                    return relativeOrAbsolutePath
                }
            } else {
                const path = `${await FileSystem.makeHardPathTo(Path.dirname(item.path))}/${relativeOrAbsolutePath}`
                if (originalWasItem) {
                    return new ItemInfo({path})
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

        path = path.path || path // if given ItemInfo object
        const pathInfo = await FileSystem.info(path)
        if (pathInfo.isFile && !pathInfo.isDirectory) { // true for symbolic links to non-directories
            return path
        } else {
            await FileSystem.write({path, data:""}) // this will clear everything out of the way
            return path
        }
    },
    async ensureIsFolder(path, options={overwrite:false, renameExtension:null}) {
        const {overwrite, renameExtension} = defaultOptionsHelper(options)
        path = path.path || path // if given ItemInfo object
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
     *     await FileSystem.clearAPathFor("./something")
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
            } else if (info.isFile) {
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
     * All Parent Paths
     *
     * @param {String} path - path doesnt need to exist
     * @return {[String]} longest to shortest parent path
     */
    allParentPaths(path) {
        const pathStartsWithDotSlash = path.startsWith("./")
        path = FileSystem.normalize(path)
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
    async walkUpUntil(fileToFind, startPath=null){
        let here = startPath || Deno.cwd()
        if (!Path.isAbsolute(here)) {
            here = Path.join(cwd, fileToFind)
        }
        while (1) {
            let checkPath = Path.join(here, fileToFind)
            const pathInfo = await Deno.lstat(checkPath).catch(()=>({doesntExist: true}))
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
    // FIXME: make this work for folders with many options for how to handle symlinks
    async copy({from, to, preserveTimestamps=true, force=true, overwrite=false, renameExtension=null}) {
        const existingItemDoesntExist = (await Deno.stat(from).catch(()=>({doesntExist: true}))).doesntExist
        if (existingItemDoesntExist) {
            throw Error(`\nTried to copy from:${from}, to:${to}\nbut "from" didn't seem to exist\n\n`)
        }
        if (force) {
            FileSystem.sync.clearAPathFor(to, { overwrite, renameExtension })
        }
        const fromInfo = await FileSystem.info(from)
        return basicCopy(from, to, {force, preserveTimestamps: true})
    },
    async relativeLink({existingItem, newItem, force=true, overwrite=false, allowNonExistingTarget=false, renameExtension=null}) {
        const existingItemPath = (existingItem.path || existingItem).replace(/\/+$/, "") // the replace is to remove trailing slashes, which will cause painful nonsensical errors if not done
        const newItemPath = FileSystem.normalize((newItem.path || newItem).replace(/\/+$/, "")) // if given ItemInfo object
        
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
    async absoluteLink({existingItem, newItem, force=true, allowNonExistingTarget=false, overwrite=false, renameExtension=null}) {
        existingItem = (existingItem.path || existingItem).replace(/\/+$/, "") // remove trailing slash, because it can screw stuff up
        const newItemPath = FileSystem.normalize(newItem.path || newItem).replace(/\/+$/, "") // if given ItemInfo object
        
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
    pathPieces(path) {
        // const [ folders, itemName, itemExtensionWithDot ] = FileSystem.pathPieces(path)
        path = (path.path || path) // if given ItemInfo object
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
    async * iterateBasenamesIn(pathOrFileInfo){
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        // if file or doesnt exist
        if (info.isFolder) {
            for await (const each of Deno.readDir(pathOrFileInfo.path)) {
                yield dirEntry.name
            }
        }
    },
    listBasenamesIn(pathOrFileInfo) {
        return asyncIteratorToList(FileSystem.iterateBasenamesIn(pathOrFileInfo))
    },
    async * iteratePathsIn(pathOrFileInfo, options={recursively: false, shouldntInclude:null, shouldntExplore:null, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, dontFollowSymlinks: false, dontReturnSymlinks: false }) {
        let info
        try {
            info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        } catch (error) {
            if (!error.message.match(/^PermissionDenied:/)) {
                throw error
            }
        }
        const path = info.path
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
        // if recursively
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
            if (!shouldntExploreThis && options.maxDepth > 0 && info.isFolder) {
                options.exclude = options.exclude instanceof Set ? options.exclude : new Set(options.exclude)
                
                // note: exclude includes already-searched paths in the recursive case
                if (!options.exclude.has(path)) {
                    const followSymlinks = !options.dontFollowSymlinks
                    const absolutePathVersion = FileSystem.makeAbsolutePath(path)
                    options.exclude.add(absolutePathVersion)
                    options.maxDepth -= 1
                    
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
                        if (entry.isFile) {
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
                    for (const eachParentItem of searchAfterwords) {
                        // "yield*" doesn't seem to work for async iterators
                        for await (const eachSubPath of FileSystem.iteratePathsIn(eachParentItem, options)) {
                            // shouldntInclude would already have been executed by ^ so dont re-check
                            yield eachSubPath
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
        const { shouldntExplore, shouldntInclude } = options
        // setup args
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
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
                for (const eachParentItem of searchAfterwords) {
                    // "yield*" doesn't seem to work for async iterators
                    for await (const eachSubPath of FileSystem.iterateItemsIn(eachParentItem, options)) {
                        // shouldntInclude would already have been executed by ^ so dont re-check
                        yield eachSubPath
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
            return items.filter(eachItem=>(eachItem.isFile || (treatAllSymlinksAsFiles && eachItem.isSymlink)))
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
    async * globIterator(pattern, options={startPath:null}) {
        var {startPath, ...iteratePathsOptions} = options
        startPath = startPath || "."
        const regex = pattern instanceof RegExp ? pattern : globToRegExp(pattern)
        for await (const eachPath of FileSystem.iteratePathsIn(startPath, {recursively: true, ...iteratePathsOptions})) {
            if (eachPath.match(regex) || FileSystem.makeAbsolutePath(eachPath).match(regex)) {
                yield FileSystem.makeRelativePath({
                    from: startPath,
                    to: eachPath,
                })
            }
        }
    },
    glob(pattern, options={startPath:null}) {
        return asyncIteratorToList(FileSystem.globIterator(pattern, options))
    },
    async getPermissions({path}) {
        const {mode} = await Deno.lstat(path)
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
    *  await FileSystem.addPermissions({
    *      path: fileOrFolderPath,
    *      permissions: {
    *          owner: {
    *              canExecute: true,
    *          },
    *      }
    *  })
    */
    async addPermissions({path, permissions={owner:{}, group:{}, others:{}}, recursively=false}) {
        // just ensure the names exist
        permissions = { owner:{}, group:{}, others:{}, ...permissions }
        let permissionNumber = 0b000000000
        let fileInfo
        // if not all permissions are specified, go get the existing permissions
        if (!(Object.keys(permissions.owner).length === Object.keys(permissions.group).length === Object.keys(permissions.others).length === 3)) {
            fileInfo = await FileSystem.info(path)
            // just grab the last 9 binary digits of the mode number. See: https://stackoverflow.com/questions/15055634/understanding-and-decoding-the-file-mode-value-from-stat-function-output#15059931
            permissionNumber = fileInfo.lstat.mode & 0b0000000111111111
        }
        // 
        // set bits for the corrisponding permissions
        // 
        if (permissions.owner.canRead     != null ) { if (permissions.owner.canRead)     { permissionNumber |= 0b0100000000 } else { permissionNumber &= 0b1011111111 } }
        if (permissions.owner.canWrite    != null ) { if (permissions.owner.canWrite)    { permissionNumber |= 0b0010000000 } else { permissionNumber &= 0b1101111111 } }
        if (permissions.owner.canExecute  != null ) { if (permissions.owner.canExecute)  { permissionNumber |= 0b0001000000 } else { permissionNumber &= 0b1110111111 } }
        if (permissions.group.canRead     != null ) { if (permissions.group.canRead)     { permissionNumber |= 0b0000100000 } else { permissionNumber &= 0b1111011111 } }
        if (permissions.group.canWrite    != null ) { if (permissions.group.canWrite)    { permissionNumber |= 0b0000010000 } else { permissionNumber &= 0b1111101111 } }
        if (permissions.group.canExecute  != null ) { if (permissions.group.canExecute)  { permissionNumber |= 0b0000001000 } else { permissionNumber &= 0b1111110111 } }
        if (permissions.others.canRead    != null ) { if (permissions.others.canRead)    { permissionNumber |= 0b0000000100 } else { permissionNumber &= 0b1111111011 } }
        if (permissions.others.canWrite   != null ) { if (permissions.others.canWrite)   { permissionNumber |= 0b0000000010 } else { permissionNumber &= 0b1111111101 } }
        if (permissions.others.canExecute != null ) { if (permissions.others.canExecute) { permissionNumber |= 0b0000000001 } else { permissionNumber &= 0b1111111110 } }
        
        // 
        // actually set the permissions
        // 
        if (
            recursively == false
            || (fileInfo instanceof Object && fileInfo.isFile) // if already computed, dont make a 2nd system call
            || (!(fileInfo instanceof Object) && (await FileSystem.info(path)).isFile)
        ) {
            return Deno.chmod(path.path || path, permissionNumber)
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
            return new Promise(async (resolve, reject)=>{
                for (const each of promises) {
                    await each
                }
                resolve()
            })
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
        // incremental data
        if (isGeneratorType(data) || data[Symbol.iterator] || data[Symbol.asyncIterator]) {
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
        // string
        } else if (typeof data == 'string') {
            output = await Deno.writeTextFile(path, data)
        // assuming bytes (maybe in the future, readables and pipes will be supported)
        } else {
            output = await Deno.writeFile(path, data)
        }
        delete locker[path]
        return output
    },
    async append({path, data, force=true, overwrite=false, renameExtension=null}) {
        path = pathStandardize(path)
        await grabPathLock(path)
        if (force) {
            FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension })
            const info = await FileSystem.info(path)
            if (info.isDirectory) {
                await FileSystem.remove(path)
            }
        }
        const file = await Deno.open(path, {read:true, write: true, create: true})
        await file.seek(0, Deno.SeekMode.End)
        // string
        if (typeof data == 'string') {
            await file.write(new TextEncoder().encode(data))
        // assuming bytes (maybe in the future, readables and pipes will be supported)
        } else {
            await file.write(data)
        }
        // TODO: consider the possibility of this same file already being open somewhere else in the program, address/test how that might lead to problems
        await file.close()
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
    sync: {
        info(fileOrFolderPath, _cachedLstat=null) {
            // compute lstat and stat before creating ItemInfo (so its async for performance)
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
            return new ItemInfo({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
        },
        remove(fileOrFolder) {
            if (fileOrFolder instanceof Array) {
                return fileOrFolder.map(FileSystem.sync.remove)
            }
            fileOrFolder = fileOrFolder.path || fileOrFolder
            let exists = false
            let item
            try {
                item = Deno.lstatSync(fileOrFolder)
                exists = true
            } catch (error) {}
            if (exists) {
                if (item.isFile || item.isSymlink) {
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
            path = path.path || path // if given ItemInfo object
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
        /**
         * Move/Remove everything and Ensure parent folders
         *
         * @param path
         * @param options.overwrite - if false, then things in the way will be moved instead of deleted
         * @param options.extension - the string to append when renaming files to get them out of the way
         * 
         * @example
         *     FileSystem.sync.clearAPathFor("./something")
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
                FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), {overwrite, renameExtension})
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
        write({path, data, force=true, overwrite=false, renameExtension=null, _isInternalCall=false}) {
            path = pathStandardize(path)
            if (force) {
                FileSystem.sync.ensureIsFolder(FileSystem.parentPath(path), { overwrite, renameExtension, })
                const info = FileSystem.sync.info(path)
                if (info.isDirectory) {
                    FileSystem.sync.remove(path)
                }
            }
            let output
            // incremental data
            if (isGeneratorType(data) || data[Symbol.iterator]) {
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
            // string
            } else if (typeof data == 'string') {
                output = Deno.writeTextFileSync(path, data)
            // assuming bytes (maybe in the future, readables and pipes will be supported)
            } else {
                output = Deno.writeFileSync(path, data)
            }
            return output
        },
    },
}

export const glob = FileSystem.glob