#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)


console.debug(`FileSystem.thisFile is:`,FileSystem.thisFile)
console.debug(`FileSystem.thisFolder is:`,FileSystem.thisFolder)
console.debug(`FileSystem.workingDirectory is:`,FileSystem.workingDirectory)

await FileSystem.clearAPathFor(`${FileSystem.thisFolder}/run.errors.log`)

console.log(await FileSystem.listFileItemsIn(`../main/`))

console.log(await FileSystem.recursivelyListPathsIn(`..`))