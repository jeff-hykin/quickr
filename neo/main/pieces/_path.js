import { lstatSync, statSync, readLinkSync } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
import { parse, basename, dirname, relative, isAbsolute } from "https://deno.land/std@0.128.0/path/mod.ts"
const Deno = { lstatSync, statSync, readLinkSync }
const PathTools = { parse, basename, dirname, relative, isAbsolute }
import { syncGetFileType } from "./syncGetFileType.js"


export class Path {
    constructor(path) {
        if (path instanceof Object) {
            var {path,_lstatData,_statData} = path
        }
        this.path = path
        this._lstat = _lstatData
        this._stat = _statData
    }

    // 
    // core data sources
    // 
    refresh() {
        this._lstat = null
        this._stat = null
    }
    get lstat() {
        if (!this._lstat) {
            try {
                this._lstat = Deno.lstatSync(this.path)
            } catch (error) {
                this._lstat = {}
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
                    ...lstat,
                    isBrokenLink: false,
                    isLoopOfLinks: false,
                }
            // if symlink
            } else {
                try {
                    this._stat = Deno.statSync(this.path) 
                    // {
                    //     size: 5173,
                    //     mtime: 2025-02-20T20:37:50.361Z,
                    //     atime: 2025-02-20T20:37:50.398Z,
                    //     birthtime: 2025-02-20T14:07:48.711Z,
                    //     ctime: 2025-02-20T20:37:50.000Z,
                    //     dev: 16777234,
                    //     ino: 113602288,
                    //     mode: 33188,
                    //     nlink: 1,
                    //     uid: 501,
                    //     gid: 20,
                    //     rdev: 0,
                    //     blksize: 4096,
                    //     blocks: 16,
                    //     isFile: true,
                    //     isDirectory: false,
                    //     isSymlink: false,
                    //     isBlockDevice: false,
                    //     isCharDevice: false,
                    //     isFifo: false,
                    //     isSocket: false
                    // }
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
    get fileType() {
        return syncGetFileType(this)
    }
    
    /**
     * Normal File (hardlink) or Symlink to Normal File
     * false if symlink is to a directory or is broken
     */
    get isFileLink() {
        return this.fileType === 'normalFile' || this.fileType === 'symlinkToNormalFile'
    }
    
    /**
     * Directory (hardlink) or Symlink to Directory
     * false if symlink is to a normal file or is broken
     */
    get isDirectoryLink() {
        return this.fileType === 'directory' || this.fileType === 'symlinkToDirectory'
    }
    
    /**
     * item exists and is not a directory or a symlink to a directory
     * (could be a pipe, socket, broken symlink, text file, etc)
     */
    get isNonDirectoryLink() {
        return this.fileType !== 'nonexistent' && this.fileType !== 'directory' && this.fileType !== 'symlinkToDirectory'
    }

    // 
    // main attributes
    // 
    get exists() {
        return this.lstat.size !== undefined
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
    get dirname()     { return this.parentPath }

    toJSON() {
        return {
            exists: this.exists,
            name: this.name,
            extension: this.extension,
            basename: this.basename,
            parentPath: this.parentPath,
            isBrokenLink: this.isBrokenLink,
            isLoopOfLinks: this.isLoopOfLinks,
            sizeInBytes: this.sizeInBytes,
            permissions: this.permissions,
            isDirectory: this.isDirectory,
            dirname: this.dirname,
        }
    }
}