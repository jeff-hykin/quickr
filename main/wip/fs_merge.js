import { FileSystem } from "https://deno.land/x/quickr/main/file_system.js"

export const fsMerge = ({ destination, paths})=>{
    FileSystem.sync.ensureIsFolder(destination)
    for (const eachSo of paths) {
        for (const eachItem of FileSystem.sync.recursivelyListItemsIn(eachSo)) {
            
            FileSystem.sync.move({
                path: eachItem.path,
                newParentFolder: destination,
            })
        }
    }
}