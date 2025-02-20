import { getFileType } from "./getFileType.js"

/**
 * Directory (hardlink) or Symlink to Directory
 * false if symlink is to a normal file or is broken
 * @example
 * ```js
 * console.log(await isDirectoryLink(import.meta.dirname))
 * console.log(await isDirectoryLink(import.meta.filename))
 * console.log(await isDirectoryLink("/home/user/file.txt.gz"))
 * ```
 */
export function isDirectoryLink(path) {
    return getFileType(path).then(fileType => fileType === 'directory' || fileType === 'symlinkToDirectory')
}