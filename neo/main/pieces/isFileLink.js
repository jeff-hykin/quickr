import { getFileType } from "./getFileType.js"

/**
 * Normal File (hardlink) or Symlink to Normal File
 * false if symlink is to a directory or symlink is broken
 * @example
 * ```js
 * console.log(await isFileLink(import.meta.dirname))
 * console.log(await isFileLink(import.meta.filename))
 * console.log(await isFileLink("/home/user/file.txt.gz"))
 * ```
 */
export function isFileLink(path) {
    return getFileType(path).then(fileType => fileType === 'normalFile' || fileType === 'symlinkToNormalFile')
}