import { OperatingSystem } from "./operating_system.js"
import { toString, indent } from "https://deno.land/x/good@1.3.0.4/string.js"
import { zip } from "https://deno.land/x/good@1.3.0.4/iterable.js"

const realConsole = globalThis.console
const isBrowserContext = typeof document != 'undefined' && typeof window != 'undefined'

let env = null

// 
// allow custom logging 
// 
const originalThing = realConsole
const symbolForConsoleLog = Symbol.for("console.log")
const proxySymbol = Symbol.for('Proxy')
const thisProxySymbol = Symbol('thisProxy')
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


// 
// 
// styled output (colors)
// 
// 
    const codeToEscapeString = (code)=>`\u001b[${code}m`
    // from chalk.js
    const ansiRegexPattern = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g
    export function clearAnsiStylesFrom(string) {
        return `${string}`.replace(ansiRegexPattern, "")
    }
    const styleStrings = {
        reset:                    codeToEscapeString(  0),
        bold:                     codeToEscapeString(  1),
        dim:                      codeToEscapeString(  2),
        italic:                   codeToEscapeString(  3),
        underline:                codeToEscapeString(  4),
        slowBlink:                codeToEscapeString(  5), // not widely supported
        fastBlink:                codeToEscapeString(  6), // not widely supported
        inverse:                  codeToEscapeString(  7),
        strikethrough:            codeToEscapeString(  9),
        primary:                  codeToEscapeString( 11),
        
        // forground colors
        black:                    codeToEscapeString( 30),
        red:                      codeToEscapeString( 31),
        green:                    codeToEscapeString( 32),
        yellow:                   codeToEscapeString( 33),
        blue:                     codeToEscapeString( 34),
        magenta:                  codeToEscapeString( 35),
        cyan:                     codeToEscapeString( 36),
        white:                    codeToEscapeString( 37),
        lightBlack:               codeToEscapeString( 90),
        lightRed:                 codeToEscapeString( 91),
        lightGreen:               codeToEscapeString( 92),
        lightYellow:              codeToEscapeString( 93),
        lightBlue:                codeToEscapeString( 94),
        lightMagenta:             codeToEscapeString( 95),
        lightCyan:                codeToEscapeString( 96),
        lightWhite:               codeToEscapeString( 97),

        // background
        blackBackground:          codeToEscapeString( 40),
        redBackground:            codeToEscapeString( 41),
        greenBackground:          codeToEscapeString( 42),
        yellowBackground:         codeToEscapeString( 43),
        blueBackground:           codeToEscapeString( 44),
        magentaBackground:        codeToEscapeString( 45),
        cyanBackground:           codeToEscapeString( 46),
        whiteBackground:          codeToEscapeString( 47),
        lightBlackBackground:     codeToEscapeString(100),
        lightRedBackground:       codeToEscapeString(101),
        lightGreenBackground:     codeToEscapeString(102),
        lightYellowBackground:    codeToEscapeString(103),
        lightBlueBackground:      codeToEscapeString(104),
        lightMagentaBackground:   codeToEscapeString(105),
        lightCyanBackground:      codeToEscapeString(106),
        lightWhiteBackground:     codeToEscapeString(107),
    }
    // aliases
    Object.assign(styleStrings, {
        gray: styleStrings.lightBlack,
        grey: styleStrings.lightBlack,
        lightGray: styleStrings.white, // lightWhite is "true" white
        lightGrey: styleStrings.white, // lightWhite is "true" white
        grayBackground: styleStrings.lightBlackBackground,
        greyBackground: styleStrings.lightBlackBackground,
        lightGrayBackground: styleStrings.whiteBackground,
        lightGreyBackground: styleStrings.whiteBackground,
    })
    const styleObjectSymbol = Symbol("consoleStyle")
    const styleObject = (rootStyleString)=>{
        const createStyleAccumulator = (styleString)=>{
            const styleAccumulator = (strings, ...values)=>{
                const objectToStyledString = (interpolatedValue, styles)=>{
                    let singleCombinedString = ""
                    if (interpolatedValue instanceof Object && interpolatedValue[styleObjectSymbol] instanceof Function) {
                        singleCombinedString += interpolatedValue[styleObjectSymbol]()
                    } else {
                        singleCombinedString += toString(interpolatedValue)
                    }
                    singleCombinedString += styleStrings.reset + styleAccumulator.styles.join("") // encase the interpolated value messed with styles
                    return singleCombinedString
                }
                
                
                // combine into one string
                let singleCombinedString = ""
                // if called as a normal function instead of a template
                if (!(strings instanceof Array) || strings.length < 1 || !strings.every(each=>typeof each == 'string')) {
                    for (const each of [strings, ...values]) {
                        singleCombinedString += objectToStyledString(each)
                    }
                // if template-call, interweave the values
                } else {
                    for (const index in values) {
                        // add the string value
                        singleCombinedString += strings[index]
                        singleCombinedString += objectToStyledString(values[index])
                    }
                    const lastString = strings.slice(-1)[0]
                    singleCombinedString += lastString
                }
                styleAccumulator.sequence.push(singleCombinedString)
                return styleAccumulator
            }
            styleAccumulator[styleObjectSymbol] = true
            styleAccumulator.styles = [ styleString ]
            styleAccumulator.sequence = [ styleString ]
            styleAccumulator.toString = ()=>styleAccumulator.sequence.join("")+styleStrings.reset
            styleAccumulator[Deno.customInspect] = ()=>styleAccumulator.sequence.join("")+styleStrings.reset
            styleAccumulator[symbolForConsoleLog] = ()=>{
                const asString = styleAccumulator.toString()
                if (Console.reliableColorSupport.includesAnsi) {
                    return asString
                } else {
                    return clearAnsiStylesFrom(asString)
                }
            }
            return Object.defineProperties(styleAccumulator, Object.fromEntries(Object.entries(styleStrings).map(
                ([key,value])=>[
                    key,
                    { 
                        get() {
                            styleAccumulator.styles.push(value)
                            styleAccumulator.sequence.push(value)
                            return styleAccumulator
                        }
                    }
                ]
            )))
        }
        const topLevelStyleAccumulator = (strings, ...values)=>createStyleAccumulator(rootStyleString)(strings, ...values)
        topLevelStyleAccumulator[styleObjectSymbol] = true
        topLevelStyleAccumulator.toString = ()=>rootStyleString
        topLevelStyleAccumulator[symbolForConsoleLog] = ()=>{
            const asString = topLevelStyleAccumulator.toString()
            if (Console.reliableColorSupport.includesAnsi) {
                return asString
            } else {
                return clearAnsiStylesFrom(asString)
            }
        }
        return Object.defineProperties(topLevelStyleAccumulator, Object.fromEntries(Object.entries(styleStrings).map(
            ([eachStyleName, eachStyleString])=>[
                eachStyleName,
                { 
                    get() {
                        const styleAccumulator = createStyleAccumulator(rootStyleString)
                        styleAccumulator.styles.push(eachStyleString)
                        styleAccumulator.sequence.push(eachStyleString)
                        return styleAccumulator
                    }
                }
            ]
        )))
    }

    // 
    // export all the colors
    // 
    export const bold                   = styleObject(styleStrings.bold)
    export const reset                  = styleObject(styleStrings.reset)
    export const dim                    = styleObject(styleStrings.dim)
    export const italic                 = styleObject(styleStrings.italic)
    export const underline              = styleObject(styleStrings.underline)
    export const inverse                = styleObject(styleStrings.inverse)
    export const strikethrough          = styleObject(styleStrings.strikethrough)
    export const black                  = styleObject(styleStrings.black)
    export const white                  = styleObject(styleStrings.white)
    export const red                    = styleObject(styleStrings.red)
    export const green                  = styleObject(styleStrings.green)
    export const blue                   = styleObject(styleStrings.blue)
    export const yellow                 = styleObject(styleStrings.yellow)
    export const cyan                   = styleObject(styleStrings.cyan)
    export const magenta                = styleObject(styleStrings.magenta)
    export const lightBlack             = styleObject(styleStrings.lightBlack)
    export const lightWhite             = styleObject(styleStrings.lightWhite)
    export const lightRed               = styleObject(styleStrings.lightRed)
    export const lightGreen             = styleObject(styleStrings.lightGreen)
    export const lightBlue              = styleObject(styleStrings.lightBlue)
    export const lightYellow            = styleObject(styleStrings.lightYellow)
    export const lightMagenta           = styleObject(styleStrings.lightMagenta)
    export const lightCyan              = styleObject(styleStrings.lightCyan)
    export const blackBackground        = styleObject(styleStrings.blackBackground)
    export const whiteBackground        = styleObject(styleStrings.whiteBackground)
    export const redBackground          = styleObject(styleStrings.redBackground)
    export const greenBackground        = styleObject(styleStrings.greenBackground)
    export const blueBackground         = styleObject(styleStrings.blueBackground)
    export const yellowBackground       = styleObject(styleStrings.yellowBackground)
    export const magentaBackground      = styleObject(styleStrings.magentaBackground)
    export const cyanBackground         = styleObject(styleStrings.cyanBackground)
    export const lightBlackBackground   = styleObject(styleStrings.lightBlackBackground)
    export const lightRedBackground     = styleObject(styleStrings.lightRedBackground)
    export const lightGreenBackground   = styleObject(styleStrings.lightGreenBackground)
    export const lightYellowBackground  = styleObject(styleStrings.lightYellowBackground)
    export const lightBlueBackground    = styleObject(styleStrings.lightBlueBackground)
    export const lightMagentaBackground = styleObject(styleStrings.lightMagentaBackground)
    export const lightCyanBackground    = styleObject(styleStrings.lightCyanBackground)
    export const lightWhiteBackground   = styleObject(styleStrings.lightWhiteBackground)
    export const gray                   = styleObject(styleStrings.gray)
    export const grey                   = styleObject(styleStrings.grey)
    export const lightGray              = styleObject(styleStrings.lightGray)
    export const lightGrey              = styleObject(styleStrings.lightGrey)
    export const grayBackground         = styleObject(styleStrings.grayBackground)
    export const greyBackground         = styleObject(styleStrings.greyBackground)
    export const lightGrayBackground    = styleObject(styleStrings.lightGrayBackground)
    export const lightGreyBackground    = styleObject(styleStrings.lightGreyBackground)

