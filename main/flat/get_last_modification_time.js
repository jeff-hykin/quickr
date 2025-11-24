import { promises as fs } from "node:fs"
import path from "node:path"

/**
 * Recursively compute the last modification time of a directory or file.
 *
 * By default, symlinks are followed. Use `options.followSymlinks = false` to
 * exclude their targets. Loops caused by symlinks are detected and ignored.
 *
 * @param {string} targetPath - Path to file or directory
 * @param {object} [options] - Optional configuration
 * @param {boolean} [options.followSymlinks=true] - Whether to follow symlinks
 * @param {Set<string>} [visited] - Internal set for cycle detection (do not pass)
 * @returns {Promise<number>} Latest modification time (mtimeMs) of the path
 *
 * @example
 * ```js
 * // Get last modification time of a directory, including symlink targets
 * const mtime = await getLastModificationTime(".");
 * console.log("Last modification:", mtime);
 *
 * // Get last modification time, excluding symlinks
 * const mtimeWithSymlinks = await getLastModificationTime(".", { followSymlinks: false });
 * console.log("Last modification (symlinks ignored):", mtimeWithSymlinks);
 * ```
 */
export async function getLastModificationTime(targetPath, options = {}, visited = new Set()) {
    const { followSymlinks = true } = options
    const lstat = await fs.lstat(targetPath)

    // Base case: special files → return their own mtime
    if (!lstat.isFile() && !lstat.isDirectory() && !lstat.isSymbolicLink()) {
        return lstat.mtimeMs
    }

    // Resolve realpath for caching / cycle detection
    let real
    try {
        real = await fs.realpath(targetPath)
    } catch {
        // Broken symlink
        if (lstat.isSymbolicLink()) {
            return lstat.mtimeMs
        }
        real = targetPath
    }

    // Loop detection
    if (visited.has(real)) {
        return lstat.mtimeMs
    }
    visited.add(real)

    // SYMLINK
    if (lstat.isSymbolicLink()) {
        if (followSymlinks) {
            try {
                const targetRealPath = await fs.realpath(targetPath)
                const tstat = await getLastModificationTime(targetRealPath, options, visited)
                return Math.max(lstat.mtimeMs, tstat)
            } catch {
                // Broken symlink → return own mtime
                return lstat.mtimeMs
            }
        } else {
            return lstat.mtimeMs
        }
    }

    // FILE
    if (lstat.isFile()) {
        return lstat.mtimeMs
    }

    // DIRECTORY
    if (lstat.isDirectory()) {
        let latest = lstat.mtimeMs
        const entries = await fs.readdir(targetPath)
        for (const entry of entries) {
            const full = path.join(targetPath, entry)
            const childTime = await getLastModificationTime(full, options, visited)
            latest = Math.max(latest, childTime)
        }
        return latest
    }

    // fallback
    return lstat.mtimeMs
}
