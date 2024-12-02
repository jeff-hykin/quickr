import { Parser, parserFromWasm, xmlStylePreview, flatNodeList } from "https://deno.land/x/deno_tree_sitter@0.2.6.0/main.js"
import bash from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/676ffa3b93768b8ac628fd5c61656f7dc41ba413/main/bash.js" 
import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.72/main/file_system.js"
import { zipShort } from "https://deno.land/x/good@1.13.1.0/flattened/zip_short.js"
import { escapeJsString } from "https://deno.land/x/good@1.13.2.0/flattened/escape_js_string.js"

const parser = await parserFromWasm(bash) // path or Uint8Array 

// TODO: test {}'s for command groups
// every command (by definition) has:
    // - return code
    // - stdin
    // - stdout
    // - stderr
    // - args
// processes also have:
    // - pid

const noComments = (list) => list.filter(each=>each.type!="comment")

// NOTE: this init function cannot use any closures (e.g. functions or vars) beacuse its .toString()'ed
async function setup() {
    const $ = (await import("https://deno.land/x/dax@0.39.2/mod.ts")).default
    const $$ = (...args)=>$(...args).noThrow()
    const reservedCharMap = {
        "&": "\\\\x26",
        "!": "\\\\x21",
        "#": "\\\\x23",
        "$": "\\\\$",
        "%": "\\\\x25",
        "*": "\\\\*",
        "+": "\\\\+",
        ",": "\\\\x2c",
        ".": "\\\\.",
        ":": "\\\\x3a",
        ";": "\\\\x3b",
        "<": "\\\\x3c",
        "=": "\\\\x3d",
        ">": "\\\\x3e",
        "?": "\\\\?",
        "@": "\\\\x40",
        "^": "\\\\^",
        "\`": "\\\\x60",
        "~": "\\\\x7e",
        "(": "\\\\(",
        ")": "\\\\)",
        "[": "\\\\[",
        "]": "\\\\]",
        "{": "\\\\{",
        "}": "\\\\}",
        "/": "\\\\/",
        "-": "\\\\x2d",
        "\\\\": "\\\\\\\\",
        "|": "\\\\|",
    }

    const RX_REGEXP_ESCAPE = new RegExp(
        `[${Object.values(reservedCharMap).join("")}]`,
        "gu",
    )

    function escapeRegexMatch(str) {
        return str.replaceAll(
            RX_REGEXP_ESCAPE,
            (m) => reservedCharMap[m],
        )
    }
    
    var _envShim = {}
    var Deno = globalThis.Deno||{
        pid:1,
        env: {
            toObject() {
                return _envShim
            },
            get(key) {
                return _envShim[key]
            },
            set(key, value) {
                _envShim[key] = value
            },
            delete(key) {
                delete _envShim[key]
            },
        }
    }
    
    function makeShell({
        args=[],
        stdin=Deno.stdin,
        stdout=Deno.stdout,
        stderr=Deno.stderr,
        env={...Deno.env.toObject()},
        exportedEnvNames=null,
        pid=Deno.pid,
        pidOfLastProcess=Deno.pid-1,
        lastStatus={
            code: 0,
            signal: 0,
        },
    }={}) {
        const initial = {
            stdin,
            stdout,
            stderr,
            pid,
            pidOfLastProcess,
            lastStatus, // FIXME: as of writing, this var never gets updated
            jobs: [],
            aliases: {},
            functions: {},
            shellOpts: "himBH",
            shoptOpts: {
                "cdable_vars":             false,
                "cdspell":                 false,
                "checkhash":               false,
                "checkwinsize":            false,
                "cmdhist":                 true,
                "compat31":                false,
                "dotglob":                 false,
                "execfail":                false,
                "expand_aliases":          true,
                "extdebug":                false,
                "extglob":                 false,
                "extquote":                true,
                "failglob":                false,
                "force_fignore":           true,
                "gnu_errfmt":              false,
                "histappend":              false,
                "histreedit":              false,
                "histverify":              false,
                "hostcomplete":            true,
                "huponexit":               false,
                "interactive_comments":    true,
                "lithist":                 false,
                "login_shell":             false,
                "mailwarn":                false,
                "no_empty_cmd_completion": false,
                "nocaseglob":              false,
                "nocasematch":             false,
                "nullglob":                false,
                "progcomp":                true,
                "promptvars":              true,
                "restricted_shell":        false,
                "shift_verbose":           false,
                "sourcepath":              true,
                "xpg_echo":                false,
            },
            exportedEnvNames: new Set([...exportedEnvNames]),
            env: {
                "$": pid,
                // possible TODO: change this path to be the path of the caller, not the path to where this code is
                "0": decodeURIComponent(new URL(import.meta.url).pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")), //TODO: check that this replace is still needed
                "SHLVL": env["SHLVL"] || "0",
                ...env,
            },
        }
        delete inital.exportedEnv["SHLVL"]
        const createScope = (prevScope, newArgs)=>{
            const scope = {
                args: newArgs,
                env: null,
                _localEnvObj: {},
            }
            if (newArgs == null) {
                // no copy because shift would affect both
                // TODO: check if this^ is always right
                scope.args = prevScope.args
            }
            scope.env = new Proxy(scope._localEnvObj, {
                // ownKeys(target, ...args) {
                //     return Reflect.ownKeys(target, ...args) 
                // },
                get(original, key, ...args) {
                    // Numbered args
                    if (key-0>0) {
                        return scope.args[key]||""
                    }
                    // specials
                    switch (key) {
                        case "@":
                            return scope.args
                        case "&":
                            return `${shell.pidOfLastProcess}`
                        case "-":
                            return shell.shellOpts
                        case "?":
                            return `${shell.lastStatus?.code||0}`
                        case "!":
                            return `${shell.lastStatus?.signal||0}`
                        case "#":
                            return `${scope.args.length}`
                        case "*":
                            return scope.args.join(" ")
                    }
                    // grab local one first
                    if (Reflect.has(original, key)) {
                        return Reflect.get(original, key, ...args)
                    } else {
                        return Reflect.get(prevScope.env, key, ...args)
                    }
                },
                set(original, key, ...args) {
                    // if local exists, or external one doesnt, then set local
                    if (Reflect.has(original, key) || !Reflect.has(prevScope.env, key)) {
                        return Reflect.set(original, key, ...args)
                    }
                    // otherwise, set external
                    return Reflect.set(prevScope.env, key, ...args)
                },
                // has: Reflect.has,
                // deleteProperty: Reflect.deleteProperty,
                // isExtensible: Reflect.isExtensible,
                // preventExtensions: Reflect.preventExtensions,
                // setPrototypeOf: Reflect.setPrototypeOf,
                // defineProperty: Reflect.defineProperty,
                // getPrototypeOf: Reflect.getPrototypeOf,
                // getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor,
            })

            return scope
        }
        
        const shell = {
            ...initial,
            _scopeStack: [
                createScope(null, args),
            ],
            get exportedEnv() {
                const vars = {}
                for (const each of exportedEnvNames) {
                    vars[each] = shell.env[each]
                }
                return vars
            },
            // env
            get env() {
                return shell._scopeStack.slice(-1)[0].env
            },
            // FIXME: rework everything with consideration for arrays
            getVar(name) {
                return this.asString(this.env[name])
            },
            split(value) {
                // FIXME: the split might need to have a dynamic split character
                return this.asString(value).split(/\s+/g).filter(each=>each!="")
                // NOTE: the filtering of empty strings seems to match bash behavior
                //       but I'm not sure about the spec
                // it IS a notable edgecase, since it makes empty args impossible sometimes
            },
            asString(value) {
                if (value instanceof Array) {
                    return value.join(" ")
                } else if (value == null) {
                    return ""
                } else if (typeof value == "string") {
                    return value
                } else {
                    console.debug(`value:`, value)
                    throw Error(`shell.asString() got a weird value: ${typeof value}, ${value}`, value)
                }
            },
            async argExpansionPass(arg) {
                // NOTE: this sometimes returns an array, and sometimes a string
                // this needs to handle ${varName#a} and **/*, ~, etc based on shell.shellOpts
                // NOTE: ${@:1} and ${*:1} are both treated like arrays, not strings
                return arg
            },
        }
        
        const overridableBuiltins = {
            "help": ()=>{/*FIXME*/},
            "builtin": ()=>{/*FIXME*/},
            "alias": ()=>{/*FIXME*/},
            ".": ()=>{/*FIXME*/},
            "bind": ()=>{/*FIXME*/},
            "command": ()=>{/*FIXME*/},
            "complete": ()=>{/*FIXME*/},
            "declare": ()=>{/*FIXME*/},
            "disown": ()=>{/*FIXME*/},
            "enable": ()=>{/*FIXME*/},
            "exec": ()=>{/*FIXME*/},
            "export": ()=>{/*FIXME*/},
            "fc": ()=>{/*FIXME*/},
            "hash": ()=>{/*FIXME*/},
            "history": ()=>{/*FIXME*/},
            "jobs": ()=>{/*FIXME*/},
            "let": ()=>{/*FIXME*/},
            "logout": ()=>{/*FIXME*/},
            "printf": ()=>{/*FIXME*/},
            "pwd": ()=>{/*FIXME*/},
            "readonly": ()=>{/*FIXME*/},
            "shift": ()=>{/*FIXME*/},
            "source": ()=>{/*FIXME*/},
            "test": ()=>{/*FIXME*/},
            "times": ()=>{/*FIXME*/},
            "true": ()=>{/*FIXME*/},
            "typeset": ()=>{/*FIXME*/},
            "umask": ()=>{/*FIXME*/},
            "unset": ()=>{/*FIXME*/},
            ":": ()=>{/*FIXME*/},
            "bg": ()=>{/*FIXME*/},
            "break": ()=>{/*FIXME*/},
            "caller": ()=>{/*FIXME*/},
            "cd": ()=>{/*FIXME*/},
            "compgen": ()=>{/*FIXME*/},
            "continue": ()=>{/*FIXME*/},
            "dirs": ()=>{/*FIXME*/},
            "echo": ()=>{/*FIXME*/},
            "eval": ()=>{/*FIXME*/},
            "exit": ()=>{/*FIXME*/},
            "false": ()=>{/*FIXME*/},
            "fg": ()=>{/*FIXME*/},
            "getopts": ()=>{/*FIXME*/},
            "kill": ()=>{/*FIXME*/},
            "local": ()=>{/*FIXME*/},
            "popd": ()=>{/*FIXME*/},
            "pushd": ()=>{/*FIXME*/},
            "read": ()=>{/*FIXME*/},
            "return": ()=>{/*FIXME*/},
            "set": ()=>{
                /*FIXME*/
                // this can change all the arguments for $@
            },
            "shopt": ()=>{/*FIXME*/},
            "suspend": ()=>{/*FIXME*/},
            "trap": ()=>{/*FIXME*/},
            "type": ()=>{/*FIXME*/},
            "ulimit": ()=>{/*FIXME*/},
            "unalias": ()=>{/*FIXME*/},
            "wait": ()=>{/*FIXME*/},
        }
        const cannotBeFunctionNames = {
            "if": ()=>{ /*FIXME*/ },
            "for": ()=>{ /*FIXME*/ },
            "case": ()=>{ /*FIXME*/ },
            "function": ()=>{ /*FIXME*/ },
            "select": ()=>{ /*FIXME*/ },
            "while": ()=>{ /*FIXME*/ },
            "[[": ()=>{ /*FIXME*/ },
            "time": ()=>{ /*FIXME*/ },
            "until": ()=>{ /*FIXME*/ },
        }
        const cannotBeAliasOrFunctionName = {
            "((": ()=>{ /*FIXME*/ },
        }
        
        return shell
    }

    return {
        makeShell,
        $,
        $$,
    }
}
function compoundCommand2Code(node, {isTopLevel=true}={}) {
    // will be one of:
        // <command>
        // <redirected_statement>
        // <pipeline>
        // <list> // which is for &&, ||
    let topLevel
    const { type, children } = node
    if (type == "command") {
        const envCode = prefixedVariableAssignment2Code(commandNode)
        const argsCode = commandArgs2Code(commandNode)
        // FIXME: <herestring_redirect> can appear in a normal command
        return "$$`${"+argsCode+"}`.env("+envCode+")"
    } else if (type == "redirected_statement") {
        let innerCode
        
        // optimization for simple case (unpack child and utilize dax features)
        if (children[0].type == "command") {
            // could be <command> could be <list>, probably could also be <pipeline>
            const commandNode = children[0]
            const envCode = prefixedVariableAssignment2Code(commandNode)
            const argsCode = commandArgs2Code(commandNode)
            const redirections = children.filter(each=>each.type == "file_redirect" || each.type == "heredoc_redirect" || each.type == "herestring_redirect")
            const fileRedirections = redirections.filter(each=>each.type == "file_redirect")
            // 
            // check easy case (99% of the time)
            // 
            if (redirections.length == 1 && fileRedirections.length == 1) {
                // FIXME: check what bash does with globs, brackets, etc in the expansion case
                //        if it expands those then this is not up to spec
                const redirect = fileRedirections[0]
                const allowedTypes = new Set(["file_redirect", ">", "file_descriptor", ">&", ">>",  "string", '"', "string_content", "simple_expansion",])
                // <expansion> does not work with dax, and I'm sure 
                const daxCanHandleIt = flatNodeList(redirect).every(each=>allowedTypes.has(each.type))
                if (daxCanHandleIt) {
                    const codeToInject = escapeJsString(redirect.text).slice(1,-1)
                    const execCode = "$$`${"+argsCode+"} "+codeToInject+"`.env("+envCode+")"
                    return execCode
                }
            }
            innerCode = "$$`${"+argsCode+"}`.env("+envCode+")"
        } else {
            innerCode = compoundCommand2Code(children[0])
        }
        
        // <file_redirect>  
        // <heredoc_redirect>  
        // <herestring_redirect> 

        // FIXME: handle redirections
        // - redirects also need arg parsing/expansion
        // - HEREDOCS
        // manually need to handle:
            // - stdin <<<
            // - multiple redirects (swapping stdout and stderr, or feeding them to different sources)
        // auto handling:
            // single redirect for: 
                // - append
                // - stdout to stderr
                // - stderr to stderr
        console.warn(`got a redirect I was unable to handle`)
        return innerCode
    } else if (type == "list") {
        throw Error(`Currently unable to handle &&, ||`)
    } else if (type == "pipeline") {
        throw Error(`Currently unable to handle pipes`)
    } else {
        throw Error(`Currently unable to command of type: ${type}`)
    }
}

/**
 * step1 prefixed env vars
 *
 * @example
 * ```js
 * import { Parser, parserFromWasm, xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@0.2.6.0/main.js"
 * import bash from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/676ffa3b93768b8ac628fd5c61656f7dc41ba413/main/bash.js" 
 * const root = (await parserFromWasm(bash)).parse(`VAR1=10 VAR2+=11 echo hi6`).rootNode
 * 
 * console.log(prefixedVariableAssignment2Code(
 *     root.quickQueryFirst("(command)")
 * ))
 * ```
 */
export function prefixedVariableAssignment2Code(node) {
    // node should always be <command>

    // keys=var names
    const rawEnv = parseRawEnv(node)
    
    let chunks = []
    let output = "shell.exportedEnv"
    if (Object.values(rawEnv).length > 0) {
        chunks.push(`{ ...shell.exportedEnv, `)
        for (const [key, { operation, node }] of Object.entries(rawEnv)) {

            if (operation == "=") {
                chunks.push(`${JSON.stringify(key)}: ${expansionOfEnvAssignment2Code(node)}, `)
            } else if (operation == "+=") {
                chunks.push(`${JSON.stringify(key)}: shell.getVar(${JSON.stringify(key)})+${expansionOfEnvAssignment2Code(node)}, `)
            }
        }
        chunks.push(`}`)
        output = chunks.join("")
    }
    return output
}

/**
 * step1 prefixed env vars
 *
 * @example
 * ```js
 * import { Parser, parserFromWasm, xmlStylePreview } from "https://deno.land/x/deno_tree_sitter@0.2.6.0/main.js"
 * import bash from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/676ffa3b93768b8ac628fd5c61656f7dc41ba413/main/bash.js" 
 * const root = (await parserFromWasm(bash)).parse(`VAR1=10 VAR2+=11 echo hi6`).rootNode
 * 
 * console.log(parseRawEnv(
 *     root.quickQueryFirst("(command)")
 * ))
 * ```
 */
export function parseRawEnv(node) {
    let env = {}
    for (const each of node.children) {
        if (each.type == "variable_assignment") {
            const [ nameNode, assignmentNode, valueNode ] = each.children
            env[nameNode.text] = {
                operation: assignmentNode.text,
                node: valueNode,
            }
        }
    }
    return env
}

// NOTE: needs to return a string that, when eval'd, returns an array of strings
function commandArgs2Code(node) {
    const children = noComments(node.children)

    // assume worst case: every arg needs expanding, and unknown number of args
    let chunks = [
        `[`
    ]
    // the number of args passed to a command is not always known at parse time
    for (let each of children) {
        if (each.type == "variable_assignment" || each.type == "file_redirect" || each.type == "heredoc_redirect" || each.type == "herestring_redirect") {
            continue
        }
        // ignore the command name wrapper
        if (each.type == "command_name") {
            each = each.children[0]
        }

        // can be any of: (incomplete list)
            // <simple_expansion>
            // <expansion>
            // <concatenation>
            // <command_substitution>
            // <arithmetic_expansion>
            // <string>
            // <word>
            // <raw_string>
            // <number>
        chunks.push(argInArray2Code(each))
    }
    chunks.push("]")
    return chunks.join("")
}

function argInArray2Code(node, directlyInsideDoubleQuotes=false) {
    // can be any of: (probably incomplete list)
        // <number>
        // <raw_string>
        // <simple_expansion>
        // <expansion>
        // <command_substitution>
        // <string>
        // <word>
        // <arithmetic_expansion>
        // <concatenation>
    
    const each = node
    const pureArg = tryPureArg2Code(each)
    // all raw_string, number, and some concatenation are handled here
    if (pureArg != null) {
        return `${pureArg},`
    } else {
        if (type == "simple_expansion" || (type == "expansion" && each.children[1].type == "variable_name" && each.text == `\${${each.children[1].text}}`)) {
            const name = each.children.find(each=>each.type=="variable_name")
            if (directlyInsideDoubleQuotes && name == "@") {
                return `...shell.env["@"],`
            }
            // TODO: will probably need to change this when adding array support
            return `...shell.split(shell.env[${JSON.stringify(name)}]),`
            // for the edgecase of $@ with no quotes, the above should still be equivlent to:
            // return `args.push(...shell.env["@"].map(each=>shell.split(each)).flat(Infinity))`
        } else if (type == "expansion" || type == "word") {
            return `...await shell.argExpansionPass(${escapeJsString(each.text)}),`
        } else if (type == "command_substitution") {
            return `${compoundCommand2Code(each.children[1])},`
        } else if (type == "string") {
            let parts = ["["]
            for (const eachPart of each.children) {
                if (eachPart.type == '"') {
                    continue
                } else if (eachPart.type == "string_content") {
                    // AFAIK: only \ and " need un-escaping (there will never be $ in here)
                    parts.push(`${escapeJsString(eachPart.text.replace(/\\(\\|")/g,"$1"))},`)
                } else { 
                    // should only ever be <command_substitution>, <simple_expansion>, <expansion>, <arithmetic_expansion>
                    const directlyInsideDoubleQuotes = true // this is needed for the edgecase of $@
                    parts.push(argInArray2Code(eachPart, directlyInsideDoubleQuotes))
                }
            }
            parts.push("].join('')")
            return parts.join("")
        } else if (type == "concatenation") {
            return `[${each.children.map(argInArray2Code).join("")}]).join(""),`
        } else if (type == "arithmetic_expansion") {
            throw Error(`arithmetic expansion is not yet supported: ${each.text}`)
        } else {
            throw Error(`${type} is not yet supported as an argument: ${each.text}`)
        }
    }
}

function joinPureStringParts(parts) {
    let chunks = []
    for (const chunk of parts) {
        // this is a visual optimization to combine multiple backtick strings into one
        if (chunk.startsWith('`') && chunks.length > 0 && chunks[chunks.length-1].endsWith('`')) {
            chunks[chunks.length-1] = chunks[chunks.length-1].slice(0,-1) + chunk.slice(1,)
        } else {
            chunks.push(chunk)
        }
    }
    return chunks.join("+")
}
function tryPureArg2Code(node) {
    if (!definitelyPureArg(node)) {
        return null
    }
    if (node.type == "number") {
        return escapeJsString(node.text)
    } else if (node.type == "raw_string") {
        return escapeJsString(node.text.slice(1,-1))
    } else if (node.type == "string" && node.children.every(each=>each.type =='"' || each.type == "string_content")) {
        // .join() is a bit uncessary as there should only ever be 1 child
        const content = node.children.filter(each=>each.type == "string_content").map(each=>each.text).join("")
        return escapeJsString(content.replace(/\\(\\|")/g,"$1"))
    } else if (node.type == "word" && !hasSpecialCharacters(node.text)) {
        // FIXME: probably doesnt handle spaces or other escaped stuff right
        return escapeJsString(node.text)
    } else if (node.type == "concatenation" && node.children.every(definitelyPureArg)) {
        return joinPureStringParts(node.children.map(pureArgToString))
    }
}
const hasSpecialCharacters = text=>text.match(/[\\*{\\?@\\[]/)
function definitelyPureArg(node) {
    if (node.type == "number") {
        return true
    } else if (node.type == "raw_string") {
        return true
    } else if (node.type == "string" && node.children.every(each=>each.type =='"' || each.type == "string_content")) {
        return true
    } else if (node.type == "word" && !hasSpecialCharacters(node.text)) {
        return true
    } else if (node.type == "concatenation") {
        return node.children.every(pureArg)
    }
    return false
}

// NOTE: sometimes this will return `await (stuff)`
function expansionOfEnvAssignment2Code(node) {
    // node is often one of:
        // <number>
        // <concatenation>
        // <string>
        // <word>
        // <raw_string>
        // <arithmetic_expansion>
    const output = tryPureArg2Code(node)
    if (typeof output == 'string') {
        return output
    }
    
    if (node.type == "word") {
        // FIXME: this is slightly wrong, I think there are edgecases where argument expansion is different than env assignment expansion
        //      "$@" is probably one of the edgecases (and it might already be handled)
        return `shell.asString(await shell.argExpansionPass(${escapeJsString(node.text)}))`
    } else {
        console.warn(`not yet implemented: expansionOfEnvAssignment2Code() does not support type: ${node.type}`)
        // FIXME: this needs to handle strings and sub-shell expansions (recursive with compoundCommand2Code)
        return escapeJsString(node.text.slice(1,-1))
    }
}

function bashToJs(text) {
        // function handleCommand(statement, {returnStringOfStdout=false}={}) {
        //     const children = noComments(statement.children)
        //     if (
        //         statement.type=="redirected_statement"
        //         && children[0].type == "command"
        //         && children.slice(1,).every(each=>each.type=="file_redirect")
        //         && noComments(children[0]).slice(1,).every(each=>each.type=="raw_string")
        //         // <command>
        //         //     <command_name>
        //         //         <word text="echo" />
        //         //     </command_name>
        //         //     <raw_string text="'0'" />
        //         // </command>
        //         // <file_redirect>
        //         //     <> text=">" />
        //         //     <word text="a" />
        //         // </file_redirect></file_redirect>
        //     ) {
        //         return `
        //             //     Deno.Command({
        //             //         args: args,
        //             //         stdout: "piped",
        //             //         stderr: "piped",
        //             //     })
        //         `
        //     }
        //     const baseCommand = (statement.type == "command") ? handleBaseCommand(statement) : handleBaseCommand(statement.children.filter(each => each.type == "command")[0])
        //     let code = `await (async ()=>{
        //         let {args, env} = ${baseCommand}
        //     `
        // 
        //     // FIXME: find all the needed redirections
        //         // code += `
        //         //     Deno.Command({
        //         //         args: args,
        //         //         stdout: "piped",
        //         //         stderr: "piped",
        //         //     })
        //         // `
        // 
        //     code += `})()`
        //     return code
        // }


        // function handleStatement(statement) {
        //     // redirection
        //         // TODO: dont for tilde expansion inside redirects
        //     let code = `await (async ()=>{
        //         const statement = ${JSON.stringify(statement)}
        //         let env = newScope()
        //         let args = []
        //         for (let each of statement) {
        //             // 
        //             // env
        //             // 
        //             if (each.type == "variable_assignment") {
        //                 const varName = each.children[0].text
        //                 const value = each.children[2].text
        //                 env[each.children[0].text] = await eval(assignmentValue(value))
        //             }

        //             // 
        //             // arg handling
        //             // 
        //             // dont treat command_name any differently
        //             if (each.type == "command_name") {
        //                 each = each.children[0]
        //             }
        //             // just append to the args
        //             if (each.type == "number"||each.type == "word"&&!hasSpecialCharacters(each.text)) {
        //                 // FIXME: handle escapes
        //                 args.push(each.text)
        //             } else if (each.type == "raw_string") {
        //                 args.push(each.text.slice(1,-1))
        //             } else if (each.type == "command_substitution") {
        //                 args.push(
        //                     handleCommand(each.children[1], {returnStringOfStdout: true})
        //                 )
        //             } else {
        //                 // brace expansion: range
        //                 // brace expansion: list
        //                     // nested expansions
        //                 // pattern matching
        //                     // *
        //                     // **
        //                     // ?
        //                     // []
        //                     // ?()
        //                     // @()
        //                     // *()
        //                     // +()
        //                     // !()
        //                 // string
        //                 // simple_expansion
        //                 // arithmetic_expansion
        //                 // array asscess 
        //                 // expansion
        //                     // \${parameter:-word}
        //                     // \${parameter:=word}
        //                     // \${parameter:?word}
        //                     // \${parameter:+word}
        //                     // \${parameter:digits:digits}
        //                     // \${!prefix*}
        //                     // \${!prefix@}
        //                     // \${!name[@]}
        //                     // \${!name[*]}
        //                     // \${#parameter}
        //                     // \${parameter#word}
        //                     // \${parameter##word}
        //                     // \${parameter%word}
        //                     // \${parameter%%word}
        //                     // \${parameter/pattern/string}
        //                     // \${parameter//pattern/string}
        //                     // \${parameter/#pattern/string}
        //                     // \${parameter/%pattern/string}
        //                     // \${parameter^pattern}
        //                     // \${parameter^^pattern}
        //                     // \${parameter,pattern}
        //                     // \${parameter,,pattern}
        //                     // \${parameter@operator}
        //                 // tilde expansion
        //                 // concatenation
        //                 if (each.type == "string") {
        //                     // FIXME: handle escapes
        //                     let arg = ""
        //                     for (const eachPart of each.children) {
        //                         if (eachPart.type == "string_content") {
        //                             arg += eachPart.text
        //                         } else if (eachPart.type == "command_substitution") {
        //                             arg += await eval(argumentToJs(eachPart.children[1].text))
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     })()`

        //     // 
        //     // command name
        //     // 

        //     const commandId = scheduledValues.length
        //     const commandDeclare = {
        //         expressionId: commandId,
        //         dependsOn: [],
        //         commandId: commandId,
        //         isPromise: false,
        //         code: `let v${commandId} = `, // will need to be finished later
        //         spawnExpression: { 
        //             expressionId: commandId+1,
        //             dependsOn: [commandId],
        //             isPromise: false,
        //             code: `let v${commandId+1} = v${commandId}.spawn()`,
        //         },
        //         exitEventExpression: {
        //             expressionId: commandId+2,
        //             dependsOn: [commandId+1],
        //             isPromise: true,
        //             code: `let v${commandId+2} = v${commandId+1}.status`,
        //         },
        //     }
        //     scheduledValues.push(commandDeclare)
        //     let args = []
        //     for (const each of statement.traverse()) {
        //         // check for literal args
        //         // if (each.type == "concatenation") {
        //         // if (each.type == "number") {
        //         if (each.type == "word") {
        //             if (!each.text.match(/[\*{}]/)) {
        //                 args.push(JSON.stringify(each.text))
        //             } else {
        //                 args.push(`
        //                     (()=>{
        //                         // FIXME: check glob options (e.g. including "." and ".." and hidden or not)
        //                         [...Deno.readDirSync(".")].map(each=>each.name)
        //                         Deno.listAddrSync("${each.text}")
        //                     })()
        //                 `)
        //                 commandDeclare.dependsOn(scheduledValues.length)
        //                 scheduledValues.push({
        //                     expressionId: scheduledValues.length,
        //                     dependsOn: [],
        //                 })
        //                 scheduledValues.push({
        //                     expressionId: scheduledValues.length,
        //                     dependsOn: [],
        //                 })
        //             }
        //         }
        //         // if (each.type == "word") {
        //         if (each.type == "command_substitution") {
        //             const subCommand = translate(each.children[1], scheduledValues)
        //             commandDeclare.argsDependsOn.push(subCommand.id)
        //             subCommand.sendStdoutTo.push(commandId)
        //         }
        //         // if (each.type == "redirected_statement") {
        //         //     const subCommand = translate(each.children[0], scheduledValues)
        //         //     for (const eachRedirect of each.children.filter(each => each.type == "file_redirect")) {
                        
        //         //     }
        //         //     statementInfo.stdinDependsOn.push(redirectedStatement.id)
        //         //     if (each.children[1].type == "file_redirect") {
        //         //         statementInfo.sendStdinTo.push(redirectedStatement.id)
        //         //     }
        //         // }
        //         // if (!types.includes(each.type)) {
        //         //     return false
        //         // }
        //     }
        // }
        // function translate(statement, scheduledValues) {
        //     if (statement.type == ";") {
        //         return `;\n`
        //     } else if (statement.type == "comment") {
        //         return `\n    // ${statement.text.replace(/\n/g, "//\n")}\n`
        //     } else if (statement.type == "command") {
        //         let command = handleCommand(statement, scheduledValues)
        //         // FIXME
        //         return "something FIXME"
        //     }
        // }
        
    // NOTE: because aliases are insane and impossible to statically analyze, this system treats them as merely higher-priority functions,
    // not the anything-goes stupid C++-marco like behavior of true bash aliases
    // a 100% translation of bash to js is possible, but we couldn't use the tree sitter; I'd need to write a parser myself
    for (const eachRootStatement of tree.rootNode.children) {
        if (statement.type == ";") {
            continue
        }
        // add comment as a reference
        javascript += `\n    // ${eachRootStatement.text.replace(/\n/g, "//\n")}\n`
        // translate
        for (const [ parents, node, direction ] of eachRootStatement.traverse()) {
            // general logic
                // first pass: identify every non-compound command and every compound command
                    // give each one an object
                    // two way link between the tree and the object
                // seconds pass: compute an order-of-operations dependency graph
                    // - stdout/err is used for args of another
                    // - stdout/err is piped to another
                    // - return code is used in && or ||
                    // - return code in conditional


            const isLeafNode = direction == "-"
            if (isLeafNode) {
                console.log(indent+`<${node.type} text=${JSON.stringify(node.text)} />`)
            } if (direction == "->") {
                console.log(indent+`<${node.type}>`)
                indent += "    "
            } else if (direction == "<-") {
                indent = indent.slice(0,-4)
                console.log(indent+`</${node.type}>`)
            }
        }
    }

    // TODO: handle "set" for shelloptions
    // TODO: handle source/.
    // TODO: handle "unset" [-f] [-v] [name ...]
    let tree = parser.parse(text)
    let indent = ""
    for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
        const isLeafNode = direction == "-"
        if (isLeafNode) {
            console.log(indent+`<${node.type} text=${JSON.stringify(node.text)} />`)
        } if (direction == "->") {
            console.log(indent+`<${node.type}>`)
            indent += "    "
        } else if (direction == "<-") {
            indent = indent.slice(0,-4)
            console.log(indent+`</${node.type}>`)
        }
    }

    javascript += `}`
    return javascript
}



// const glob = (jsonedAndStars)=>{
//     const regex = new RegExp(jsonedAndStars.map(each=>each.startsWith('"')?escapeRegexMatch(JSON.parse(each)):".*"))
//     // FIXME: handle the ? 
//     // FIXME: handle the []'s
//     // FIXME: check glob options (e.g. including "." and ".." and hidden or not)
//     let names = [...Deno.readDirSync(".")].map(each=>each.name)
//     const matches = names.filter(eachName=>eachName.match(regex))
//     if (matches.length == 0) {
//         return [ jsonedAndStars.map(each=>each.startsWith('"')?JSON.parse(each):each).join("") ]
//     }
//     return matches
// }


// const hasSpecialCharacters = text=>text.match(/[\\*{\\?@\\[]/)


// const assignmentValue = async (argument)=>{
//     // NOTE: for some reason, globs do not activate in assignments

//     if (argument.type == "number" || argument.type == "word" && (!argument.text.includes("{") || !argument.text.includes("}"))) {
//         return JSON.stringify(argument.text)
//     } else if (argument.type == "raw_string") {
//         return JSON.stringify(argument.text.slice(1,-1))
//     // brace expansion: range 
//     } else if (argument.text.match(/\\{\\d+\\.\\.\\d+\\}/)) {
//         // this: echo start{1..5}{10..12}
//         // creates this: start110 start111 start112 start210 start211 start212 start310 start311 start312 start410 start411 start412 start510 start511 start512
        
//         // then, in assignment only, the output is just the last value in the range

//         // FIXME
        
//     // brace expansion: commas
//     // FIXME: ... this is valid: {ucb/{ex,edit},lib/{ex?.?*,how_ex}}
//     } else if (argument.text.match(/\\{\\}/)) {
//         // this: start{{1..5},{10..12}}
//         // creates this: start1 start2 start3 start4 start5 start10 start11 start12

//         // comma can be backslash escaped
//         // double quotes are valid
//         // variable expansion is valid
//         // pipe and redirect are at least invalid
//         // FIXME

//     } else if (argument.type == "string") {
//         // deal with command substitution
//         // FIXME
        
//     } else if (argument.type == "simple_expansion") {

//     } else if (argument.type == "command_substitution") {
//     } else if (argument.type == "concatenation") {
//         // not as simple as joining things because of parameter expansion
//         // FIXME
//     }
// }