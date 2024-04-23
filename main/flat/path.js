import { lstatSync, statSync, readLinkSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
const Deno = { lstatSync, statSync, readLinkSync }
import { parse, basename, dirname, relative, isAbsolute } from "https://deno.land/std@0.128.0/path/mod.ts"
const PathTools = { parse, basename, dirname, relative, isAbsolute }

export class Path {
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
        return PathTools.parse(this.path).name
    }
    get extension() {
        return PathTools.parse(this.path).ext
    }
    get basename() {
        return this.path && PathTools.basename(this.path)
    }
    get parentPath() {
        return this.path && PathTools.dirname(this.path)
    }
    relativePathFrom(parentPath) {
        return PathTools.relative(parentPath, this.path)
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
        return !PathTools.isAbsolute(relativeOrAbsolutePath)
    }
    get isAbsoluteSymlink() {
        const lstat = this.lstat
        const isNotSymlink = !lstat.isSymlink
        if (isNotSymlink) {
            return false
        }
        const relativeOrAbsolutePath = Deno.readLinkSync(this.path)
        return PathTools.isAbsolute(relativeOrAbsolutePath)
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