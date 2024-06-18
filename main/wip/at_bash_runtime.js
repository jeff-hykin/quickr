import { deferredPromise } from "https://deno.land/x/good/flattened/deferred_promise.js"

// tasks:
    // get the "if" statement working
    // get a bit of the parameter expansion working for basic commands

const reservedCharMap = {
    "&": "\\\\x26",
    "!": "\\\\x21",
    "#": "\\\\x23",
    $: "\\\\$",
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
    "`": "\\\\x60",
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

const RX_REGEXP_ESCAPE = new RegExp(`[\${Object.values(reservedCharMap).join("")}]`, "gu")

function escapeRegexMatch(str) {
    return str.replaceAll(RX_REGEXP_ESCAPE, (m) => reservedCharMap[m])
}

const noComments = (list) => list.filter(each=>each.type!="comment")
export const helpers = {
    hasSpecialCharacters(text) {
        return text.match(/[\\*{\\?@\\[]/)
    },
    statementToNormalCommandName() {

    },
    assignmentValue(argument) {
        // NOTE: for some reason, globs do not activate in assignments

        if (argument.type == "number" || argument.type == "word" && (!argument.text.includes("{") || !argument.text.includes("}"))) {
            return JSON.stringify(argument.text)
        } else if (argument.type == "raw_string") {
            return JSON.stringify(argument.text.slice(1,-1))
        // brace expansion: range 
        } else if (argument.text.match(/\\{\\d+\\.\\.\\d+\\}/)) {
            // this: echo start{1..5}{10..12}
            // creates this: start110 start111 start112 start210 start211 start212 start310 start311 start312 start410 start411 start412 start510 start511 start512
            
            // then, in assignment only, the output is just the last value in the range

            // FIXME
            
        // brace expansion: commas
        // FIXME: ... this is valid: {ucb/{ex,edit},lib/{ex?.?*,how_ex}}
        } else if (argument.text.match(/\\{\\}/)) {
            // this: start{{1..5},{10..12}}
            // creates this: start1 start2 start3 start4 start5 start10 start11 start12

            // comma can be backslash escaped
            // double quotes are valid
            // variable expansion is valid
            // pipe and redirect are at least invalid
            // FIXME

        } else if (argument.type == "string") {
            // deal with command substitution
            // FIXME
            
        } else if (argument.type == "simple_expansion") {

        } else if (argument.type == "command_substitution") {
        } else if (argument.type == "concatenation") {
            // not as simple as joining things because of parameter expansion
            // FIXME
        }
    },
    getSimpleArgument(argumentParseData) {
        if (argumentParseData instanceof Array) {
            let argumentAsString = ""
            for (const each of argumentParseData) {
                const eachAsString = helpers.getSimpleArgument(each)
                if (eachAsString == undefined) {
                    return undefined
                }
                argumentAsString += eachAsString 
            }
            return argumentAsString
        }
        if (argumentParseData.type == "word" && !helpers.hasSpecialCharacters(argumentParseData.text)) {
            return argumentParseData.text
        } else if (argumentParseData.type == "raw_string") {
            return argumentParseData.text.slice(1,-1)
        } else if (argumentParseData.type == "string") {
            const simpleStringChildren = argumentParseData.children.slice(1,-1)
            if (simpleStringChildren.some(each=>each.type != "string_content")) {
                return undefined
            }
            if (simpleStringChildren.some(each=>helpers.hasSpecialCharacters(each.text))) {
                return undefined
            }
            return simpleStringChildren.children.map(each=>each.text).join("")
        }
    },
    glob({ globString, shellState }) {
        // FIXME: handle the ? 
        // FIXME: handle the []'s
        // FIXME: check glob options (e.g. including "." and ".." and hidden or not)
        let names = [...Deno.readDirSync(shellState.internalInfo.pwd)].map(each=>each.name)
        const matches = names.filter(eachName=>{
            // FIXME: convert globString to a regex
            throw Error(`globbing not fully implemented`)
        })
        if (matches.length == 0) {
            return globString
        } else {
            // TODO: check 
            return matches.slice(1,).join(" ")
        }
    },
    getExecutableName({ children, shellState }) {
        const filteredChildren = noComments(children)
        const executableNameAsString = helpers.getSimpleArgument(filteredChildren[0])
        if (executableNameAsString != undefined) {
            return executableNameAsString
        } else {
            // FIXME: this requires something more complicated, like parameter expansion, globbing, etc
            throw Error(`getExecutableName not fully implemented. Can't handle this case: ${JSON.stringify(children)}`)
        }
    },
    getArgument({ argumentParseData, shellState }) {
        const simpleArgumentString = helpers.getSimpleArgument(argumentParseData)
        if (simpleArgumentString != undefined) {
            return simpleArgumentString
        } else {
            // FIXME: this requires something more complicated, like parameter expansion, globbing, etc
            throw Error(`getArgument not fully implemented. Can't handle this case: ${JSON.stringify(argumentParseData)}`)
        }
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
    "set": ()=>{/*FIXME*/},
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
const shoptOpts = {
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
}
const envBase = {
    "PWD": Deno.cwd(),
    "SHLVL": `${(Deno.env.get("SHLVL") || "0")-0+1}`,
    "HOME": Deno.env.get("HOME")||"",
    "PATH": Deno.env.get("PATH")||"",
    "IFS": Deno.env.get("IFS")||"", // internal field separator
}
export class ShellState {
    constructor() {
        this.internalInfo = {
            pid: null,
            pwd: null,
            previousPwd: null,
            previousPid: null,
            args: Deno.args,
            source: decodeURIComponent(new URL(Deno.mainModule).pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")),
            prevousExitCode: 0,
            previousSignal: 0,
            activeShellopts: "himBH",
            shoptOpts: {...shoptOpts},
        }
        this.exportedEnv = {
            ...envBase,
        }
        this.nonExportedEnv = {}
        this.jobs = []
        this.aliases = {}
        this.functions = {}
        this.scopes = [{}]
    }
    throwError(message) {
        console.error(message)
        // FIXME: look at the shell options to decide if this stops the process or not (pipefail, errexit, etc)
    }
    isValidIdentifier(name) {
        // Bash --posix: [a-zA-Z_][0-9a-zA-Z_]*
        // Bash 3.0-4.4: [^#%0-9\0\1\9\10 "$&'();<>\`|\x7f][^\0\1\9\10 "$&'();<>\`|\x7f]*
        // Bash 5.0: [^#%0-9\0\9\10 "$&'();<>\`|][^\0\9\10 "$&'();<>\`|]*
        //     \1 and \x7f works now
        // Bash 5.1: [^#%\0\9\10 "$&'();<>\`|][^\0\9\10 "$&'();<>\`|]*
        //     Numbers can come first?! Yep!
        // Any bash 3-5: [^#%0-9\0\1\9\10 "$&'();<>\`|\x7f][^\0\1\9\10 "$&'();<>\`|\x7f]*
        //     Same as 3.0-4.4
        return name.match(/^[^#%0-9\0\1\9\10 "$&'();<>\`|\x7f][^\0\1\9\10 "$&'();<>\`|\x7f]*$/)
    }
    createCommandEnv(extraEnv) {
        return { ...this.exportedEnv, ...extraEnv }
    }
    getEnv(name) {
        if (name == "$") { return this.internalInfo.pid }
        if (name == "0") { return this.internalInfo.source }
        if (name == "#") { return `${this.internalInfo.args.length}` }
        if (name == "*") { return this.internalInfo.args.join(" ") }
        if (name == "@") { return this.internalInfo.args }
        if (name == "?") { return `${this.prevousExitCode}` }
        if (name == "!") { return `${this.previousSignal}` }
        if (name == "-") { return this.activeShellopts } // options: https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin
        
        for (const each of this.scopes.toReversed()) {
            if (each.hasOwnProperty(name)) {
                return each[name]||""
            }
        }
        if (this.nonExportedEnv.hasOwnProperty(name)) {
            return this.nonExportedEnv[name]||""
        }
        if (this.exportedEnv.hasOwnProperty(name)) {
            return this.exportedEnv[name]||""
        }
        return ""
    }
    setEnv({name, value, exported=false, local=false}) {
        if (!this.isValidIdentifier(name)) {
            this.throwError(`Invalid identifier: ${name}`)
            return
        }
        
        if (local) {
            this.scopes[name] = value
        } else if (exported) {
            this.exportedEnv[name] = value
        } else {
            this.nonExportedEnv[name] = value
        }
    }
    unsetEnv(name) {
        if (!this.isValidIdentifier(name)) {
            this.throwError(`Invalid identifier: ${name}`)
            return
        }
        
        for (const each of this.scopes.toReversed()) {
            if (each.hasOwnProperty(name)) {
                delete each[name]
                return
            }
        }
        if (this.exportedEnv.hasOwnProperty(name)) {
            delete this.exportedEnv[name]
            return
        }
        if (this.nonExportedEnv.hasOwnProperty(name)) {
            delete this.nonExportedEnv[name]
            return
        }
    }
    setAlias(name, value) {
        // FIXME: restrict alias names
        this.aliases[name] = value
    }
    unsetAlias(name) {
        delete this.aliases[name]
    }
    setFunction(name, body) {
        // FIXME
    }
    unsetFunction(name) {
        delete this.functions[name]
    }
    pushScope() {
        const newScope = {}
        this.scopes.push(newScope)
        return newScope
    }
    popScope() {
        return this.scopes.pop()
    }
}

export class Statement {
    constructor({type, parseData, shellState}) {
        this.type = type
        this.parseData = parseData
        this.stdin = undefined
        this.stdout = undefined
        this.stderr = undefined
        this.shellState = shellState
        this.customData = {}
        
        this.promise = deferredPromise()
        this.actions = []
        this.output = {
            status: "notStarted",
            exitCode: 0,
        }
        
        // a very simple case
        if (this.type == "command") {
            const env = this.shellState.createCommandEnv()
            const executableName = helpers.getExecutableName({ children: this.parseData.children[0].children, shellState: this.shellState })
            const argumentParseData = this.parseData.children.slice(1)
            // FIXME might need to ignore line-escapes here
            const commandArgs = argumentParseData.map(each=>helpers.getArgument({argumentParseData: each, shellState: this.shellState}))
            this.actions.push(()=>this._createCommand({
                commandName: executableName,
                options: {
                    args: commandArgs,
                    env,
                },
            }))
        } else if (type == "if") {
            const children = noComments(this.parseData.children)
            this.customData.conditionalStatement = new Statement({ type: "conditional", parseData: children[1], shellState })
            const remainingChildren = children.slice(2)
            let indexOfNextCondition = -1
            let index = -1
            for (const each of children.slice(2)) {
                index+=1 // FIXME: this index is off
                if (each.type == "else_clause") {
                    indexOfNextCondition = index
                    break
                }
                if (each.type == "elif_clause") { // FIXME: check name
                    indexOfNextCondition = index
                    break
                }
                if (each.type == "fi") {
                    indexOfNextCondition = index
                    break
                }
            }
            this.customData.consequences = children.slice(0,indexOfNextCondition)
            new Statement({ type: "statement", parseData: children[2], shellState })
        } else {
            throw Error(`Not implemented cant handle this: ${JSON.stringify(this.parseData)}`)
        }
    }
    async _createCommand({commandName, options, afterCommand, afterProcess, afterComplete}) {
        this.output.status = "started"
        const command = new Deno.Command(commandName, options)
        await (afterCommand && afterCommand(command))
        const childProcess = command.spawn()
        await (afterProcess && afterProcess(childProcess))

        this.shellState.previousPid = childProcess.pid
        const {success, code, signal} = await childProcess.status
        // FIXME: might need to set the signal code here, but I'm not sure how $! works
        this.output.status = "finished"
        this.output.exitCode = code
        this.shellState.prevousExitCode = code
        await (afterComplete && afterComplete(childProcess))
    }
    async run() {
        try {
            for (const each of this.actions) {
                await each(this)
            }
        } catch (error) {
            this.promise.reject(error)
        }
        this.promise.resolve(this.output)
        return this.output
    }
}

const shellState = new ShellState()
const s1 = new Statement({
    type: "command",
    parseData: {
        type: "command",
        children: [
            {
                type: "command_name",
                children: [
                    {
                        type: "word",
                        text: "echo",
                    },
                ],
            },
            {
                type: "raw_string",
                text: "'hi'",
            },
        ]
    },
    shellState
})
await s1.run()


// function (args=[], stdin=Deno.stdin, stdout=Deno.stdout, stderr=Deno.stderr, env=Deno.env.toObject(), nonExportedEnv={}) {
//     const exportedEnv = {
//         ...env,
//     }
//     let shellOpts = "himBH"
//     let shoptOpts = {
//         "cdable_vars":             false,
//         "cdspell":                 false,
//         "checkhash":               false,
//         "checkwinsize":            false,
//         "cmdhist":                 true,
//         "compat31":                false,
//         "dotglob":                 false,
//         "execfail":                false,
//         "expand_aliases":          true,
//         "extdebug":                false,
//         "extglob":                 false,
//         "extquote":                true,
//         "failglob":                false,
//         "force_fignore":           true,
//         "gnu_errfmt":              false,
//         "histappend":              false,
//         "histreedit":              false,
//         "histverify":              false,
//         "hostcomplete":            true,
//         "huponexit":               false,
//         "interactive_comments":    true,
//         "lithist":                 false,
//         "login_shell":             false,
//         "mailwarn":                false,
//         "no_empty_cmd_completion": false,
//         "nocaseglob":              false,
//         "nocasematch":             false,
//         "nullglob":                false,
//         "progcomp":                true,
//         "promptvars":              true,
//         "restricted_shell":        false,
//         "shift_verbose":           false,
//         "sourcepath":              true,
//         "xpg_echo":                false,
//     }
//     let pidOfLastProcess = Deno.pid
//     delete exportedEnv["SHLVL"]
//     const envBase = {
//         "$": Deno.pid,
//         "@": Deno.args,
//         "0": decodeURIComponent(new URL(Deno.mainModule).pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25")),
//         "#": args.length,
//         "*": args.join(" "),
//         "@": args,
//         "?": Deno.lastStatus?.code,
//         "!": Deno.lastStatus?.signal,
//         "$-": shellOpts, // options: https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin
//         "SHLVL": `\${(Deno.env.get("SHLVL") || "0")-0+1}`,
//         ...nonExportedEnv,
//     }
//     Object.setPrototypeOf(envBase, exportedEnv)
//     const env = new Proxy(envBase, {
//         ownKeys(target, ...args) { return Reflect.ownKeys(target, ...args) },
//         get(original, key, ...args) {
//             if (key-0>0) {
//                 return args[key]||""
//             }
//             if (key == "&") {
//                 return pidOfLastProcess
//             }
//             return Reflect.get(original, key, ...args)
//         },
//         set(original, key, ...args) {
//             return Reflect.set(original, key, ...args)
//         },
//         has: Reflect.has,
//         deleteProperty: Reflect.deleteProperty,
//         isExtensible: Reflect.isExtensible,
//         preventExtensions: Reflect.preventExtensions,
//         setPrototypeOf: Reflect.setPrototypeOf,
//         defineProperty: Reflect.defineProperty,
//         getPrototypeOf: Reflect.getPrototypeOf,
//         getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor,
//     })
//     const envStack = [env]
//     const newScope = ()=>{
//         const newEnv = {}
//         Object.setPrototypeOf(newEnv, envStack.slice(-1)[0])
//         envStack.push(newEnv)
//         return newEnv
//     }
//     const popScope = ()=>{
//         envStack.pop()
//     }
//     let jobs = []
//     let aliases = {}
//     let functions = {}
//     let overridableBuiltins = {
//         "help": ()=>{/*FIXME*/},
//         "builtin": ()=>{/*FIXME*/},
//         "alias": ()=>{/*FIXME*/},
//         ".": ()=>{/*FIXME*/},
//         "bind": ()=>{/*FIXME*/},
//         "command": ()=>{/*FIXME*/},
//         "complete": ()=>{/*FIXME*/},
//         "declare": ()=>{/*FIXME*/},
//         "disown": ()=>{/*FIXME*/},
//         "enable": ()=>{/*FIXME*/},
//         "exec": ()=>{/*FIXME*/},
//         "export": ()=>{/*FIXME*/},
//         "fc": ()=>{/*FIXME*/},
//         "hash": ()=>{/*FIXME*/},
//         "history": ()=>{/*FIXME*/},
//         "jobs": ()=>{/*FIXME*/},
//         "let": ()=>{/*FIXME*/},
//         "logout": ()=>{/*FIXME*/},
//         "printf": ()=>{/*FIXME*/},
//         "pwd": ()=>{/*FIXME*/},
//         "readonly": ()=>{/*FIXME*/},
//         "shift": ()=>{/*FIXME*/},
//         "source": ()=>{/*FIXME*/},
//         "test": ()=>{/*FIXME*/},
//         "times": ()=>{/*FIXME*/},
//         "true": ()=>{/*FIXME*/},
//         "typeset": ()=>{/*FIXME*/},
//         "umask": ()=>{/*FIXME*/},
//         "unset": ()=>{/*FIXME*/},
//         ":": ()=>{/*FIXME*/},
//         "bg": ()=>{/*FIXME*/},
//         "break": ()=>{/*FIXME*/},
//         "caller": ()=>{/*FIXME*/},
//         "cd": ()=>{/*FIXME*/},
//         "compgen": ()=>{/*FIXME*/},
//         "continue": ()=>{/*FIXME*/},
//         "dirs": ()=>{/*FIXME*/},
//         "echo": ()=>{/*FIXME*/},
//         "eval": ()=>{/*FIXME*/},
//         "exit": ()=>{/*FIXME*/},
//         "false": ()=>{/*FIXME*/},
//         "fg": ()=>{/*FIXME*/},
//         "getopts": ()=>{/*FIXME*/},
//         "kill": ()=>{/*FIXME*/},
//         "local": ()=>{/*FIXME*/},
//         "popd": ()=>{/*FIXME*/},
//         "pushd": ()=>{/*FIXME*/},
//         "read": ()=>{/*FIXME*/},
//         "return": ()=>{/*FIXME*/},
//         "set": ()=>{/*FIXME*/},
//         "shopt": ()=>{/*FIXME*/},
//         "suspend": ()=>{/*FIXME*/},
//         "trap": ()=>{/*FIXME*/},
//         "type": ()=>{/*FIXME*/},
//         "ulimit": ()=>{/*FIXME*/},
//         "unalias": ()=>{/*FIXME*/},
//         "wait": ()=>{/*FIXME*/},
//     }
//     let cannotBeFunctionNames = {
//         "if": ()=>{ /*FIXME*/ },
//         "for": ()=>{ /*FIXME*/ },
//         "case": ()=>{ /*FIXME*/ },
//         "function": ()=>{ /*FIXME*/ },
//         "select": ()=>{ /*FIXME*/ },
//         "while": ()=>{ /*FIXME*/ },
//         "[[": ()=>{ /*FIXME*/ },
//         "time": ()=>{ /*FIXME*/ },
//         "until": ()=>{ /*FIXME*/ },
//     }
//     let cannotBeAliasOrFunctionName = {
//         "((": ()=>{ /*FIXME*/ },
//     }
//     const glob = (jsonedAndStars)=>{
//         const regex = new RegExp(jsonedAndStars.map(each=>each.startsWith('"')?escapeRegexMatch(JSON.parse(each)):".*"))
//         // FIXME: handle the ? 
//         // FIXME: handle the []'s
//         // FIXME: check glob options (e.g. including "." and ".." and hidden or not)
//         let names = [...Deno.readDirSync(".")].map(each=>each.name)
//         const matches = names.filter(eachName=>eachName.match(regex))
//         if (matches.length == 0) {
//             return [ jsonedAndStars.map(each=>each.startsWith('"')?JSON.parse(each):each).join("") ]
//         }
//         return matches
//     }
//     const hasSpecialCharacters = text=>text.match(/[\\*{\\?@\\[]/)
//     const assignmentValue = async (argument)=>{
//         // NOTE: for some reason, globs do not activate in assignments

//         if (argument.type == "number" || argument.type == "word" && (!argument.text.includes("{") || !argument.text.includes("}"))) {
//             return JSON.stringify(argument.text)
//         } else if (argument.type == "raw_string") {
//             return JSON.stringify(argument.text.slice(1,-1))
//         // brace expansion: range 
//         } else if (argument.text.match(/\\{\\d+\\.\\.\\d+\\}/)) {
//             // this: echo start{1..5}{10..12}
//             // creates this: start110 start111 start112 start210 start211 start212 start310 start311 start312 start410 start411 start412 start510 start511 start512
            
//             // then, in assignment only, the output is just the last value in the range

//             // FIXME
            
//         // brace expansion: commas
//         // FIXME: ... this is valid: {ucb/{ex,edit},lib/{ex?.?*,how_ex}}
//         } else if (argument.text.match(/\\{\\}/)) {
//             // this: start{{1..5},{10..12}}
//             // creates this: start1 start2 start3 start4 start5 start10 start11 start12

//             // comma can be backslash escaped
//             // double quotes are valid
//             // variable expansion is valid
//             // pipe and redirect are at least invalid
//             // FIXME

//         } else if (argument.type == "string") {
//             // deal with command substitution
//             // FIXME
            
//         } else if (argument.type == "simple_expansion") {

//         } else if (argument.type == "command_substitution") {
//         } else if (argument.type == "concatenation") {
//             // not as simple as joining things because of parameter expansion
//             // FIXME
//         }
//     }
// }