// import { Parser, parserFromWasm, flatNodeList, xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@0.2.1.3/main.js"
import { Parser, parserFromWasm, xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@0.2.6.0/main.js"
import bash from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/676ffa3b93768b8ac628fd5c61656f7dc41ba413/main/bash.js" 
import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.72/main/file_system.js"
import { run, hasCommand, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo, } from "https://deno.land/x/quickr@0.6.72/main/run.js"
import { Console, clearAnsiStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, strikethrough, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.6.72/main/console.js"

import { deepCopy, deepCopySymbol, allKeyDescriptions, deepSortObject, shallowSortObject,isAsyncIterable, isSyncIterable, allKeys } from "https://esm.sh/gh/jeff-hykin/good-js@1.17.0.0/source/value.js"

import { parseRawEnv } from "./bash_to_js.js"

const parser = await parserFromWasm(bash)
const tree = parser.parse(await Deno.readTextFile(`${FileSystem.thisFolder}/test.sh`))
const root = tree.rootNode

// parseRawEnv(
//     root.quickQueryFirst("(command)")
// )
let indent = ""
// for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
//     // general logic
//         // first pass: identify every non-compound command and every compound command
//             // give each one an object
//             // two way link between the tree and the object
//         // seconds pass: compute an order-of-operations dependency graph
//             // - stdout/err is used for args of another
//             // - stdout/err is piped to another
//             // - return code is used in && or ||
//             // - return code in conditional


//     const isLeafNode = direction == "-"
//     if (node.type == "variable_assignment") {
//         console.debug(`allKeys(node) is:`,node.childForFieldName)
//         console.debug(`allKeys(node) is:`,allKeys(node.childForFieldName))
//         console.debug(`allKeys(node) is:`,node.childForFieldName("name"))
//     }
//     if (isLeafNode) {
//         console.log(indent+`<${node.type} text=${JSON.stringify(node.text)} />`)
//     } if (direction == "->") {
//         console.log(indent+`<${node.type}>`)
//         indent += "    "
//     } else if (direction == "<-") {
//         indent = indent.slice(0,-4)
//         console.log(indent+`</${node.type}>`)
//     }
// }

await FileSystem.write({
    data: xmlStylePreview(tree.rootNode),
    path: `${FileSystem.thisFolder}/test.sh.xml`,
})
