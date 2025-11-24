import { promises as fs } from "node:fs"
import fssync from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { getLastModificationTime } from "./get_last_modification_time.js" 

// In-memory cache: { realpath: { mtimeMs, hash, lastModificationTime? } }
const defaultCache = {}

function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex")
}

/**
 * Hash a file or directory path with caching, symlink safety, and optional following of symlinks.
 *
 * Uses getLastModificationTime to determine modification times.
 *
 * @param {string} targetPath - File or directory path to hash
 * @param {object} [options] - Options
 * @param {boolean} [options.followSymlinks=true] - Whether to follow symlinks when computing mtime
 * @param {object} [options.cache={}] - A cache object you can provide that could be from cold-storage or a database
 * @param {Set<string>} [visited] - Internal set for cycle detection (do not pass)
 * @returns {Promise<{ hash: string, lastModificationTime: number }>} - Hash and last modification time
 *
 * @example
 * ```js
 * // Hash a directory including symlink targets
 * const { hash, mtimeMs } = await hashItem('.');
 * console.log("Hash:", hash);
 * console.log("Last modification:", mtimeMs);
 *
 * // Hash a directory ignoring symlink targets
 * const result = await hashItem('.', { followSymlinks: false });
 * console.log(result);
 * 
 * // use cold storage to accelerate future runs
 * import storageObject from "https://deno.land/x/storage_object@0.0.2.0/main.js"
 * storageObject.cacheForBlahTask = {}
 * console.log(await hashItem('.', { cache: storageObject.cacheForBlahTask }))
 * ```
 */
export async function hashItem(targetPath, options = { }, visited = new Set()) {
    const { followSymlinks = true, cache: userCache } = options
    const cache = userCache ?? defaultCache
    const lstat = await fs.lstat(targetPath)

    // ---- Ignore pipes, sockets, devices, etc. ----
    if (!lstat.isFile() && !lstat.isDirectory() && !lstat.isSymbolicLink()) {
        const hash = sha256("IGNORED_SPECIAL:" + path.basename(targetPath))
        return { hash, lastModificationTime: lstat.mtimeMs }
    }

    // ---- Resolve realpath for caching and cycle detection ----
    let real
    try {
        real = await fs.realpath(targetPath)
    } catch {
        if (lstat.isSymbolicLink()) {
            const linkTarget = await fs.readlink(targetPath).catch(() => "")
            const hash = sha256("BROKEN_SYMLINK:" + linkTarget)
            return { hash, lastModificationTime: lstat.mtimeMs }
        }
        real = targetPath
    }

    if (visited.has(real)) {
        const hash = sha256("CYCLE:" + real)
        return { hash, lastModificationTime: lstat.mtimeMs }
    }
    visited.add(real)

    // ---- Compute mtime using helper ----
    const mtimeMs = await getLastModificationTime(targetPath, { followSymlinks }, new Set())

    // ---- Cache check ----
    const cached = cache[real]
    if (cached && cached.lastModificationTime === mtimeMs) {
        return { hash: cached.hash, lastModificationTime: mtimeMs }
    }

    // ============================================================
    // FILE
    // ============================================================
    if (lstat.isFile()) {
        const fileHash = await hashFile(targetPath)
        const final = sha256("FILE:" + fileHash + ":" + path.basename(targetPath))
        cache[real] = { hash: final, lastModificationTime: mtimeMs }
        return { hash: final, lastModificationTime: mtimeMs }
    }

    // ============================================================
    // SYMLINK
    // ============================================================
    if (lstat.isSymbolicLink()) {
        const linkTarget = await fs.readlink(targetPath).catch(() => "")
        let targetHash = ""

        if (followSymlinks && real !== targetPath) {
            const t = await hashItem(real, options, visited)
            targetHash = t.hash
        }

        const final = sha256("SYMLINK:" + linkTarget + ":" + targetHash)
        cache[real] = { hash: final, lastModificationTime: mtimeMs }
        return { hash: final, lastModificationTime: mtimeMs }
    }

    // ============================================================
    // DIRECTORY
    // ============================================================
    if (lstat.isDirectory()) {
        const entries = await fs.readdir(targetPath)
        entries.sort()
        const childHashes = []

        for (const entry of entries) {
            const full = path.join(targetPath, entry)
            const h = await hashItem(full, options, visited)
            childHashes.push(sha256(entry + ":" + h.hash))
        }

        const final = sha256("DIR:" + childHashes.join("|"))
        cache[real] = { hash: final, lastModificationTime: mtimeMs }
        return { hash: final, lastModificationTime: mtimeMs }
    }

    // ---- Fallback ----
    const fallbackHash = sha256("UNSUPPORTED:" + path.basename(targetPath))
    return { hash: fallbackHash, lastModificationTime: mtimeMs }
}

/**
 * Streaming file hash (handles large files efficiently)
 */
export function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256")
        const stream = fssync.createReadStream(filePath)
        stream.on("data", (chunk) => hash.update(chunk))
        stream.on("end", () => resolve(hash.digest("hex")))
        stream.on("error", reject)
    })
}
