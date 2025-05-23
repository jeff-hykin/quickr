#!/usr/bin/env -S deno run --allow-all
const { FileSystem } = await import(`../main/file_system.js`)
import { intersection, subtract } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/set.js"

console.log(`FileSystem.thisFile is:`,FileSystem.thisFile)
console.log(`FileSystem.thisFolder is:`,FileSystem.thisFolder)
console.log(`FileSystem.workingDirectory is:`,FileSystem.workingDirectory)

await FileSystem.clearAPathFor(`${FileSystem.thisFolder}/run.errors.log`)

console.log("# ")
console.log("# listFileItemsIn")
console.log("# ")
console.log(await FileSystem.listFileItemsIn(`../main/`))
console.log(await FileSystem.sync.listBasenamesIn(`../main/`))

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
const hardlinkPath = `${FileSystem.workingDirectory}/dummy_hardlink.txt`
FileSystem.hardLink({ existingItem: exampleFile, newItem: hardlinkPath, overwrite: true })
FileSystem.absoluteLink({ existingItem: exampleFile, newItem: `${FileSystem.workingDirectory}/dummy_absolute.txt`, overwrite: true })
FileSystem.relativeLink({ existingItem: exampleFile, newItem: `${FileSystem.workingDirectory}/dummy_relative.txt`, overwrite: true })
console.log(`appending hello2 to ${hardlinkPath}`)
await FileSystem.append({path: hardlinkPath, data: "hello2", overwrite: true})
console.log(`hardlinkPath contents ${await FileSystem.read(hardlinkPath)}`)
console.log(`exampleFile contents ${await FileSystem.read(exampleFile)}`)

FileSystem.sync.rename({
    from: hardlinkPath,
    to: hardlinkPath+".renamed",
    overwrite: true,
})
console.log(`hardlinkPath+".renamed" is:`)
console.log(FileSystem.sync.read(hardlinkPath+".renamed"))


// console.debug(`FileSystem.isFileOrSymlinkToNormalFile(hardlinkPath+".renamed") is:`,await FileSystem.isFileOrSymlinkToNormalFile(hardlinkPath+".renamed"))
// console.debug(`FileSystem.isFileOrSymlinkToNormalFile(hardlinkPath+".renamed").and.isAbsolutePath is:`,await FileSystem.isFileHardlink(hardlinkPath+".renamed").and.isAbsolutePath)
// console.debug(`FileSystem.isFileOrSymlinkToNormalFile(hardlinkPath+".renamed").and.isSymlink is:`,await FileSystem.isFileHardlink(hardlinkPath+".renamed").and.isSymlink)