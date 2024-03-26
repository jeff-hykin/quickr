#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)
import { intersection, subtract } from "https://deno.land/x/good@0.7.8/set.js"

console.log(`FileSystem.thisFile is:`,FileSystem.thisFile)
console.log(`FileSystem.thisFolder is:`,FileSystem.thisFolder)
console.log(`FileSystem.workingDirectory is:`,FileSystem.workingDirectory)

await FileSystem.clearAPathFor(`${FileSystem.thisFolder}/run.errors.log`)

console.log(await FileSystem.listFileItemsIn(`../main/`))

console.log("# ")
console.log("# breadthFirstSearch")
console.log("# ")
const bfsResults = await FileSystem.recursivelyListPathsIn(`..`, { searchOrder: 'breadthFirstSearch', shouldntInclude: each=>each.match(/.*(^|\/)\.git($|\/).*/) })
console.log(bfsResults)

console.log("# ")
console.log("# depthFirstSearch")
console.log("# ")
const dfsResults = await FileSystem.recursivelyListPathsIn(`..`, { searchOrder: 'depthFirstSearch', shouldntExplore: each=>each.match(/.*(^|\/)\.git($|\/).*/) })
console.log(dfsResults)

const shouldntExplore = subtract({value: bfsResults, from: dfsResults, })
const shouldntInclude = subtract({value: dfsResults, from: bfsResults, })
console.log(`shouldntExplore uniquely has:`,shouldntExplore)
console.log(`shouldntInclude uniquely has:`,shouldntInclude)

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

console.log("")
console.log("# FileSystem.pathOfCaller")
console.log(FileSystem.pathOfCaller())

console.log("")
console.log("# FileSystem.walkUpImport")
console.log(await FileSystem.walkUpImport("console.js"))

console.log("")
console.log("# await FileSystem.glob('*.log')")
console.log(await FileSystem.glob("*.log"))

console.log("")
console.log(`# await FileSystem.glob("*.log", { startPath: ".." })`)
console.log(await FileSystem.glob("*.log", { startPath: ".." }))

console.log("")
console.log(`# await FileSystem.glob("**/*.log", { startPath: ".." })`)
console.log(await FileSystem.glob("**/*.log", { startPath: ".." }))

const exampleFile = `${FileSystem.workingDirectory}/fs_test/dummy.txt`
await FileSystem.write({path: exampleFile, data: "hello", overwrite: true})
const hardlinkPath = `${FileSystem.workingDirectory}/dummy_hardlink_absolute.txt`
FileSystem.absoluteLink({ existingItem: exampleFile, newItem: `${FileSystem.workingDirectory}/dummy_hardlink_absolute.txt`, hardLink: true, overwrite: true })
FileSystem.absoluteLink({ existingItem: exampleFile, newItem: hardlinkPath, hardLink: false, overwrite: true })
console.log(`writing hello2 to ${hardlinkPath}`)
await FileSystem.append({path: hardlinkPath, data: "hello2"})
console.log(`exampleFile contents ${await FileSystem.read(exampleFile)}`)