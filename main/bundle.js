import Babel from "../dependencies/babel@v7.13.8.js"
import { FileSystem } from "./file_system.js"
import { Overwrite, run } from "./run.js"
import { findAll } from "https://deno.land/x/good@0.4.1/string.js"
// import { zip, enumerate, count, } from "https://deno.land/x/good@0.4.1/itertools.js"

// var code = await FileSystem.read(`../tests/misc.js`)
// // var code = "var x = 5"
// var transformed = Babel.transform(code, {
//     presets: ['es2016'],
//     parserOpts: {
//         sourceType: "module",
//         sourceFileName: undefined,
//         plugins: [],
//     },
//     generatorOpts: {
//       filename: "test.js",
//       comments: true,
//       sourceRoot: "/Users/jeffhykin/repos/quickr/tests",
//       sourceFileName: "test.js"
//       minified,
//     }
// })
// console.log(transformed.length)

export const bundle = async ({inputPath, outputPath, esVersion, minified, presets, plugins }) => {
    const inputInfo = await FileSystem.info(inputPath)
    if (inputInfo.doesntExist) {
        throw Error(`\nIt appears the bundle({inputPath}), doesnt exist:\n${inputPath}\n\n`)
    } else {
        const inputOutputPairs = []
        if (inputInfo.isFile) {
            inputOutputPairs.push([inputPath, outputPath])
        } else if (inputInfo.isFolder) {
            for (const eachPath of await FileSystem.listFilePathsIn(inputPath)) {
                const eachOutputPath = `${outputPath}/${FileSystem.basename(eachPath)}`
                inputOutputPairs.push([eachPath, eachOutputPath])
            }
        }
        
        const promises = []
        const newFiles = []
        const tempFolder = await Deno.makeTempDir()
        while (true) {
            for (const [eachInputPath, eachOutputPath] of inputOutputPairs) {
                promises.push(FileSystem.ensureIsFolder(FileSystem.parentPath(eachOutputPath)).then(async ()=>{
                    let code = await FileSystem.read(eachInputPath)
                    // if its bundle-able with deno
                    if (eachInputPath.match(/(\.js|\.ts|\.jsx|\.tsx)$/)) {
                        const basename = FileSystem.basename(eachOutputPath)
                        const tempFilePath = `${tempFolder}/${basename}`
                        // first bundle it
                        var { success, exitCode } = await run("deno", "bundle", eachInputPath, Stdout(Overwrite(tempFilePath))).outcome
                        if (!success) {
                            await FileSystem.remove(tempFolder)
                            Deno.exit(1)
                        } else {
                            // then transpile the result
                            try {
                                code = Babel.transform(code, {
                                    presets: [ esVersion, ...presets ],
                                    plugins,
                                    generatorOpts: {
                                        comments: true,
                                        minified,
                                    }
                                }).code
                            } catch (error) {
                                console.error(`Error while parsing ${eachInputPath}:${error.loc.line}:${error.loc.column}\n${error.message}`)
                                await FileSystem.remove(tempFolder)
                                Deno.exit(1)
                            }
                            // save the result to the output file
                            await FileSystem.write({
                                data: code,
                                path: eachOutputPath,
                            })
                        }
                    // HTML files
                    } else if (eachInputPath.match(/\.html$/)) {
                        // find all javascript imports
                        const results = findAll(code, /<script .+?src=("(.+?)"|'(.+?)'|(.+?) ).+?>[ \t\n\r]*<\/script>/)
                        // iteratively replace the string
                            // bundle file
                            // read file
                            // transpile
                            // replace all  </script> with  <\/script>
                        
                        // convert them, and inline them
                    // CSS files
                    } else if () {

                    // Unsupported Files
                    } else {

                    }
                }))
            }
        }

        await FileSystem.remove(tempFolder)
    }
}