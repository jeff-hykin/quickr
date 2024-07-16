export const escapeGlobForPosix = (glob)=>{
    return glob.replace(/[\[\\\*\{\?@\+\!]/g, `\\$&`)
}