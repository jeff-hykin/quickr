#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)

console.log(await FileSystem.listFileItemsIn(`../main/`))