import { chalk } from "../dependencies/chalk.js"
import { OperatingSystem } from "./operating_system.js"
import { toString } from "https://deno.land/x/good@0.7.6/string.js"

const realConsole = globalThis.console
const isBrowserContext = typeof document != 'undefined' && typeof window != 'undefined'


// TODO: add some stdin helpers:
    // import { readLines } from "https://deno.land/std@0.100.0/io/mod.ts";
    // (async function() {
    //   for await (const line of readLines(Deno.stdin)) {
    //     switch (line) {
    //       case "help":
    //         help();
    //         break;
    //     }
    //   }

const env = new Proxy({}, {
    // Object.keys
    ownKeys(target) {
        return Object.keys(Deno.env.toObject())
    },
    has(original, key) {
        if (typeof key === 'symbol') {
            return false
        } else {
            return Deno.env.get(key) !== undefined
        }
    },
    get(original, key) {
        if (typeof key === 'symbol') {
            return undefined
        } else {
            return Deno.env.get(key)
        }
    },
    set(original, key, value) {
        if (typeof key === 'symbol') {
            undefined
        } else {
            Deno.env.set(key, value)
        }
        return true
    },
    deleteProperty(original, key) {
        if (typeof key === 'symbol') {
            return undefined
        } else {
            return Deno.env.delete(key)
        }
    },
})

        

// 
// patch the built in console to allow classes to override output
// 
const originalThing = realConsole
const proxySymbol = Symbol.for('Proxy')
const thisProxySymbol = Symbol('thisProxy')
const symbolForConsoleLog = Symbol.for("console.log")
globalThis.console = new Proxy(originalThing, {
    defineProperty: Reflect.defineProperty,
    getPrototypeOf: Reflect.getPrototypeOf,
    // Object.keys
    ownKeys(...args) { return Reflect.ownKeys(...args) },
    // function call (original value needs to be a function)
    apply(original, context, ...args) { console.log(args) },
    // new operator (original value needs to be a class)
    construct(...args) {},
    get(original, key, ...args) {
        if (key == proxySymbol||key == thisProxySymbol) {return true}
        // if logging, then 
        if (key == "log") {
            return (...args)=>{
                realConsole.log(
                    ...args.map(each=>{
                        if (each instanceof Object && each[symbolForConsoleLog] instanceof Function) {
                            return each[symbolForConsoleLog]()
                        }
                        return each
                    })
                )
            }
        }
        return Reflect.get(original, key, ...args)
    },
    set(original, key, ...args) {
        if (key == proxySymbol||key == thisProxySymbol) {return}
        return Reflect.set(original, key, ...args)
    },
})

