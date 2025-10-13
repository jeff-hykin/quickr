export const env = new Proxy(
    {},
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