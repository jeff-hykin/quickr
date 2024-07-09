const cache = {}

const stdoutRun = async (args)=>{
    const process = Deno.run({cmd: args, stdout: 'piped', stderr: 'piped'})
    const output = await process.output()
    return (new TextDecoder()).decode(output).replace(/\n$/,"")
}

export const OperatingSystem = {
    commonChecks: {
        isMac: Deno.build.os=="darwin",
        isWindows: Deno.build.os=="windows",
        isLinux: Deno.build.os=="linux",
        get isWsl() {
            if (cache.isWsl != null) {
                return cache.isWsl
            }
            // if Linux or other
            if (!(OperatingSystem.commonChecks.isMac || OperatingSystem.commonChecks.isWindows)) {
                // this is not always set, but its probably the fastest way to check
                if (Deno.env.get("WSLENV")) {
                    return cache.isWsl = true
                }
                try {
                    // check for C drive, NOTE: this is not an extremely rigorous test
                    // however a more rigorous test would require running Deno.run, which is async, and would make this whole getter async
                    const { isFile } = Deno.lstatSync("/mnt/c")
                    return cache.isWsl = true
                // => /mnt/c didnt exist
                } catch (error) {}
            }
            return cache.isWsl = false
        }
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
    get versionArray() {
        return new Promise(async (resolve, reject)=>{
            let versionArray = []
            if (OperatingSystem.commonChecks.isWindows) {
                try {
                    const windowsVersionString = await stdoutRun([ "pwsh", "-Command", `[System.Environment]::OSVersion.Version` ])
                    versionArray = windowsVersionString.replace(/^[\w\W]*?(\d+\.\d+\.\d+)[\w\W]*/,"$1").split('.').map(each=>each-0)
                } catch (error) {
                    console.warn(`unable to get version string for Windows: ${error.message}`)
                }
            } else if (OperatingSystem.commonChecks.isMac) {
                try {
                    const macVersionString = await stdoutRun([ "/usr/bin/sw_vers","-productVersion" ])
                    versionArray = macVersionString.replace(/^[\w\W]*?(\d+\.\d+(\.\d+)?)[\w\W]*/,"$1").split('.').map(each=>each-0)
                } catch (error) {
                    console.warn(`unable to get version string for MacOS: ${error.message}`)
                }
            } else {
                try {
                    const outputString = await stdoutRun([ "uname","-r" ])
                    versionArray = outputString.replace(/^[\w\W]*?((\d+\.)+\d+)[\w\W]*/,"$1").split('.').map(each=>each-0)
                } catch (error) {
                    console.warn(`unable to get version string for Linux: ${error.message}`)
                }
            }
        })
    },
    get username() {
        if (!cache.username) {
            if (Deno.build.os!="windows") {
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
            if (Deno.build.os!="windows") {
                cache.home = Deno.env.get("HOME")
            } else {
                // untested
                cache.home = Deno.env.get("HOMEPATH")
            }
        }
        return cache.home
    },
    async idForUsername(username) {
        if (OperatingSystem.commonChecks.isMac) {
            if (!cache.macOsUserToUid) {
                const userListString = await stdoutRun(["dscl",".", "-list", "/Users", "UniqueID"])
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
        } else if (OperatingSystem.commonChecks.isWindows) {
            return await stdoutRun(['pwsh', '-Command', `Get-ADUser -Identity '${username.replace(/'/,"''")}' | select SID`])
        } else if (OperatingSystem.commonChecks.isLinux) {
            return await stdoutRun(['id', '-u', OperatingSystem.username,])
        }
    },
    async openUrl(url) {
        if (Deno.build.os == "darwin") {
            const command = new Deno.Command("open", {
                args: [url],
            })
            return await command.output()
        } else if (Deno.build.os == "windows") {
            const command = new Deno.Command("powershell", {
                args: ["Start-Process", url],
            })
            return await command.output()
        } else if (Deno.build.os == "linux") {
            const command = new Deno.Command("xdg-open", {
                args: [url],
            })
            return await command.output()
        } else {
            throw new Error(`Unsupported OS: ${Deno.build.os}`)
        }
    },
}