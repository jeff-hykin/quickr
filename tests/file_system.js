#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)


console.debug(`FileSystem.currentFile is:`,FileSystem.currentFilePath)
console.debug(`FileSystem.currenFolder is:`,FileSystem.currentFolderPath)

console.log(await FileSystem.listFileItemsIn(`./main/`))