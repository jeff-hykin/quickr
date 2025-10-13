import process from "node:process"
export const env = new Proxy(
    {},
    {
        ownKeys(original) {
            return Object.keys(Deno.env.toObject())
        },
        getOwnPropertyDescriptor(original, prop) {
            return {
                enumerable: true,
                configurable: true,
                value: Deno.env.get(prop),
            }
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
                if (key=='@') {
                    return Deno.args
                }
                if (key=='*') {
                    return Deno.args.join(" ")
                }
                if (key=='#') {
                    return Deno.args.length
                }
                if (key=='$') {
                    return Deno.pid
                }
                if (key.match(/^[0-9]+$/)) {
                    if (key === "0") {
                        return process.argv[1]
                    }
                    return Deno.args[key]
                }
                return Deno.env.get(key)||""
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