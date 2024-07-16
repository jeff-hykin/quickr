export const escapeGlobForWindows = (glob)=>{
    return glob.replace(/[\[`\*\{\?@\+\!]/g, "`$&")
}