const styleObjects = {
    // specials
    bold:            { chalkName:"bold"            , styleString: "font-weight: bold;",                                  },
    reset:           { chalkName:"reset"           , styleString: "",                                                    },
    dim:             { chalkName:"dim"             , styleString: "opacity: 0.7;",                                       },
    italic:          { chalkName:"italic"          , styleString: "font-style: italic;",                                 },
    underline:       { chalkName:"underline"       , styleString: "text-decoration:underline;",                          },
    inverse:         { chalkName:"inverse"         , styleString: "webkit-filter: invert(100%); filter: invert(100%);",  },
    hidden:          { chalkName:"hidden"          , styleString: "background-color: transparent; color:transparent;",   },
    strikethrough:   { chalkName:"strikethrough"   , styleString: "text-decoration:line-through;",                       },
    visible:         { chalkName:"visible"         , styleString: "",                                                    },

    // colors
    black:           { chalkName:"black"           , styleString: "color:#000000;", },
    white:           { chalkName:"white"           , styleString: "color:#c7cbcd;", },
    red:             { chalkName:"red"             , styleString: "color:#f07178;", },
    green:           { chalkName:"green"           , styleString: "color:#c3e88d;", },
    blue:            { chalkName:"blue"            , styleString: "color:#82aaff;", },
    yellow:          { chalkName:"yellow"          , styleString: "color:#ddd790;", },
    cyan:            { chalkName:"cyan"            , styleString: "color:#64bac5;", },
    magenta:         { chalkName:"magenta"         , styleString: "color:#c792ea;", },
    
    // light colors
    lightBlack:     { chalkName:"blackBright"     , styleString: "color:#546e7a;", },
    lightWhite:     { chalkName:"whiteBright"     , styleString: "color:#ffffff;", },
    lightRed:       { chalkName:"redBright"       , styleString: "color:#ff5572;", },
    lightGreen:     { chalkName:"greenBright"     , styleString: "color:#04d895;", },
    lightBlue:      { chalkName:"blueBright"      , styleString: "color:#00aeff;", },
    lightYellow:    { chalkName:"yellowBright"    , styleString: "color:#fec355;", },
    lightMagenta:   { chalkName:"magentaBright"   , styleString: "color:#e57eb3;", },
    lightCyan:      { chalkName:"cyanBright"      , styleString: "color:#89ddff;", },
    
    // background colors
    blackBackground:         { chalkName:"bgBlack"         , styleString: "background-color:#000000;", },
    whiteBackground:         { chalkName:"bgWhite"         , styleString: "background-color:#c7cbcd;", },
    redBackground:           { chalkName:"bgRed"           , styleString: "background-color:#f07178;", },
    greenBackground:         { chalkName:"bgGreen"         , styleString: "background-color:#c3e88d;", },
    blueBackground:          { chalkName:"bgBlue"          , styleString: "background-color:#82aaff;", },
    yellowBackground:        { chalkName:"bgYellow"        , styleString: "background-color:#ddd790;", },
    magentaBackground:       { chalkName:"bgMagenta"       , styleString: "background-color:#c792ea;", },
    cyanBackground:          { chalkName:"bgCyan"          , styleString: "background-color:#64bac5;", },
    
    // light background colors
    lightBlackBackground:   { chalkName:"bgBlackBright"   , styleString: "background-color:#546e7a;", },
    lightRedBackground:     { chalkName:"bgRedBright"     , styleString: "background-color:#ff5572;", },
    lightGreenBackground:   { chalkName:"bgGreenBright"   , styleString: "background-color:#04d895;", },
    lightYellowBackground:  { chalkName:"bgYellowBright"  , styleString: "background-color:#fec355;", },
    lightBlueBackground:    { chalkName:"bgBlueBright"    , styleString: "background-color:#00aeff;", },
    lightMagentaBackground: { chalkName:"bgMagentaBright" , styleString: "background-color:#e57eb3;", },
    lightCyanBackground:    { chalkName:"bgCyanBright"    , styleString: "background-color:#89ddff;", },
    lightWhiteBackground:   { chalkName:"bgWhiteBright"   , styleString: "background-color:#ffffff;", },

    // aliases
    gray:                 { chalkName:"blackBright"     , styleString: "color:#546e7a;", },
    grey:                 { chalkName:"blackBright"     , styleString: "color:#546e7a;", },
    lightGray:            { chalkName:"white"           , styleString: "color:#c7cbcd;", },
    lightGrey:            { chalkName:"white"           , styleString: "color:#c7cbcd;", },
    grayBackground:       { chalkName:"bgBlackBright"   , styleString: "background-color:#c7cbcd;", },
    greyBackground:       { chalkName:"bgBlackBright"   , styleString: "background-color:#c7cbcd;", },
    lightGrayBackground:  { chalkName:"bgWhite"         , styleString: "background-color:#c7cbcd;", },
    lightGreyBackground:  { chalkName:"bgWhite"         , styleString: "background-color:#c7cbcd;", },
}

const crayonProperties = {
    [Symbol.for("console.log")]:  { value: function(){ return this.styledStringBuffer.join("") } },
    toString:  { value: function(){ return this.styledStringBuffer.join("") } },
    attributeBuffer: { value: [], writable: true, },
    styledStringBuffer: { value: [], writable: true, },
    styleString: { value: ``, writable: true, },
}
for (const [name, styleObject] of Object.entries(styleObjects)) {
    crayonProperties[name] = {
        get() {
            return createCrayon(styleObject, this)
        }
    }
}

const createCrayon = (styleObject, parent)=>{
    if (parent == null) {
        parent = {
            attributeBuffer: [],
            styledStringBuffer: [],
            styleString: "",
        }
    }
    const output = (strings, ...values)=>{
        // if called as a normal function instead of a template
        if (typeof strings == "string") {
            strings = [strings, ...values.map(each=>"")]
        }

        let singleCombinedString = ""
        for (const index in values) {
            const value = values[index]
            const string = toString(strings[index])
            singleCombinedString += string + toString(value)
        }
        singleCombinedString += strings.slice(-1)[0]
        
        // if color is turned off for one reason or another
        if (!Console.colorSupport.hasAnsi || Console.disableColorIfNonIteractive && !Deno.isatty()) {
            return singleCombinedString
        }

        let styler = chalk
        let attributeBuffer = [...output.attributeBuffer]
        while (attributeBuffer.length > 0) {
            styler = styler[attributeBuffer.shift()]
        }
        output.styledStringBuffer.push(styler(singleCombinedString))
        return output
    }
    // attach all the color properties
    Object.defineProperties(output, crayonProperties)
    output.attributeBuffer = [...parent.attributeBuffer, styleObject.chalkName ]
    output.styledStringBuffer = [...parent.styledStringBuffer]
    output.styleString = `${parent.styledStringBuffer}; ${styleObject.styleString}`
    return output
}

