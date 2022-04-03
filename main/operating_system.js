import { run } from "./run.js"

// must be done at the top to prevent other things from being async
let versionArray = []
if (Deno.build.os === "windows") {
    const windowsVersionString = await run("pwsh", "-Command", `[System.Environment]::OSVersion.Version`, run.Stdout(run.returnAsString))
    versionArray = windowsVersionString.replace(/^[\w\W]*?(\d+\.\d+\.\d+)[\w\W]*/,"$1").split('.').map(each=>each-0)
} else if (Deno.build.os === "darwin") {
    const macVersionString = await run("sw_vers","-productVersion", run.Stdout(run.returnAsString))
    versionArray = macVersionString.replace(/^[\w\W]*?(\d+\.\d+\.\d+)[\w\W]*/,"$1").split('.').map(each=>each-0)
}

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
    versionArray,
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
    async idForUsername(username) {
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
            return cache.macOsUserToUid[username]
        } else if (Deno.build.os === "windows") {
            return await run('pwsh', '-Command', `Get-ADUser -Identity '${username.replace(/'/,"''")}' | select SID`, run.Stdout(run.returnAsString))
        } else if (Deno.build.os === "linux") {
            return await run('id', '-u', OperatingSystem.username, run.Stdout(run.returnAsString))
        }
    },
}