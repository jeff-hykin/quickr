import { run } from "./run.js"

const cache = {}
export const OperatingSystem = {
    commonChecks: {
        isMac: Deno.build.os=="darwin",
        isWindows: Deno.build.os=="windows",
        isLinux: Deno.build.os=="linux",
    },
    commonName: ({
        "darwin": "MacOS",
        "windows": "Windows",
        "linux": "Linux",
    })[Deno.build.os],
    kernel: {
        commonName: Deno.build.os
    },
    architecture: Deno.build.architecture,
    get username() {
        if (!cache.username) {
            if (!OperatingSystem.commonChecks.isWindows) {
                cache.username = Deno.env.get("USER")
            } else {
                // untested
                cache.username = Deno.env.get("USERNAME")
            }
        }
        return cache.username
    },
    get home() {
        if (!cache.home) {
            if (!OperatingSystem.commonChecks.isWindows) {
                cache.home = Deno.env.get("HOME")
            } else {
                // untested
                cache.home = Deno.env.get("HOMEPATH")
            }
        }
        return cache.home
    },
    async _getOwnerOf(path) {
        if (Deno.build.os === "darwin") {
            if (!cache.macOsUserToUid) {
                const userListString = await run("dscl",".", "-list", "/Users", "UniqueID", run.Stdout(run.returnAsString))
                const userList = userListString.split(/\n/)
                const userNamesAndIds = userList.map(each=>{
                    const match = each.match(/(.+?)(-?\d+)$/,"$1")
                    if (match) {
                        const username = match[1].trim()
                        const uid = match[2]
                        return [username, uid]
                    }
                }).filter(each=>each)
                const idsAndUsernames = userNamesAndIds.map(([username, id])=>[id, username])
                cache.macOsUserToUid = Object.fromEntries(userNamesAndIds)
                cache.macOsUidToUser = Object.fromEntries(idsAndUsernames)
            }
        } else {
            // FIXME
            throw Error(`Unsupported system`)
            // for linux look at:
            // getent passwd {1000..6000}
        }
    }
}