#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)
import { intersection, subtract } from "https://deno.land/x/good@0.7.8/set.js"

console.debug(`FileSystem.thisFile is:`,FileSystem.thisFile)
console.debug(`FileSystem.thisFolder is:`,FileSystem.thisFolder)
console.debug(`FileSystem.workingDirectory is:`,FileSystem.workingDirectory)

await FileSystem.clearAPathFor(`${FileSystem.thisFolder}/run.errors.log`)

console.log(await FileSystem.listFileItemsIn(`../main/`))

console.log("# ")
console.log("# breadthFirstSearch")
console.log("# ")
const bfsResults = await FileSystem.recursivelyListPathsIn(`..`, { searchOrder: 'breadthFirstSearch', shouldntReturn: each=>each.match(/.*(^|\/)\.git($|\/).*/) })
console.log(bfsResults)

console.log("# ")
console.log("# depthFirstSearch")
console.log("# ")
const dfsResults = await FileSystem.recursivelyListPathsIn(`..`, { searchOrder: 'depthFirstSearch', shouldntExplore: each=>each.match(/.*(^|\/)\.git($|\/).*/) })
console.log(dfsResults)

const shouldntExplore = subtract({value: bfsResults, from: dfsResults, })
const shouldntReturn = subtract({value: dfsResults, from: bfsResults, })
console.debug(`shouldntExplore uniquely has:`,shouldntExplore)
console.debug(`shouldntReturn uniquely has:`,shouldntReturn)

const anAbsolutePath = `${FileSystem.thisFolder}/run.errors.log`
console.log("# ")
console.log(`# All parent paths of ${`${FileSystem.thisFolder}/run.errors.log`}`)
console.log("# ")
console.log(FileSystem.allParentPaths(anAbsolutePath))

const aRelativePath = FileSystem.makeRelativePath({ from:".", to:`${FileSystem.thisFolder}/run.errors.log`})
console.log("# ")
console.log(`# All parent paths of ${aRelativePath}`)
console.log("# ")
console.log(FileSystem.allParentPaths(aRelativePath))