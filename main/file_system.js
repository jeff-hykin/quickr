import { ensure } from 'https://deno.land/x/ensure/mod.ts'; ensure({ denoVersion: "1.17.1", })
import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"
import { copy } from "https://deno.land/std@0.123.0/streams/conversion.ts"
import { move as moveAndRename, moveSync as moveAndRenameSync } from "https://deno.land/std@0.133.0/fs/mod.ts"
import { findAll } from "https://deno.land/x/good@0.5.1/string.js"

// TODO:
    // handling relative symbolic links for the move command 
    // add copy command (figure out how to handle symlinks)
    // globbing
    // LF vs CRLF detection
    // Deno.execPath()
    // owner of a file
    // rename
    // merge
    // get/set owner
    // size
    // timeCreated
    // timeOfLastAccess
    // timeOfLastModification
    // tempfile
    // tempfolder
    // readBytes
    // readStream
    // username with Deno.getUid()

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
        }
        
        // if symlink
        const stat = this.stat
        return !!stat.isFile
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
        }
        
        // if symlink
        const stat = this.stat
        return !!stat.isDirectory
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

const locker = {}
export const FileSystem = {
    denoExecutablePath: Deno.execPath(),
    parentPath: Path.dirname,
    dirname: Path.dirname,
    basename: Path.basename,
    extname: Path.extname,
    join: Path.join,
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
    get thisFolder() {
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
        // busy wait till lock is removed
        while (locker[path]) {
            await new Promise((resolve)=>setTimeout(resolve, 70))
        }
        locker[path] = true
        let output
        try {
            output = await Deno.readTextFile(path)
        } catch (error) {
        }
        delete locker[path]
        return output
    },
    async info(fileOrFolderPath, _cachedLstat=null) {
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
                    // probably a permission error
                    // TODO: improve how this is handled
                    throw error
                }
            }
        }
        return new ItemInfo({path:fileOrFolderPath, _lstatData: lstat, _statData: stat})
    },
    async move({ item, newParentFolder, newName, overwrite=false, force=true }) {
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
                })
                // remove the original since it was "moved"
                await FileSystem.remove(itemInfo)
            }
        }
        
        if (force || overwrite) {
            FileSystem.sync.clearAPathFor(newPath, { overwrite })
        }
        // FIXME: this needs to recursively check for realtive symlinks!
        //          if there is a relative symlink to something OUTSIDE the folder being moved, it needs to be adjusted in order to not break
        //          if there is a relative symlink to something INSIDE the folder being moved, then it doesn't need to be adjusted
        //          however "inside" and "outside" are difficult because folders can be symlinks.
        //              So find the absolute path to the target, check if that hard path is external or internal
        //          another edgecase is what if the folder contains a symlink with an absolute path of the folder being moved (or something inside of the folder being moved)
        await moveAndRename(item, newPath)
    },
    async remove(fileOrFolder) {
        fileOrFolder = fileOrFolder.path || fileOrFolder
        const itemInfo = await FileSystem.info(fileOrFolder)
        if (itemInfo.isFile) {
            return Deno.remove(itemInfo.path.replace(/\/+$/,""))
        } else if (itemInfo.exists) {
            return Deno.remove(itemInfo.path.replace(/\/+$/,""), {recursive: true})
        }
    },
    normalize: (path)=>Path.normalize(path.path||path),
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
    async ensureIsFile(path) {
        path = path.path || path // if given ItemInfo object
        const pathInfo = await FileSystem.info(path)
        if (pathInfo.isFile && !pathInfo.isDirectory) { // true for symbolic links to non-directories
            return path
        } else {
            await FileSystem.write({path, data:""}) // this will clear everything out of the way
            return path
        }
    },
    async ensureIsFolder(path) {
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
            FileSystem.sync.ensureIsFolder(parentPath)
        }
        
        // delete files in the way
        let pathInfo = FileSystem.sync.info(path)
        if (pathInfo.exists && !pathInfo.isDirectory) {
            FileSystem.sync.remove(path)
        }
        
        await Deno.mkdir(path, { recursive: true })
        // finally create the folder
        return path
    },
    async clearAPathFor(path, options={overwrite:false, extension:".old"}) {
        const {overwrite, extension} = {overwrite:false, extension:".old", ...options }
        const originalPath = path
        const paths = []
        while (Path.dirname(path) !== path) {
            paths.push(path)
            path = Path.dirname(path)
        }
        for (const eachPath of paths.reverse()) {
            const info = await FileSystem.info(eachPath)
            if (!info.exists) {
                break
            } else if (info.isFile) {
                if (overwrite) {
                    await FileSystem.remove(eachPath)
                } else {
                    await FileSystem.moveOutOfTheWay(eachPath, {extension})
                }
            }
        }
        await FileSystem.ensureIsFolder(Path.dirname(originalPath))
        return originalPath
    },
    async moveOutOfTheWay(path, options={extension:".old"}) {
        const {overwrite, extension} = { extension:".old", ...options }
        const {move} = await import("https://deno.land/std@0.133.0/fs/mod.ts")
        const info = await FileSystem.info(path)
        if (info.exists) {
            // make sure nothing is in the way of what I'm about to move
            const newPath = path+extension
            await FileSystem.moveOutOfTheWay(newPath, {extension})
            await move(path, newPath)
        }
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
    async copy({from, to, force=true}) {
        const existingItemDoesntExist = (await Deno.stat(from).catch(()=>({doesntExist: true}))).doesntExist
        if (existingItemDoesntExist) {
            throw Error(`\nTried to copy from:${from}, to:${to}\nbut "from" didn't seem to exist\n\n`)
        }
        if (force) {
            FileSystem.sync.clearAPathFor(to, { overwrite: force })
            FileSystem.sync.remove(to)
        }
        const target = await Deno.create(to)
        const source = await Deno.open(from, { read: true })
        const result = await copy(source, target)
        Deno.close(source.rid)
        Deno.close(target.rid)
        return result
    },
    async relativeLink({existingItem, newItem, force=true, overwrite=false}) {
        const existingItemPath = (existingItem.path || existingItem).replace(/\/+$/, "") // the replace is to remove trailing slashes, which will cause painful nonsensical errors if not done
        const newItemPath = (newItem.path || newItem).replace(/\/+$/, "") // if given ItemInfo object
        
        const existingItemDoesntExist = (await Deno.lstat(existingItemPath).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (existingItemDoesntExist) {
            throw Error(`\nTried to create a relativeLink between existingItem:${existingItemPath}, newItem:${newItemPath}\nbut existingItem didn't actually exist`)
        } else {
            const hardPathToNewItem = await FileSystem.makeHardPathTo(newItemPath)
            const hardPathToExistingItem = await FileSystem.makeHardPathTo(existingItemPath)
            const pathFromNewToExisting = Path.relative(hardPathToNewItem, hardPathToExistingItem).replace(/^\.\.\//,"") // all paths should have the "../" at the begining
            if (force || overwrite) {
                FileSystem.sync.clearAPathFor(hardPathToNewItem, {overwrite})
            }
            return Deno.symlink(
                pathFromNewToExisting,
                hardPathToNewItem,
            )
        }
    },
    async absoluteLink({existingItem, newItem, force=true}) {
        existingItem = (existingItem.path || existingItem).replace(/\/+$/, "")
        newItem = (newItem.path || newItem).replace(/\/+$/, "") // if given ItemInfo object
        newItem = FileSystem.normalize(newItem)
        
        const existingItemDoesntExist = (await Deno.lstat(existingItem).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (existingItemDoesntExist) {
            throw Error(`\nTried to create a relativeLink between existingItem:${existingItem}, newItem:${newItem}\nbut existingItem didn't actually exist`)
        } else {
            if (force) {
                await FileSystem.ensureIsFolder(FileSystem.dirname(newItem))
                await FileSystem.remove(newItem)
            }
            
            return Deno.symlink(
                FileSystem.makeAbsolutePath(existingItem), // remove trailing slash, because it can screw stuff up
                newItem,
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
    async listPathsIn(pathOrFileInfo){
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        // if not folder (includes if it doesn't exist)
        if (!info.isFolder) {
            return []
        }

        const path = info.path
        const results = []
        for await (const dirEntry of Deno.readDir(path)) {
            const eachPath = Path.join(path, dirEntry.name)
            results.push(eachPath)
        }
        return results
    },
    async listBasenamesIn(pathOrFileInfo){
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        // if not folder (includes if it doesn't exist)
        if (!info.isFolder) {
            return []
        }

        const path = info.path
        const results = []
        for await (const dirEntry of Deno.readDir(path)) {
            results.push(dirEntry.name)
        }
        return results
    },
    // TODO: make iteratePathsIn() that returns an async generator
    //       and make all these listing methods way more efficient in the future
    async listItemsIn(pathOrFileInfo) {
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        // if not folder (includes if it doesn't exist)
        if (!info.isFolder) {
            return []
        }

        const path = info.path
        const outputPromises = []
        // schedule all the info lookup
        for await (const fileOrFolder of Deno.readDir(path)) {
            const eachPath = Path.join(path,fileOrFolder.name)
            outputPromises.push(FileSystem.info(eachPath))
        }
        
        return Promise.all(outputPromises)
    },
    // includes symlinks to files and pipes
    async listFileItemsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        const { treatAllSymlinksAsFiles } = {treatAllSymlinksAsFiles:false, ...options}
        const items = await FileSystem.listItemsIn(pathOrFileInfo)
        if (treatAllSymlinksAsFiles) {
            return items.filter(eachItem=>(eachItem.isFile || (treatAllSymlinksAsFiles && eachItem.isSymlink)))
        } else {
            return items.filter(eachItem=>eachItem.isFile)
        }
    },
    async listFilePathsIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        return (await FileSystem.listItemsIn(pathOrFileInfo, options)).map(each=>each.path)
    },
    async listFileBasenamesIn(pathOrFileInfo, options={treatAllSymlinksAsFiles:false}) {
        return (await FileSystem.listItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
    },
    
    async listFolderItemsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        const { ignoreSymlinks } = {ignoreSymlinks:false, ...options}
        const items = await FileSystem.listItemsIn(pathOrFileInfo)
        if (ignoreSymlinks) {
            return items.filter(eachItem=>(eachItem.isFolder && !eachItem.isSymlink))
        } else {
            return items.filter(eachItem=>eachItem.isFolder)
        }
    },
    async listFolderPathsIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        return (await FileSystem.listItemsIn(pathOrFileInfo, options)).map(each=>each.path)
    },
    async listFolderBasenamesIn(pathOrFileInfo, options={ignoreSymlinks:false}) {
        return (await FileSystem.listItemsIn(pathOrFileInfo, options)).map(each=>each.basename)
    },
    async * recursivelyIteratePathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity }) {
        // merge defaults
        options = { exclude: [], onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity, ...options }
        options.searchOrder = options.searchOrder || 'breadthFirstSearch' // allow null/undefined to equal the default
        // setup args
        const info = pathOrFileInfo instanceof ItemInfo ? pathOrFileInfo : await FileSystem.info(pathOrFileInfo)
        const path = info.path
        const exclude = new Set(options.exclude)
        const useBreadthFirstSearch = options.searchOrder == 'breadthFirstSearch'
        const allowSymlinks = !options.onlyHardlinks
        const followSymlinks = !options.dontFollowSymlinks
        
        // check args
        if (!(['breadthFirstSearch', 'depthFirstSearch'].includes(options.searchOrder))) {
            throw Error(`when calling FileSystem.recursivelyIteratePathsIn('${path}', { searchOrder: ${options.searchOrder} })\n\n    The searchOrder currently can only be 'depthFirstSearch' or 'breadthFirstSearch'\n    However, it was not either of those: ${options.searchOrder}`)
        }
        
        // note: exclude includes already-searched paths in the recursive case
        if (options.maxDepth > 0 && info.isFolder && !exclude.has(path)) {
            const absolutePathVersion = FileSystem.makeAbsolutePath(path)
            exclude.add(absolutePathVersion)
            options.maxDepth -= 1

            const searchAfterwords = []
            const isSymlinkedToDirectory = async (entry, eachPath)=>entry.isSymlink && (await FileSystem.info(eachPath)).isDirectory
            for await (const entry of Deno.readDir(path)) {
                const eachPath = Path.join(path, entry.name)
                // add the folder
                if (allowSymlinks || !entry.isSymlink) {
                    yield eachPath
                }
                
                // schedule children
                if (entry.isDirectory || (followSymlinks && await isSymlinkedToDirectory(entry, eachPath))) {
                    if (useBreadthFirstSearch) {
                        searchAfterwords.push(eachPath)
                    } else {
                        // yield* doesn't seem to work for async iterators
                        for await (const each of FileSystem.recursivelyIteratePathsIn(eachPath, options)) {
                            yield each
                        }
                    }
                }
            }
            // BFS
            for (const eachParentPath of searchAfterwords) {
                // yield* doesn't seem to work for async iterators
                for await (const each of FileSystem.recursivelyIteratePathsIn(eachParentPath, options)) {
                    yield each
                }
            }
        }
    },
    async recursivelyListPathsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity}) {
        const listOutput = []
        for await (const each of FileSystem.recursivelyIteratePathsIn(pathOrFileInfo, options)) {
            listOutput.push(each)
        }
        return listOutput
    },
    async recursivelyListItemsIn(pathOrFileInfo, options={onlyHardlinks: false, dontFollowSymlinks: false, searchOrder: 'breadthFirstSearch', maxDepth: Infinity}) {
        const paths = await FileSystem.recursivelyListPathsIn(pathOrFileInfo, options)
        return Promise.all(paths.map(each=>FileSystem.info(each)))
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
        if (permissions.owner.canRead    ) { permissionNumber = permissionNumber | 0b0100000000 }
        if (permissions.owner.canWrite   ) { permissionNumber = permissionNumber | 0b0010000000 }
        if (permissions.owner.canExecute ) { permissionNumber = permissionNumber | 0b0001000000 }
        if (permissions.group.canRead    ) { permissionNumber = permissionNumber | 0b0000100000 }
        if (permissions.group.canWrite   ) { permissionNumber = permissionNumber | 0b0000010000 }
        if (permissions.group.canExecute ) { permissionNumber = permissionNumber | 0b0000001000 }
        if (permissions.others.canRead   ) { permissionNumber = permissionNumber | 0b0000000100 }
        if (permissions.others.canWrite  ) { permissionNumber = permissionNumber | 0b0000000010 }
        if (permissions.others.canExecute) { permissionNumber = permissionNumber | 0b0000000001 }
        
        // 
        // actually set the permissions
        // 
        if (
            recursively == false
            || (fileInfo instanceof Object && fileInfo.isFile) // if already computed, dont make a 2nd system call
            || (!(fileInfo instanceof Object) && (await FileSystem.info(path)).isFile)
        ) {
            return Deno.chmod(path, permissionNumber)
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
    async write({path, data, force=true}) {
        while (locker[path]) {
            await new Promise((resolve)=>setTimeout(resolve, 70))
        }
        locker[path] = true
        if (force) {
            FileSystem.sync.clearAPathFor(path, { overwrite: force })
            const info = await FileSystem.info(path)
            if (info.isDirectory) {
                await FileSystem.remove(path)
            }
        }
        let output
        // string
        if (typeof data == 'string') {
            output = await Deno.writeTextFile(path, data)
        // assuming bytes (maybe in the future, readables and pipes will be supported)
        } else {
        output = await Deno.writeFile(path, data)
        }
        delete locker[path]
        return output
    },
    async append({path, data, force=true}) {
        while (locker[path]) {
            await new Promise((resolve)=>setTimeout(resolve, 70))
        }
        locker[path] = true

        if (force) {
            FileSystem.sync.clearAPathFor(path, { overwrite: force })
            const info = await FileSystem.info(path)
            if (info.isDirectory) {
                await FileSystem.remove(path)
            }
        }
        const file = await Deno.open(path, {write: true, read:true, create: true})
        // go to the end of a file (meaning everthing will be appended)
        await Deno.seek(file.rid, 0, Deno.SeekMode.End)
        // string
        if (typeof data == 'string') {
            await Deno.write(file.rid, new TextEncoder().encode(data))
        // assuming bytes (maybe in the future, readables and pipes will be supported)
        } else {
            await Deno.write(file.rid, data)
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
        moveOutOfTheWay(path, options={extension:".old"}) {
            const {overwrite, extension} = { extension:".old", ...options }
            const info = FileSystem.sync.info(path)
            if (info.exists) {
                // make sure nothing is using the new-name I just picked
                const newPath = path+extension
                FileSystem.sync.moveOutOfTheWay(newPath, {extension})
                moveAndRenameSync(path, newPath)
            }
        },
        ensureIsFolder(path) {
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
                FileSystem.sync.ensureIsFolder(parentPath)
            }
            
            // delete files in the way
            let pathInfo = FileSystem.sync.info(path)
            if (pathInfo.exists && !pathInfo.isDirectory) {
                FileSystem.sync.remove(path)
            }
            
            Deno.mkdirSync(path, { recursive: true })
            // finally create the folder
            return path
        },
        clearAPathFor(path, options={overwrite:false, extension:".old"}) {
            const {overwrite, extension} = {overwrite:false, extension:".old", ...options }
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
                        FileSystem.sync.moveOutOfTheWay(eachPath, {extension})
                    }
                }
            }
            FileSystem.sync.ensureIsFolder(Path.dirname(originalPath))
            return originalPath
        },
    }
}
