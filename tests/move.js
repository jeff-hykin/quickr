const moveMethods = Object.freeze({allowBreakingOutgoingAndIncomingSymlinks:"allowBreakingOutgoingAndIncomingSymlinks",allowBreakingIncomingSymlinks:"allowBreakingIncomingSymlinks",horriblySlowButSafe:"horriblySlowButSafe"})
async function move({existingItem, newLocation, method, possibleIncomingSymlinks, symlinkRemapExclusions}) {
    existingItem = existingItem.path || await FileSystem.info(existingItem)
    possibleIncomingSymlinks = (possibleIncomingSymlinks || [])
    if (method == moveMethods.allowBreakingOutgoingAndIncomingSymlinks) {
        await Deno.move(existingItem.path, newLocation) // TODO
    } else if (possibleIncomingSymlinks || method == moveMethods.allowBreakingIncomingSymlinks) {
        if (existingItem.isFile) { // this includes symlinks
            await Deno.move(existingItem, newLocation, force) // TODO
        }
        // create a placeholder to ensure things don't catestrophically break when cancelled in the middle of a move
        FileSystem.makeAbsoluteSymlink({ existingItem: existingItem, newLocation: newLocation }) // TODO
        const symlinkMappings = {}
        const searchTree = [ existingItem ]
        const internalFolders = []
        while (searchTree.length > 0) {
            const nextFolder = searchTree.shift()
            internalFolders.push(nextFolder.path)
            for (const child of await FileSystem.listItemsIn(nextFolder)) {
                if (child.isSymlink) {
                    // if symlink to symlink, then record all of those
                    Object.assign(symlinkMappings, await FileSystem.symlinkRouteMapping(child))
                } else if (child.isFolder) {
                    searchTree.push(child)
                }
            }
        }
        
        possibleIncomingSymlinks = possibleIncomingSymlinks.map(each=>FileSystem.info(each))
        // find external links
        for (const eachItemPromise of possibleIncomingSymlinks) {
            const eachItem = await eachItemPromise
            if (eachItem.isSymlink) {
                // if symlink to symlink, then record all of those
                Object.assign(symlinkMappings, await FileSystem.symlinkRouteMapping(eachItem))
            }
        }
        
        const hardpathToExisting = await FileSystem.makeHardpath(existingItem.path) // TODO
        const hardpathToNewLocation = await FileSystem.makeHardpath(newLocation) // TODO
        for (const [localSourceHardpath, localNextTargetPath] of Object.entries(symlinkMappings)) {
            const isAbsoluteLink = FileSystem.isAbsolutePath(localNextTargetPath) // TODO
            // 
            // get hardlink to nextTarget
            // 
            let localNextTargetHardpath = localNextTargetPath
            if (!isAbsoluteLink) { // TODO
                localNextTargetHardpath = FileSystem.normalizePath(`${FileSystem.parentPath(localSourceHardpath)}/${localNextTargetPath}`) // TODO
            }
            localNextTargetHardpath = await FileSystem.makeHardpath(localNextTargetHardpath) // TODO
            
            const sourceIsInternal = localSourceHardpath.startsWith(hardpathToExisting)
            const targetIsInternal = localNextTargetHardpath.startsWith(hardpathToExisting)
            if (targetIsInternal) {
                // 
                // compute new target
                // 
                const newLocalNextTargetHardpath = FileSystem.normalizePath(`${hardpathToNewLocation}/${relativeTarget}`) // TODO
                if (isAbsoluteLink) {
                    // simple, just replace the link
                    
                }
                if (sourceIsInternal) {
                    // need to compute the new source before 
                }
                const relativeTarget = localNextTargetHardpath.replace(hardpathToExisting, "")
                
                if (localIsRelativelyLinked) {
                }
            
            // if internal-to-external link, things can still break
            } else if (sourceIsInternal) {
                // FIXME
            }

            if (localNextTargetHardpath.startsWith(hardpathToExisting)) {
                const relativeTarget = localNextTargetHardpath.replace(hardpathToExisting, "")
                const newLocalNextTargetHardpath = FileSystem.normalizePath(`${hardpathToNewLocation}/${relativeTarget}`) // TODO
                if (localIsRelativelyLinked) {
                    // if this source is about to be moved
                    if (localSourceHardpath.startsWith(hardpathToExisting)) {
                        // calculate where its going to be moved to
                        
                    }
                    // FIXME: if the source is about to be moved, then we need to calculate its new location
                    
                    const localPathRelativeToExistingItem = localSourceHardpath.replace(hardpathToExisting) // TODO: problems with
                    const newLocalNextTarget = newLocalNextTargetHardpath.replace()
                }
            }
            // for any target path that includes existingItem path
                // remap it to point to the newLocation
                // preserve absolute vs relative links

            // FIXME: if source is internal, and relatively linked to external item
                // calculate the target using the newLocation and make sure it is the same target as before
                    // there is a problem where it could exist but points to a new item instead of the original item
                    // this behavior could be intentional, in which case symlinkRemapExclusions should be used to prevent this behavior


            // FIXME: if it points inside of the current folder
                // if relatively linked, and source is inside of the folder getting moved
                    // do nothing
                // 
            // FIXME: if source is internal, and relatively linked to external folder
        }
        // FIXME: symlinkRemapExclusions
        // FIXME: check if target of a symlink is already the new location
    } else if (method == moveMethods.horriblySlowButSafe) {
        // FIXME: enumerate the entire file system, find all symlinks that point into the existing path, add all of them to the remapping schedule
    } else {
        throw Error(`The method in FileSystem.move({ method: ${method} }) wasn't valid\nPlease choose one of ${Object.keys(moveMethods)}`)
    }
}



// FIXME
function changeSymlink({ path, newTarget }) {
    // the problem here is that there can be multiple hardlinks of a symlink meaning
    // deleting and replacing one of the hardlinks wouldn't update the other ones
    // directly updating a symlink is also not POSIX
    // so the only way to preserve correctness here is to find all the hardlinks to the 
}

// FIXME
function symlinkRouteMapping() {

}