// 
// export all the colors
// 
export const bold                   = createCrayon(styleObjects.bold)
export const reset                  = createCrayon(styleObjects.reset)
export const dim                    = createCrayon(styleObjects.dim)
export const italic                 = createCrayon(styleObjects.italic)
export const underline              = createCrayon(styleObjects.underline)
export const inverse                = createCrayon(styleObjects.inverse)
export const hidden                 = createCrayon(styleObjects.hidden)
export const strikethrough          = createCrayon(styleObjects.strikethrough)
export const visible                = createCrayon(styleObjects.visible)
export const black                  = createCrayon(styleObjects.black)
export const white                  = createCrayon(styleObjects.white)
export const red                    = createCrayon(styleObjects.red)
export const green                  = createCrayon(styleObjects.green)
export const blue                   = createCrayon(styleObjects.blue)
export const yellow                 = createCrayon(styleObjects.yellow)
export const cyan                   = createCrayon(styleObjects.cyan)
export const magenta                = createCrayon(styleObjects.magenta)
export const lightBlack             = createCrayon(styleObjects.lightBlack)
export const lightWhite             = createCrayon(styleObjects.lightWhite)
export const lightRed               = createCrayon(styleObjects.lightRed)
export const lightGreen             = createCrayon(styleObjects.lightGreen)
export const lightBlue              = createCrayon(styleObjects.lightBlue)
export const lightYellow            = createCrayon(styleObjects.lightYellow)
export const lightMagenta           = createCrayon(styleObjects.lightMagenta)
export const lightCyan              = createCrayon(styleObjects.lightCyan)
export const blackBackground        = createCrayon(styleObjects.blackBackground)
export const whiteBackground        = createCrayon(styleObjects.whiteBackground)
export const redBackground          = createCrayon(styleObjects.redBackground)
export const greenBackground        = createCrayon(styleObjects.greenBackground)
export const blueBackground         = createCrayon(styleObjects.blueBackground)
export const yellowBackground       = createCrayon(styleObjects.yellowBackground)
export const magentaBackground      = createCrayon(styleObjects.magentaBackground)
export const cyanBackground         = createCrayon(styleObjects.cyanBackground)
export const lightBlackBackground   = createCrayon(styleObjects.lightBlackBackground)
export const lightRedBackground     = createCrayon(styleObjects.lightRedBackground)
export const lightGreenBackground   = createCrayon(styleObjects.lightGreenBackground)
export const lightYellowBackground  = createCrayon(styleObjects.lightYellowBackground)
export const lightBlueBackground    = createCrayon(styleObjects.lightBlueBackground)
export const lightMagentaBackground = createCrayon(styleObjects.lightMagentaBackground)
export const lightCyanBackground    = createCrayon(styleObjects.lightCyanBackground)
export const lightWhiteBackground   = createCrayon(styleObjects.lightWhiteBackground)
export const gray                   = createCrayon(styleObjects.gray)
export const grey                   = createCrayon(styleObjects.grey)
export const lightGray              = createCrayon(styleObjects.lightGray)
export const lightGrey              = createCrayon(styleObjects.lightGrey)
export const grayBackground         = createCrayon(styleObjects.grayBackground)
export const greyBackground         = createCrayon(styleObjects.greyBackground)
export const lightGrayBackground    = createCrayon(styleObjects.lightGrayBackground)
export const lightGreyBackground    = createCrayon(styleObjects.lightGreyBackground)

// from chalk.js
const ansiRegexPattern = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g
export function clearStylesFrom(string) {
    return `${string}`.replace(ansiRegexPattern, "")
}