const colorSupportCache = {
    includesAnsi: null,
    includes256: null,
    includes16m: null,
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
            if (!Console.reliableColorSupport.includesAnsi) {
                arg1 = clearAnsiStylesFrom(arg1)
                others = others.map(each=>{
                    if (typeof each == 'string') {
                        return clearAnsiStylesFrom(each)
                    } else {
                        return each
                    }
                })
            }
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
    get env() {
        // this is a cached getter to prevent Deno.env.toObject() from getting called until necessary
        return env = env || new Proxy(
            Deno.env.toObject(),
            {
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
                        return original[key]
                    } else {
                        return Deno.env.get(key)
                    }
                },
                set(original, key, value) {
                    original[key] = value
                    if (typeof key !== 'symbol') {
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
            }
        )
    },
    disableColorIfNonIteractive: true,
    askFor: {
        // in the future once Deno.setRaw is stable, add a askFor.password using: https://github.com/caspervonb/deno-prompts
        line(question) {
            return prompt(question)
        },
        confirmation(question) {
            console.log(question)
            prompt("[use CTRL+C to quit, or press enter to continue]")
        },
        positiveIntegerOrZero(question) {
            while (1) {
                console.log(question)
                const answer = prompt(question)
                const asNumber = answer-0
                // Make sure its a real number
                const isRealNumber = asNumber !== asNumber && asNumber*2 !== asNumber
                const isInteger = Math.round(asNumber) === asNumber
                const isNonNegative = asNumber >= 0
                if (isRealNumber && isInteger && isNonNegative) {
                    return asNumber
                } else {
                    if (!isRealNumber) {
                        console.log(`I don't think ${answer} is a real number, please try again`)
                    }
                    if (!isInteger) {
                        console.log(`I don't think ${answer} is an integer, please try again`)
                    }
                    if (!isNonNegative) {
                        console.log(`I don't think ${answer} is ≥ 0, please try again`)
                    }
                }
            }
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
        oneOf(keyValues, question="Please type one of the names from the list above") {
            if (keyValues instanceof Array) {
                keyValues = Object.fromEntries(keyValues.map((each,index)=>[index,each]))
            }
            const keys = Object.keys(keyValues)
            if (keys.length == 0) {
                console.warn(`Tried to perform Console.askFor.oneOf(object) but the object was empty`)
                return undefined
            }
            const longest = Math.max(keys.map(each=>each.length))
            while (true) {
                for (const [key, value] of Object.entries(keyValues)) {
                    const valueAsString = indent({string: `${value}\n`, by: " ".repeat(longest+2), noLead: true})
                    console.log(``,`${key}: ${valueAsString}`)
                }
                let answer = prompt(question)
                if (keys.includes(answer)) {
                    return keyValues[answer]
                } else {
                    console.log("\n\n[ please pick one of the listed names, or use CTRL+C to cancel ]")
                }
            }
        },
    },
    get paths() {
        const spliter = OperatingSystem.commonChecks.isWindows ? ";" : ":"
        return Deno.env.get("PATH").split(spliter)
    },
    get reliableColorSupport() {
        if (colorSupportCache.includesAnsi != null) {
            return colorSupportCache
        }

        // if output isnt a terminal... then there is no terminal support for color
        // However; this may need to be changed for pipe operations that will be piped back out to a terminal
        // reliableColorSupport treats "false" as the safe default when there is uncertainity in support
        let terminalSupport
        if (!Deno.isatty(0)) {
            terminalSupport = {
                includesAnsi: false,
                includes256: false,
                includes16m: false,
            }
        // the Deno option for disabling color
        } else if ("NO_COLOR" in Console.env) {
            terminalSupport = {
                includesAnsi: false,
                includes256: false,
                includes16m: false,
            }
        } else {
            // if still potentially on windows
            if (OperatingSystem.commonChecks.isWindows || OperatingSystem.commonChecks.isWsl) {
                // only Windows Terminal has reliable support
                // https://github.com/microsoft/terminal/pull/897
                if (Deno.env.get("WT_SESSION")) {
                    terminalSupport = {
                        includesAnsi: true,
                        includes256: true,
                        includes16m: true,
                    }
                } else {
                    // CMD
                        // while CMD has support under certain conditions:
                        // I don't know of a way to reliably detect CMD vs Powershell (and there are important differences between the two)
                            // // Windows 10 build 1909 is the first Windows release that supports ansi color
                            // // Windows 10 build 10586 is the first Windows release that supports 256 colors.
                            // // Windows 10 build 14931 is the first release that supports 16m/TrueColor.
                            // const [major, minor, build] = OperatingSystem.versionArray
                            // const colors = {
                            //     includesAnsi: build >= 1909,
                            //     includes256: build >= 10586,
                            //     includes16m: build >= 14931,
                            // }
                    // Powershell
                        // not only is it difficult to detect if powershell is the active terminal, but also
                        // there is a 2nd problem; even if colors are *technically* powershell screws them up
                        // by making a handful of common colors unreadable
                        // meaning a terminal app that uses those colors may be unreadable by the user
                    
                    // for the reasons above, the color support is not reliable (e.g. return false)
                    terminalSupport = {
                        includesAnsi: false,
                        includes256: false,
                        includes16m: false,
                    }
                }
            // pure Linux and/or MacOS
            } else {
                //
                // terminal support
                //
                if ('TERM_PROGRAM' in Console.env) {
                    const version = Number.parseInt((Console.env.TERM_PROGRAM_VERSION || '').split('.')[0], 10)
                    if (Console.env.TERM_PROGRAM == 'iTerm.app') {
                        if (version >= 3) {
                            terminalSupport = {
                                includesAnsi: true,
                                includes256: true,
                                includes16m: true,
                            }
                        } else {
                            terminalSupport = {
                                includesAnsi: true,
                                includes256: true,
                                includes16m: false,
                            }
                        }
                    } else if (Console.env.TERM_PROGRAM == 'Apple_Terminal') {
                        terminalSupport = {
                            includesAnsi: true,
                            includes256: true,
                            includes16m: false,
                        }
                    }
                }
                if (Console.env.TERM === 'dumb') {
                    terminalSupport = {
                        includesAnsi: false,
                        includes256: false,
                        includes16m: false,
                    }
                } else if ('CI' in Console.env) {
                    terminalSupport = {
                        includesAnsi: ['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'GITHUB_ACTIONS', 'BUILDKITE', 'DRONE'].some(sign => sign in Console.env) || Console.env.CI_NAME === 'codeship',
                        includes256: false,
                        includes16m: false,
                    }
                } else if (Console.env.COLORTERM === 'truecolor') {
                    terminalSupport = {
                        includesAnsi: true,
                        includes256: true,
                        includes16m: true,
                    }
                } else if (/-256(color)?$/i.test(Console.env.TERM)) {
                    terminalSupport = {
                        includesAnsi: true,
                        includes256: true,
                        includes16m: false,
                    }
                } else if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(Console.env.TERM)) {
                    terminalSupport = {
                        includesAnsi: true,
                        includes256: false,
                        includes16m: false,
                    }
                } else if ('COLORTERM' in Console.env) {
                    terminalSupport = {
                        includesAnsi: true,
                        includes256: false,
                        includes16m: false,
                    }
                } else {
                    terminalSupport = {
                        includesAnsi: false,
                        includes256: false,
                        includes16m: false,
                    }
                }
            }
        }

        colorSupportCache.includesAnsi = terminalSupport.includesAnsi
        colorSupportCache.includes256  = terminalSupport.includes256
        colorSupportCache.includes16m  = terminalSupport.includes16m
        return colorSupportCache
    },
}