const colorSupportCache = {
    hasAnsi: null,
    has256: null,
    has16m: null,
}
export const Console = {
    // TODO: add signal handler
        // Deno.addSignalListener("SIGINT", (...args)=>{
        //     console.debug(`args is:`,args)
        // })
    log(...args) {
        if (args.length == 0) {
            console.log()
        }
        let [arg1, ...others] = args.map(each=>{
            if (each instanceof Object && each[symbolForConsoleLog] instanceof Function) {
                return each[symbolForConsoleLog]()
            }
            return each
        })
        // escape the "%"'s
        if (typeof arg1 == 'string') {
            arg1 = arg1.replace("%", "%%")
        }
        if (!isBrowserContext) {
            realConsole.log(arg1, ...others)
        } else {
            if (args[0][symbolForConsoleLog] && typeof args[0].styleString == 'string') {
                realConsole.log(`%c${arg1}${others.map(each=>`${each}`).join("")}`, args[0].styleString)
            } else {
                realConsole.log(arg1, ...others)
            }
        }
        return Console
    },
    env: env,
    disableColorIfNonIteractive: true,
    askFor: {
        line(question) {
            return prompt(question)
        },
        confirmation(question) {
            console.log(question)
            prompt("[use CTRL+C to quit, or press enter to continue]")
        },
        yesNo(question) {
            while (true) {
                let answer = prompt(question)
                const match = `${answer}`.match(/^ *(y|yes|n|no) *\n?$/i)
                if (match) {
                    // if yes
                    if (match[1][0] == 'y' || match[1][0] == 'Y') {
                        return true
                    } else {
                        return false
                    }
                } else {
                    console.log("[ please respond with y/n, yes/no, or use CTRL+C to cancel ]")
                }
            }
        },
    },
    get colorSupport() {
        if (colorSupportCache.hasAnsi != null) {
            return colorSupportCache
        }
        // the Deno option for disabling color
        if ("NO_COLOR" in Console.env) {
            return {
                hasAnsi: false,
                has256: false,
                has16m: false,
            }
        }
        // 
        // OS Support
        // 
        let osSupport
        if (Deno.build.os === "windows") {
            // build 1909 is the first Windows release that supports ansi color
            // build 10586 is the first Windows release that supports 256 colors.
            // build 14931 is the first release that supports 16m/TrueColor.
            const [major, minor, build] = OperatingSystem.versionArray
            const colors = {
                hasAnsi: build >= 1909,
                has256: build >= 10586,
                has16m: build >= 14931,
            }
            
        } else {
            osSupport = {
                hasAnsi: true,
                has256: true,
                has16m: true,
            }
        }

        //
        // terminal support
        //
        let terminalSupport
        if ('TERM_PROGRAM' in env) {
            const version = Number.parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10)
            if (env.TERM_PROGRAM == 'iTerm.app') {
                if (version >= 3) {
                    terminalSupport = {
                        hasAnsi: true,
                        has256: true,
                        has16m: true,
                    }
                } else {
                    terminalSupport = {
                        hasAnsi: true,
                        has256: true,
                        has16m: false,
                    }
                }
            } else if (env.TERM_PROGRAM == 'Apple_Terminal') {
                terminalSupport = {
                    hasAnsi: true,
                    has256: true,
                    has16m: false,
                }
            }
        }
        if (env.TERM === 'dumb') {
            terminalSupport = {
                hasAnsi: false,
                has256: false,
                has16m: false,
            }
        } else if ('CI' in env) {
            terminalSupport = {
                hasAnsi: ['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS', 'BUILDKITE', 'DRONE'].some(sign => sign in env) || env.CI_NAME === 'codeship',
                has256: false,
                has16m: false,
            }
        } else if (env.COLORTERM === 'truecolor') {
            terminalSupport = {
                hasAnsi: true,
                has256: true,
                has16m: true,
            }
        } else if (/-256(color)?$/i.test(env.TERM)) {
            terminalSupport = {
                hasAnsi: true,
                has256: true,
                has16m: false,
            }
        } else if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
            terminalSupport = {
                hasAnsi: true,
                has256: false,
                has16m: false,
            }
        } else if ('COLORTERM' in env) {
            terminalSupport = {
                hasAnsi: true,
                has256: false,
                has16m: false,
            }
        } else {
            terminalSupport = {
                hasAnsi: false,
                has256: false,
                has16m: false,
            }
        }

        colorSupportCache.hasAnsi = osSupport.hasAnsi && terminalSupport.hasAnsi
        colorSupportCache.has256  = osSupport.has256  && terminalSupport.has256
        colorSupportCache.has16m  = osSupport.has16m  && terminalSupport.has16m
        return colorSupportCache
    },
}