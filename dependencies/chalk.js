try {
    module = {}
    module.exports = {}
} catch (error) {

}
function $parcel$export(e, n, v, s) {
    Object.defineProperty(e, n, { get: v, set: s, enumerable: true, configurable: true })
}
var $parcel$global = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {}
var $parcel$modules = {}
var $parcel$inits = {}

var parcelRequire = $parcel$global["parcelRequire7111"]
if (parcelRequire == null) {
    parcelRequire = function (id) {
        if (id in $parcel$modules) {
            return $parcel$modules[id].exports
        }
        if (id in $parcel$inits) {
            var init = $parcel$inits[id]
            delete $parcel$inits[id]
            var module = { id: id, exports: {} }
            $parcel$modules[id] = module
            init.call(module.exports, module, module.exports)
            return module.exports
        }
        var err = new Error("Cannot find module '" + id + "'")
        err.code = "MODULE_NOT_FOUND"
        throw err
    }

    parcelRequire.register = function register(id, init) {
        $parcel$inits[id] = init
    }

    $parcel$global["parcelRequire7111"] = parcelRequire
}
parcelRequire.register("9nb1c", function (module, exports) {
    // shim for using process in browser
    var $6d2ecf10f390706f$var$process = (module.exports = {})
    // cached from whatever global is present so that test runners that stub it
    // don't break things.  But we need to wrap it in a try catch in case it is
    // wrapped in strict mode code which doesn't define any globals.  It's inside a
    // function because try/catches deoptimize in certain engines.
    var $6d2ecf10f390706f$var$cachedSetTimeout
    var $6d2ecf10f390706f$var$cachedClearTimeout
    function $6d2ecf10f390706f$var$defaultSetTimout() {
        throw new Error("setTimeout has not been defined")
    }
    function $6d2ecf10f390706f$var$defaultClearTimeout() {
        throw new Error("clearTimeout has not been defined")
    }
    ;(function () {
        try {
            if (typeof setTimeout === "function") $6d2ecf10f390706f$var$cachedSetTimeout = setTimeout
            else $6d2ecf10f390706f$var$cachedSetTimeout = $6d2ecf10f390706f$var$defaultSetTimout
        } catch (e) {
            $6d2ecf10f390706f$var$cachedSetTimeout = $6d2ecf10f390706f$var$defaultSetTimout
        }
        try {
            if (typeof clearTimeout === "function") $6d2ecf10f390706f$var$cachedClearTimeout = clearTimeout
            else $6d2ecf10f390706f$var$cachedClearTimeout = $6d2ecf10f390706f$var$defaultClearTimeout
        } catch (e1) {
            $6d2ecf10f390706f$var$cachedClearTimeout = $6d2ecf10f390706f$var$defaultClearTimeout
        }
    })()
    function $6d2ecf10f390706f$var$runTimeout(fun) {
        if ($6d2ecf10f390706f$var$cachedSetTimeout === setTimeout)
            //normal enviroments in sane situations
            return setTimeout(fun, 0)
        // if setTimeout wasn't available but was latter defined
        if (($6d2ecf10f390706f$var$cachedSetTimeout === $6d2ecf10f390706f$var$defaultSetTimout || !$6d2ecf10f390706f$var$cachedSetTimeout) && setTimeout) {
            $6d2ecf10f390706f$var$cachedSetTimeout = setTimeout
            return setTimeout(fun, 0)
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return $6d2ecf10f390706f$var$cachedSetTimeout(fun, 0)
        } catch (e) {
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return $6d2ecf10f390706f$var$cachedSetTimeout.call(null, fun, 0)
            } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return $6d2ecf10f390706f$var$cachedSetTimeout.call(this, fun, 0)
            }
        }
    }
    function $6d2ecf10f390706f$var$runClearTimeout(marker) {
        if ($6d2ecf10f390706f$var$cachedClearTimeout === clearTimeout)
            //normal enviroments in sane situations
            return clearTimeout(marker)
        // if clearTimeout wasn't available but was latter defined
        if (($6d2ecf10f390706f$var$cachedClearTimeout === $6d2ecf10f390706f$var$defaultClearTimeout || !$6d2ecf10f390706f$var$cachedClearTimeout) && clearTimeout) {
            $6d2ecf10f390706f$var$cachedClearTimeout = clearTimeout
            return clearTimeout(marker)
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return $6d2ecf10f390706f$var$cachedClearTimeout(marker)
        } catch (e) {
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return $6d2ecf10f390706f$var$cachedClearTimeout.call(null, marker)
            } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return $6d2ecf10f390706f$var$cachedClearTimeout.call(this, marker)
            }
        }
    }
    var $6d2ecf10f390706f$var$queue = []
    var $6d2ecf10f390706f$var$draining = false
    var $6d2ecf10f390706f$var$currentQueue
    var $6d2ecf10f390706f$var$queueIndex = -1
    function $6d2ecf10f390706f$var$cleanUpNextTick() {
        if (!$6d2ecf10f390706f$var$draining || !$6d2ecf10f390706f$var$currentQueue) return
        $6d2ecf10f390706f$var$draining = false
        if ($6d2ecf10f390706f$var$currentQueue.length) $6d2ecf10f390706f$var$queue = $6d2ecf10f390706f$var$currentQueue.concat($6d2ecf10f390706f$var$queue)
        else $6d2ecf10f390706f$var$queueIndex = -1
        if ($6d2ecf10f390706f$var$queue.length) $6d2ecf10f390706f$var$drainQueue()
    }
    function $6d2ecf10f390706f$var$drainQueue() {
        if ($6d2ecf10f390706f$var$draining) return
        var timeout = $6d2ecf10f390706f$var$runTimeout($6d2ecf10f390706f$var$cleanUpNextTick)
        $6d2ecf10f390706f$var$draining = true
        var len = $6d2ecf10f390706f$var$queue.length
        while (len) {
            $6d2ecf10f390706f$var$currentQueue = $6d2ecf10f390706f$var$queue
            $6d2ecf10f390706f$var$queue = []
            while (++$6d2ecf10f390706f$var$queueIndex < len) if ($6d2ecf10f390706f$var$currentQueue) $6d2ecf10f390706f$var$currentQueue[$6d2ecf10f390706f$var$queueIndex].run()
            $6d2ecf10f390706f$var$queueIndex = -1
            len = $6d2ecf10f390706f$var$queue.length
        }
        $6d2ecf10f390706f$var$currentQueue = null
        $6d2ecf10f390706f$var$draining = false
        $6d2ecf10f390706f$var$runClearTimeout(timeout)
    }
    $6d2ecf10f390706f$var$process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1)
        if (arguments.length > 1) for (var i = 1; i < arguments.length; i++) args[i - 1] = arguments[i]
        $6d2ecf10f390706f$var$queue.push(new $6d2ecf10f390706f$var$Item(fun, args))
        if ($6d2ecf10f390706f$var$queue.length === 1 && !$6d2ecf10f390706f$var$draining) $6d2ecf10f390706f$var$runTimeout($6d2ecf10f390706f$var$drainQueue)
    }
    // v8 likes predictible objects
    function $6d2ecf10f390706f$var$Item(fun, array) {
        this.fun = fun
        this.array = array
    }
    $6d2ecf10f390706f$var$Item.prototype.run = function () {
        this.fun.apply(null, this.array)
    }
    $6d2ecf10f390706f$var$process.title = "browser"
    $6d2ecf10f390706f$var$process.browser = true
    $6d2ecf10f390706f$var$process.env = {}
    $6d2ecf10f390706f$var$process.argv = []
    $6d2ecf10f390706f$var$process.version = "" // empty string to avoid regexp issues
    $6d2ecf10f390706f$var$process.versions = {}
    function $6d2ecf10f390706f$var$noop() {}
    $6d2ecf10f390706f$var$process.on = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.addListener = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.once = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.off = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.removeListener = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.removeAllListeners = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.emit = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.prependListener = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.prependOnceListener = $6d2ecf10f390706f$var$noop
    $6d2ecf10f390706f$var$process.listeners = function (name) {
        return []
    }
    $6d2ecf10f390706f$var$process.binding = function (name) {
        throw new Error("process.binding is not supported")
    }
    $6d2ecf10f390706f$var$process.cwd = function () {
        return "/"
    }
    $6d2ecf10f390706f$var$process.chdir = function (dir) {
        throw new Error("process.chdir is not supported")
    }
    $6d2ecf10f390706f$var$process.umask = function () {
        return 0
    }
})

parcelRequire.register("9u0DI", function (module, exports) {
    $parcel$export(
        module.exports,
        "isatty",
        () => $6e77696498d0919b$export$9b473d35051e2626,
        (v) => ($6e77696498d0919b$export$9b473d35051e2626 = v)
    )
    $parcel$export(
        module.exports,
        "ReadStream",
        () => $6e77696498d0919b$export$de64a30e4ee40519,
        (v) => ($6e77696498d0919b$export$de64a30e4ee40519 = v)
    )
    $parcel$export(
        module.exports,
        "WriteStream",
        () => $6e77696498d0919b$export$b6b358f069d459a3,
        (v) => ($6e77696498d0919b$export$b6b358f069d459a3 = v)
    )
    var $6e77696498d0919b$export$9b473d35051e2626
    var $6e77696498d0919b$export$de64a30e4ee40519
    var $6e77696498d0919b$export$b6b358f069d459a3
    $6e77696498d0919b$export$9b473d35051e2626 = function () {
        return false
    }
    function $6e77696498d0919b$var$ReadStream() {
        throw new Error("tty.ReadStream is not implemented")
    }
    $6e77696498d0919b$export$de64a30e4ee40519 = $6e77696498d0919b$var$ReadStream
    function $6e77696498d0919b$var$WriteStream() {
        throw new Error("tty.WriteStream is not implemented")
    }
    $6e77696498d0919b$export$b6b358f069d459a3 = $6e77696498d0919b$var$WriteStream
})

parcelRequire.register("cDsRi", function (module, exports) {
    // Currently in sync with Node.js lib/internal/util/types.js
    // https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9
    "use strict"

    var $7lj5R = parcelRequire("7lj5R")

    var $7qka1 = parcelRequire("7qka1")

    var $98fQt = parcelRequire("98fQt")

    var $fX2rl = parcelRequire("fX2rl")
    function $932f834483233a95$var$uncurryThis(f) {
        return f.call.bind(f)
    }
    var $932f834483233a95$var$BigIntSupported = typeof BigInt !== "undefined"
    var $932f834483233a95$var$SymbolSupported = typeof Symbol !== "undefined"
    var $932f834483233a95$var$ObjectToString = $932f834483233a95$var$uncurryThis(Object.prototype.toString)
    var $932f834483233a95$var$numberValue = $932f834483233a95$var$uncurryThis(Number.prototype.valueOf)
    var $932f834483233a95$var$stringValue = $932f834483233a95$var$uncurryThis(String.prototype.valueOf)
    var $932f834483233a95$var$booleanValue = $932f834483233a95$var$uncurryThis(Boolean.prototype.valueOf)
    if ($932f834483233a95$var$BigIntSupported) var $932f834483233a95$var$bigIntValue = $932f834483233a95$var$uncurryThis(BigInt.prototype.valueOf)
    if ($932f834483233a95$var$SymbolSupported) var $932f834483233a95$var$symbolValue = $932f834483233a95$var$uncurryThis(Symbol.prototype.valueOf)
    function $932f834483233a95$var$checkBoxedPrimitive(value, prototypeValueOf) {
        if (typeof value !== "object") return false
        try {
            prototypeValueOf(value)
            return true
        } catch (e) {
            return false
        }
    }
    module.exports.isArgumentsObject = $7lj5R
    module.exports.isGeneratorFunction = $7qka1
    module.exports.isTypedArray = $fX2rl
    // Taken from here and modified for better browser support
    // https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
    function $932f834483233a95$var$isPromise(input) {
        return (typeof Promise !== "undefined" && input instanceof Promise) || (input !== null && typeof input === "object" && typeof input.then === "function" && typeof input.catch === "function")
    }
    module.exports.isPromise = $932f834483233a95$var$isPromise
    function $932f834483233a95$var$isArrayBufferView(value) {
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) return ArrayBuffer.isView(value)
        return $fX2rl(value) || $932f834483233a95$var$isDataView(value)
    }
    module.exports.isArrayBufferView = $932f834483233a95$var$isArrayBufferView
    function $932f834483233a95$var$isUint8Array(value) {
        return $98fQt(value) === "Uint8Array"
    }
    module.exports.isUint8Array = $932f834483233a95$var$isUint8Array
    function $932f834483233a95$var$isUint8ClampedArray(value) {
        return $98fQt(value) === "Uint8ClampedArray"
    }
    module.exports.isUint8ClampedArray = $932f834483233a95$var$isUint8ClampedArray
    function $932f834483233a95$var$isUint16Array(value) {
        return $98fQt(value) === "Uint16Array"
    }
    module.exports.isUint16Array = $932f834483233a95$var$isUint16Array
    function $932f834483233a95$var$isUint32Array(value) {
        return $98fQt(value) === "Uint32Array"
    }
    module.exports.isUint32Array = $932f834483233a95$var$isUint32Array
    function $932f834483233a95$var$isInt8Array(value) {
        return $98fQt(value) === "Int8Array"
    }
    module.exports.isInt8Array = $932f834483233a95$var$isInt8Array
    function $932f834483233a95$var$isInt16Array(value) {
        return $98fQt(value) === "Int16Array"
    }
    module.exports.isInt16Array = $932f834483233a95$var$isInt16Array
    function $932f834483233a95$var$isInt32Array(value) {
        return $98fQt(value) === "Int32Array"
    }
    module.exports.isInt32Array = $932f834483233a95$var$isInt32Array
    function $932f834483233a95$var$isFloat32Array(value) {
        return $98fQt(value) === "Float32Array"
    }
    module.exports.isFloat32Array = $932f834483233a95$var$isFloat32Array
    function $932f834483233a95$var$isFloat64Array(value) {
        return $98fQt(value) === "Float64Array"
    }
    module.exports.isFloat64Array = $932f834483233a95$var$isFloat64Array
    function $932f834483233a95$var$isBigInt64Array(value) {
        return $98fQt(value) === "BigInt64Array"
    }
    module.exports.isBigInt64Array = $932f834483233a95$var$isBigInt64Array
    function $932f834483233a95$var$isBigUint64Array(value) {
        return $98fQt(value) === "BigUint64Array"
    }
    module.exports.isBigUint64Array = $932f834483233a95$var$isBigUint64Array
    function $932f834483233a95$var$isMapToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object Map]"
    }
    $932f834483233a95$var$isMapToString.working = typeof Map !== "undefined" && $932f834483233a95$var$isMapToString(new Map())
    function $932f834483233a95$var$isMap(value) {
        if (typeof Map === "undefined") return false
        return $932f834483233a95$var$isMapToString.working ? $932f834483233a95$var$isMapToString(value) : value instanceof Map
    }
    module.exports.isMap = $932f834483233a95$var$isMap
    function $932f834483233a95$var$isSetToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object Set]"
    }
    $932f834483233a95$var$isSetToString.working = typeof Set !== "undefined" && $932f834483233a95$var$isSetToString(new Set())
    function $932f834483233a95$var$isSet(value) {
        if (typeof Set === "undefined") return false
        return $932f834483233a95$var$isSetToString.working ? $932f834483233a95$var$isSetToString(value) : value instanceof Set
    }
    module.exports.isSet = $932f834483233a95$var$isSet
    function $932f834483233a95$var$isWeakMapToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object WeakMap]"
    }
    $932f834483233a95$var$isWeakMapToString.working = typeof WeakMap !== "undefined" && $932f834483233a95$var$isWeakMapToString(new WeakMap())
    function $932f834483233a95$var$isWeakMap(value) {
        if (typeof WeakMap === "undefined") return false
        return $932f834483233a95$var$isWeakMapToString.working ? $932f834483233a95$var$isWeakMapToString(value) : value instanceof WeakMap
    }
    module.exports.isWeakMap = $932f834483233a95$var$isWeakMap
    function $932f834483233a95$var$isWeakSetToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object WeakSet]"
    }
    $932f834483233a95$var$isWeakSetToString.working = typeof WeakSet !== "undefined" && $932f834483233a95$var$isWeakSetToString(new WeakSet())
    function $932f834483233a95$var$isWeakSet(value) {
        return $932f834483233a95$var$isWeakSetToString(value)
    }
    module.exports.isWeakSet = $932f834483233a95$var$isWeakSet
    function $932f834483233a95$var$isArrayBufferToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object ArrayBuffer]"
    }
    $932f834483233a95$var$isArrayBufferToString.working = typeof ArrayBuffer !== "undefined" && $932f834483233a95$var$isArrayBufferToString(new ArrayBuffer())
    function $932f834483233a95$var$isArrayBuffer(value) {
        if (typeof ArrayBuffer === "undefined") return false
        return $932f834483233a95$var$isArrayBufferToString.working ? $932f834483233a95$var$isArrayBufferToString(value) : value instanceof ArrayBuffer
    }
    module.exports.isArrayBuffer = $932f834483233a95$var$isArrayBuffer
    function $932f834483233a95$var$isDataViewToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object DataView]"
    }
    $932f834483233a95$var$isDataViewToString.working = typeof ArrayBuffer !== "undefined" && typeof DataView !== "undefined" && $932f834483233a95$var$isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
    function $932f834483233a95$var$isDataView(value) {
        if (typeof DataView === "undefined") return false
        return $932f834483233a95$var$isDataViewToString.working ? $932f834483233a95$var$isDataViewToString(value) : value instanceof DataView
    }
    module.exports.isDataView = $932f834483233a95$var$isDataView
    // Store a copy of SharedArrayBuffer in case it's deleted elsewhere
    var $932f834483233a95$var$SharedArrayBufferCopy = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : undefined
    function $932f834483233a95$var$isSharedArrayBufferToString(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object SharedArrayBuffer]"
    }
    function $932f834483233a95$var$isSharedArrayBuffer(value) {
        if (typeof $932f834483233a95$var$SharedArrayBufferCopy === "undefined") return false
        if (typeof $932f834483233a95$var$isSharedArrayBufferToString.working === "undefined") $932f834483233a95$var$isSharedArrayBufferToString.working = $932f834483233a95$var$isSharedArrayBufferToString(new $932f834483233a95$var$SharedArrayBufferCopy())
        return $932f834483233a95$var$isSharedArrayBufferToString.working ? $932f834483233a95$var$isSharedArrayBufferToString(value) : value instanceof $932f834483233a95$var$SharedArrayBufferCopy
    }
    module.exports.isSharedArrayBuffer = $932f834483233a95$var$isSharedArrayBuffer
    function $932f834483233a95$var$isAsyncFunction(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object AsyncFunction]"
    }
    module.exports.isAsyncFunction = $932f834483233a95$var$isAsyncFunction
    function $932f834483233a95$var$isMapIterator(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object Map Iterator]"
    }
    module.exports.isMapIterator = $932f834483233a95$var$isMapIterator
    function $932f834483233a95$var$isSetIterator(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object Set Iterator]"
    }
    module.exports.isSetIterator = $932f834483233a95$var$isSetIterator
    function $932f834483233a95$var$isGeneratorObject(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object Generator]"
    }
    module.exports.isGeneratorObject = $932f834483233a95$var$isGeneratorObject
    function $932f834483233a95$var$isWebAssemblyCompiledModule(value) {
        return $932f834483233a95$var$ObjectToString(value) === "[object WebAssembly.Module]"
    }
    module.exports.isWebAssemblyCompiledModule = $932f834483233a95$var$isWebAssemblyCompiledModule
    function $932f834483233a95$var$isNumberObject(value) {
        return $932f834483233a95$var$checkBoxedPrimitive(value, $932f834483233a95$var$numberValue)
    }
    module.exports.isNumberObject = $932f834483233a95$var$isNumberObject
    function $932f834483233a95$var$isStringObject(value) {
        return $932f834483233a95$var$checkBoxedPrimitive(value, $932f834483233a95$var$stringValue)
    }
    module.exports.isStringObject = $932f834483233a95$var$isStringObject
    function $932f834483233a95$var$isBooleanObject(value) {
        return $932f834483233a95$var$checkBoxedPrimitive(value, $932f834483233a95$var$booleanValue)
    }
    module.exports.isBooleanObject = $932f834483233a95$var$isBooleanObject
    function $932f834483233a95$var$isBigIntObject(value) {
        return $932f834483233a95$var$BigIntSupported && $932f834483233a95$var$checkBoxedPrimitive(value, $932f834483233a95$var$bigIntValue)
    }
    module.exports.isBigIntObject = $932f834483233a95$var$isBigIntObject
    function $932f834483233a95$var$isSymbolObject(value) {
        return $932f834483233a95$var$SymbolSupported && $932f834483233a95$var$checkBoxedPrimitive(value, $932f834483233a95$var$symbolValue)
    }
    module.exports.isSymbolObject = $932f834483233a95$var$isSymbolObject
    function $932f834483233a95$var$isBoxedPrimitive(value) {
        return $932f834483233a95$var$isNumberObject(value) || $932f834483233a95$var$isStringObject(value) || $932f834483233a95$var$isBooleanObject(value) || $932f834483233a95$var$isBigIntObject(value) || $932f834483233a95$var$isSymbolObject(value)
    }
    module.exports.isBoxedPrimitive = $932f834483233a95$var$isBoxedPrimitive
    function $932f834483233a95$var$isAnyArrayBuffer(value) {
        return typeof Uint8Array !== "undefined" && ($932f834483233a95$var$isArrayBuffer(value) || $932f834483233a95$var$isSharedArrayBuffer(value))
    }
    module.exports.isAnyArrayBuffer = $932f834483233a95$var$isAnyArrayBuffer
    ;["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function (method) {
        Object.defineProperty(module.exports, method, {
            enumerable: false,
            value: function () {
                throw new Error(method + " is not supported in userland")
            },
        })
    })
})
parcelRequire.register("7lj5R", function (module, exports) {
    "use strict"

    var $55894e20f97368d4$var$hasToStringTag = parcelRequire("9qqVB")()

    var $1laoF = parcelRequire("1laoF")
    var $55894e20f97368d4$var$$toString = $1laoF("Object.prototype.toString")
    var $55894e20f97368d4$var$isStandardArguments = function isArguments(value) {
        if ($55894e20f97368d4$var$hasToStringTag && value && typeof value === "object" && Symbol.toStringTag in value) return false
        return $55894e20f97368d4$var$$toString(value) === "[object Arguments]"
    }
    var $55894e20f97368d4$var$isLegacyArguments = function isArguments(value) {
        if ($55894e20f97368d4$var$isStandardArguments(value)) return true
        return value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && $55894e20f97368d4$var$$toString(value) !== "[object Array]" && $55894e20f97368d4$var$$toString(value.callee) === "[object Function]"
    }
    var $55894e20f97368d4$var$supportsStandardArguments = (function () {
        return $55894e20f97368d4$var$isStandardArguments(arguments)
    })()
    $55894e20f97368d4$var$isStandardArguments.isLegacyArguments = $55894e20f97368d4$var$isLegacyArguments // for tests
    module.exports = $55894e20f97368d4$var$supportsStandardArguments ? $55894e20f97368d4$var$isStandardArguments : $55894e20f97368d4$var$isLegacyArguments
})
parcelRequire.register("9qqVB", function (module, exports) {
    "use strict"

    var $91ncz = parcelRequire("91ncz")
    module.exports = function hasToStringTagShams() {
        return $91ncz() && !!Symbol.toStringTag
    }
})
parcelRequire.register("91ncz", function (module, exports) {
    "use strict"
    /* eslint complexity: [2, 18], max-statements: [2, 33] */ module.exports = function hasSymbols() {
        if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") return false
        if (typeof Symbol.iterator === "symbol") return true
        var obj = {}
        var sym = Symbol("test")
        var symObj = Object(sym)
        if (typeof sym === "string") return false
        if (Object.prototype.toString.call(sym) !== "[object Symbol]") return false
        if (Object.prototype.toString.call(symObj) !== "[object Symbol]") return false
        // temp disabled per https://github.com/ljharb/object.assign/issues/17
        // if (sym instanceof Symbol) { return false; }
        // temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
        // if (!(symObj instanceof Symbol)) { return false; }
        // if (typeof Symbol.prototype.toString !== 'function') { return false; }
        // if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }
        var symVal = 42
        obj[sym] = symVal
        for (sym in obj) return false
        // eslint-disable-line no-restricted-syntax, no-unreachable-loop
        if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) return false
        if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) return false
        var syms = Object.getOwnPropertySymbols(obj)
        if (syms.length !== 1 || syms[0] !== sym) return false
        if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) return false
        if (typeof Object.getOwnPropertyDescriptor === "function") {
            var descriptor = Object.getOwnPropertyDescriptor(obj, sym)
            if (descriptor.value !== symVal || descriptor.enumerable !== true) return false
        }
        return true
    }
})

parcelRequire.register("1laoF", function (module, exports) {
    "use strict"

    var $7Phts = parcelRequire("7Phts")

    var $h7y5I = parcelRequire("h7y5I")
    var $0f9fd138aff1bbd1$var$$indexOf = $h7y5I($7Phts("String.prototype.indexOf"))
    module.exports = function callBoundIntrinsic(name, allowMissing) {
        var intrinsic = $7Phts(name, !!allowMissing)
        if (typeof intrinsic === "function" && $0f9fd138aff1bbd1$var$$indexOf(name, ".prototype.") > -1) return $h7y5I(intrinsic)
        return intrinsic
    }
})
parcelRequire.register("7Phts", function (module, exports) {
    "use strict"
    var $5b2ad9cc039efe49$var$undefined
    var $5b2ad9cc039efe49$var$$SyntaxError = SyntaxError
    var $5b2ad9cc039efe49$var$$Function = Function
    var $5b2ad9cc039efe49$var$$TypeError = TypeError
    // eslint-disable-next-line consistent-return
    var $5b2ad9cc039efe49$var$getEvalledConstructor = function (expressionSyntax) {
        try {
            return $5b2ad9cc039efe49$var$$Function('"use strict"; return (' + expressionSyntax + ").constructor;")()
        } catch (e) {}
    }
    var $5b2ad9cc039efe49$var$$gOPD = Object.getOwnPropertyDescriptor
    if ($5b2ad9cc039efe49$var$$gOPD)
        try {
            $5b2ad9cc039efe49$var$$gOPD({}, "")
        } catch (e) {
            $5b2ad9cc039efe49$var$$gOPD = null // this is IE 8, which has a broken gOPD
        }
    var $5b2ad9cc039efe49$var$throwTypeError = function () {
        throw new $5b2ad9cc039efe49$var$$TypeError()
    }
    var $5b2ad9cc039efe49$var$ThrowTypeError = $5b2ad9cc039efe49$var$$gOPD
        ? (function () {
              try {
                  // eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
                  arguments.callee // IE 8 does not throw here
                  return $5b2ad9cc039efe49$var$throwTypeError
              } catch (calleeThrows) {
                  try {
                      // IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
                      return $5b2ad9cc039efe49$var$$gOPD(arguments, "callee").get
                  } catch (gOPDthrows) {
                      return $5b2ad9cc039efe49$var$throwTypeError
                  }
              }
          })()
        : $5b2ad9cc039efe49$var$throwTypeError

    var $5b2ad9cc039efe49$var$hasSymbols = parcelRequire("6oO1A")()
    var $5b2ad9cc039efe49$var$getProto =
        Object.getPrototypeOf ||
        function (x) {
            return x.__proto__
        } // eslint-disable-line no-proto
    var $5b2ad9cc039efe49$var$needsEval = {}
    var $5b2ad9cc039efe49$var$TypedArray = typeof Uint8Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : $5b2ad9cc039efe49$var$getProto(Uint8Array)
    var $5b2ad9cc039efe49$var$INTRINSICS = {
        "%AggregateError%": typeof AggregateError === "undefined" ? $5b2ad9cc039efe49$var$undefined : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? $5b2ad9cc039efe49$var$undefined : ArrayBuffer,
        "%ArrayIteratorPrototype%": $5b2ad9cc039efe49$var$hasSymbols ? $5b2ad9cc039efe49$var$getProto([][Symbol.iterator]()) : $5b2ad9cc039efe49$var$undefined,
        "%AsyncFromSyncIteratorPrototype%": $5b2ad9cc039efe49$var$undefined,
        "%AsyncFunction%": $5b2ad9cc039efe49$var$needsEval,
        "%AsyncGenerator%": $5b2ad9cc039efe49$var$needsEval,
        "%AsyncGeneratorFunction%": $5b2ad9cc039efe49$var$needsEval,
        "%AsyncIteratorPrototype%": $5b2ad9cc039efe49$var$needsEval,
        "%Atomics%": typeof Atomics === "undefined" ? $5b2ad9cc039efe49$var$undefined : Atomics,
        "%BigInt%": typeof BigInt === "undefined" ? $5b2ad9cc039efe49$var$undefined : BigInt,
        "%Boolean%": Boolean,
        "%DataView%": typeof DataView === "undefined" ? $5b2ad9cc039efe49$var$undefined : DataView,
        "%Date%": Date,
        "%decodeURI%": decodeURI,
        "%decodeURIComponent%": decodeURIComponent,
        "%encodeURI%": encodeURI,
        "%encodeURIComponent%": encodeURIComponent,
        "%Error%": Error,
        "%eval%": eval,
        "%EvalError%": EvalError,
        "%Float32Array%": typeof Float32Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Float32Array,
        "%Float64Array%": typeof Float64Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Float64Array,
        "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? $5b2ad9cc039efe49$var$undefined : FinalizationRegistry,
        "%Function%": $5b2ad9cc039efe49$var$$Function,
        "%GeneratorFunction%": $5b2ad9cc039efe49$var$needsEval,
        "%Int8Array%": typeof Int8Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Int8Array,
        "%Int16Array%": typeof Int16Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Int16Array,
        "%Int32Array%": typeof Int32Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": $5b2ad9cc039efe49$var$hasSymbols ? $5b2ad9cc039efe49$var$getProto($5b2ad9cc039efe49$var$getProto([][Symbol.iterator]())) : $5b2ad9cc039efe49$var$undefined,
        "%JSON%": typeof JSON === "object" ? JSON : $5b2ad9cc039efe49$var$undefined,
        "%Map%": typeof Map === "undefined" ? $5b2ad9cc039efe49$var$undefined : Map,
        "%MapIteratorPrototype%": typeof Map === "undefined" || !$5b2ad9cc039efe49$var$hasSymbols ? $5b2ad9cc039efe49$var$undefined : $5b2ad9cc039efe49$var$getProto(new Map()[Symbol.iterator]()),
        "%Math%": Math,
        "%Number%": Number,
        "%Object%": Object,
        "%parseFloat%": parseFloat,
        "%parseInt%": parseInt,
        "%Promise%": typeof Promise === "undefined" ? $5b2ad9cc039efe49$var$undefined : Promise,
        "%Proxy%": typeof Proxy === "undefined" ? $5b2ad9cc039efe49$var$undefined : Proxy,
        "%RangeError%": RangeError,
        "%ReferenceError%": ReferenceError,
        "%Reflect%": typeof Reflect === "undefined" ? $5b2ad9cc039efe49$var$undefined : Reflect,
        "%RegExp%": RegExp,
        "%Set%": typeof Set === "undefined" ? $5b2ad9cc039efe49$var$undefined : Set,
        "%SetIteratorPrototype%": typeof Set === "undefined" || !$5b2ad9cc039efe49$var$hasSymbols ? $5b2ad9cc039efe49$var$undefined : $5b2ad9cc039efe49$var$getProto(new Set()[Symbol.iterator]()),
        "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? $5b2ad9cc039efe49$var$undefined : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": $5b2ad9cc039efe49$var$hasSymbols ? $5b2ad9cc039efe49$var$getProto(""[Symbol.iterator]()) : $5b2ad9cc039efe49$var$undefined,
        "%Symbol%": $5b2ad9cc039efe49$var$hasSymbols ? Symbol : $5b2ad9cc039efe49$var$undefined,
        "%SyntaxError%": $5b2ad9cc039efe49$var$$SyntaxError,
        "%ThrowTypeError%": $5b2ad9cc039efe49$var$ThrowTypeError,
        "%TypedArray%": $5b2ad9cc039efe49$var$TypedArray,
        "%TypeError%": $5b2ad9cc039efe49$var$$TypeError,
        "%Uint8Array%": typeof Uint8Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Uint8Array,
        "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? $5b2ad9cc039efe49$var$undefined : Uint8ClampedArray,
        "%Uint16Array%": typeof Uint16Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Uint16Array,
        "%Uint32Array%": typeof Uint32Array === "undefined" ? $5b2ad9cc039efe49$var$undefined : Uint32Array,
        "%URIError%": URIError,
        "%WeakMap%": typeof WeakMap === "undefined" ? $5b2ad9cc039efe49$var$undefined : WeakMap,
        "%WeakRef%": typeof WeakRef === "undefined" ? $5b2ad9cc039efe49$var$undefined : WeakRef,
        "%WeakSet%": typeof WeakSet === "undefined" ? $5b2ad9cc039efe49$var$undefined : WeakSet,
    }
    var $5b2ad9cc039efe49$var$doEval = function doEval(name) {
        var value
        if (name === "%AsyncFunction%") value = $5b2ad9cc039efe49$var$getEvalledConstructor("async function () {}")
        else if (name === "%GeneratorFunction%") value = $5b2ad9cc039efe49$var$getEvalledConstructor("function* () {}")
        else if (name === "%AsyncGeneratorFunction%") value = $5b2ad9cc039efe49$var$getEvalledConstructor("async function* () {}")
        else if (name === "%AsyncGenerator%") {
            var fn = doEval("%AsyncGeneratorFunction%")
            if (fn) value = fn.prototype
        } else if (name === "%AsyncIteratorPrototype%") {
            var gen = doEval("%AsyncGenerator%")
            if (gen) value = $5b2ad9cc039efe49$var$getProto(gen.prototype)
        }
        $5b2ad9cc039efe49$var$INTRINSICS[name] = value
        return value
    }
    var $5b2ad9cc039efe49$var$LEGACY_ALIASES = {
        "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
        "%ArrayPrototype%": ["Array", "prototype"],
        "%ArrayProto_entries%": ["Array", "prototype", "entries"],
        "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
        "%ArrayProto_keys%": ["Array", "prototype", "keys"],
        "%ArrayProto_values%": ["Array", "prototype", "values"],
        "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
        "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
        "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
        "%BooleanPrototype%": ["Boolean", "prototype"],
        "%DataViewPrototype%": ["DataView", "prototype"],
        "%DatePrototype%": ["Date", "prototype"],
        "%ErrorPrototype%": ["Error", "prototype"],
        "%EvalErrorPrototype%": ["EvalError", "prototype"],
        "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
        "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
        "%FunctionPrototype%": ["Function", "prototype"],
        "%Generator%": ["GeneratorFunction", "prototype"],
        "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
        "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
        "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
        "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
        "%JSONParse%": ["JSON", "parse"],
        "%JSONStringify%": ["JSON", "stringify"],
        "%MapPrototype%": ["Map", "prototype"],
        "%NumberPrototype%": ["Number", "prototype"],
        "%ObjectPrototype%": ["Object", "prototype"],
        "%ObjProto_toString%": ["Object", "prototype", "toString"],
        "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
        "%PromisePrototype%": ["Promise", "prototype"],
        "%PromiseProto_then%": ["Promise", "prototype", "then"],
        "%Promise_all%": ["Promise", "all"],
        "%Promise_reject%": ["Promise", "reject"],
        "%Promise_resolve%": ["Promise", "resolve"],
        "%RangeErrorPrototype%": ["RangeError", "prototype"],
        "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
        "%RegExpPrototype%": ["RegExp", "prototype"],
        "%SetPrototype%": ["Set", "prototype"],
        "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
        "%StringPrototype%": ["String", "prototype"],
        "%SymbolPrototype%": ["Symbol", "prototype"],
        "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
        "%TypedArrayPrototype%": ["TypedArray", "prototype"],
        "%TypeErrorPrototype%": ["TypeError", "prototype"],
        "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
        "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
        "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
        "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
        "%URIErrorPrototype%": ["URIError", "prototype"],
        "%WeakMapPrototype%": ["WeakMap", "prototype"],
        "%WeakSetPrototype%": ["WeakSet", "prototype"],
    }

    var $5lG15 = parcelRequire("5lG15")

    var $3AxJV = parcelRequire("3AxJV")
    var $5b2ad9cc039efe49$var$$concat = $5lG15.call(Function.call, Array.prototype.concat)
    var $5b2ad9cc039efe49$var$$spliceApply = $5lG15.call(Function.apply, Array.prototype.splice)
    var $5b2ad9cc039efe49$var$$replace = $5lG15.call(Function.call, String.prototype.replace)
    var $5b2ad9cc039efe49$var$$strSlice = $5lG15.call(Function.call, String.prototype.slice)
    /* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */ var $5b2ad9cc039efe49$var$rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g
    var $5b2ad9cc039efe49$var$reEscapeChar = /\\(\\)?/g /** Used to match backslashes in property paths. */
    var $5b2ad9cc039efe49$var$stringToPath = function stringToPath(string) {
        var first = $5b2ad9cc039efe49$var$$strSlice(string, 0, 1)
        var last = $5b2ad9cc039efe49$var$$strSlice(string, -1)
        if (first === "%" && last !== "%") throw new $5b2ad9cc039efe49$var$$SyntaxError("invalid intrinsic syntax, expected closing `%`")
        else if (last === "%" && first !== "%") throw new $5b2ad9cc039efe49$var$$SyntaxError("invalid intrinsic syntax, expected opening `%`")
        var result = []
        $5b2ad9cc039efe49$var$$replace(string, $5b2ad9cc039efe49$var$rePropName, function (match, number, quote, subString) {
            result[result.length] = quote ? $5b2ad9cc039efe49$var$$replace(subString, $5b2ad9cc039efe49$var$reEscapeChar, "$1") : number || match
        })
        return result
    }
    /* end adaptation */ var $5b2ad9cc039efe49$var$getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
        var intrinsicName = name
        var alias
        if ($3AxJV($5b2ad9cc039efe49$var$LEGACY_ALIASES, intrinsicName)) {
            alias = $5b2ad9cc039efe49$var$LEGACY_ALIASES[intrinsicName]
            intrinsicName = "%" + alias[0] + "%"
        }
        if ($3AxJV($5b2ad9cc039efe49$var$INTRINSICS, intrinsicName)) {
            var value = $5b2ad9cc039efe49$var$INTRINSICS[intrinsicName]
            if (value === $5b2ad9cc039efe49$var$needsEval) value = $5b2ad9cc039efe49$var$doEval(intrinsicName)
            if (typeof value === "undefined" && !allowMissing) throw new $5b2ad9cc039efe49$var$$TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!")
            return {
                alias: alias,
                name: intrinsicName,
                value: value,
            }
        }
        throw new $5b2ad9cc039efe49$var$$SyntaxError("intrinsic " + name + " does not exist!")
    }
    module.exports = function GetIntrinsic(name, allowMissing) {
        if (typeof name !== "string" || name.length === 0) throw new $5b2ad9cc039efe49$var$$TypeError("intrinsic name must be a non-empty string")
        if (arguments.length > 1 && typeof allowMissing !== "boolean") throw new $5b2ad9cc039efe49$var$$TypeError('"allowMissing" argument must be a boolean')
        var parts = $5b2ad9cc039efe49$var$stringToPath(name)
        var intrinsicBaseName = parts.length > 0 ? parts[0] : ""
        var intrinsic = $5b2ad9cc039efe49$var$getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing)
        var intrinsicRealName = intrinsic.name
        var value = intrinsic.value
        var skipFurtherCaching = false
        var alias = intrinsic.alias
        if (alias) {
            intrinsicBaseName = alias[0]
            $5b2ad9cc039efe49$var$$spliceApply(parts, $5b2ad9cc039efe49$var$$concat([0, 1], alias))
        }
        for (var i = 1, isOwn = true; i < parts.length; i += 1) {
            var part = parts[i]
            var first = $5b2ad9cc039efe49$var$$strSlice(part, 0, 1)
            var last = $5b2ad9cc039efe49$var$$strSlice(part, -1)
            if ((first === '"' || first === "'" || first === "`" || last === '"' || last === "'" || last === "`") && first !== last) throw new $5b2ad9cc039efe49$var$$SyntaxError("property names with quotes must have matching quotes")
            if (part === "constructor" || !isOwn) skipFurtherCaching = true
            intrinsicBaseName += "." + part
            intrinsicRealName = "%" + intrinsicBaseName + "%"
            if ($3AxJV($5b2ad9cc039efe49$var$INTRINSICS, intrinsicRealName)) value = $5b2ad9cc039efe49$var$INTRINSICS[intrinsicRealName]
            else if (value != null) {
                if (!(part in value)) {
                    if (!allowMissing) throw new $5b2ad9cc039efe49$var$$TypeError("base intrinsic for " + name + " exists, but the property is not available.")
                    return void 0
                }
                if ($5b2ad9cc039efe49$var$$gOPD && i + 1 >= parts.length) {
                    var desc = $5b2ad9cc039efe49$var$$gOPD(value, part)
                    isOwn = !!desc
                    // By convention, when a data property is converted to an accessor
                    // property to emulate a data property that does not suffer from
                    // the override mistake, that accessor's getter is marked with
                    // an `originalValue` property. Here, when we detect this, we
                    // uphold the illusion by pretending to see that original data
                    // property, i.e., returning the value rather than the getter
                    // itself.
                    if (isOwn && "get" in desc && !("originalValue" in desc.get)) value = desc.get
                    else value = value[part]
                } else {
                    isOwn = $3AxJV(value, part)
                    value = value[part]
                }
                if (isOwn && !skipFurtherCaching) $5b2ad9cc039efe49$var$INTRINSICS[intrinsicRealName] = value
            }
        }
        return value
    }
})
parcelRequire.register("6oO1A", function (module, exports) {
    "use strict"
    var $4a8bc9d44c33ab7c$var$origSymbol = typeof Symbol !== "undefined" && Symbol

    var $91ncz = parcelRequire("91ncz")
    module.exports = function hasNativeSymbols() {
        if (typeof $4a8bc9d44c33ab7c$var$origSymbol !== "function") return false
        if (typeof Symbol !== "function") return false
        if (typeof $4a8bc9d44c33ab7c$var$origSymbol("foo") !== "symbol") return false
        if (typeof Symbol("bar") !== "symbol") return false
        return $91ncz()
    }
})

parcelRequire.register("5lG15", function (module, exports) {
    "use strict"

    var $1zy0V = parcelRequire("1zy0V")
    module.exports = Function.prototype.bind || $1zy0V
})
parcelRequire.register("1zy0V", function (module, exports) {
    "use strict"
    /* eslint no-invalid-this: 1 */ var $125371cc6767e2a9$var$ERROR_MESSAGE = "Function.prototype.bind called on incompatible "
    var $125371cc6767e2a9$var$slice = Array.prototype.slice
    var $125371cc6767e2a9$var$toStr = Object.prototype.toString
    var $125371cc6767e2a9$var$funcType = "[object Function]"
    module.exports = function bind(that) {
        var target = this
        if (typeof target !== "function" || $125371cc6767e2a9$var$toStr.call(target) !== $125371cc6767e2a9$var$funcType) throw new TypeError($125371cc6767e2a9$var$ERROR_MESSAGE + target)
        var args = $125371cc6767e2a9$var$slice.call(arguments, 1)
        var bound
        var binder = function () {
            if (this instanceof bound) {
                var result = target.apply(this, args.concat($125371cc6767e2a9$var$slice.call(arguments)))
                if (Object(result) === result) return result
                return this
            } else return target.apply(that, args.concat($125371cc6767e2a9$var$slice.call(arguments)))
        }
        var boundLength = Math.max(0, target.length - args.length)
        var boundArgs = []
        for (var i = 0; i < boundLength; i++) boundArgs.push("$" + i)
        bound = Function("binder", "return function (" + boundArgs.join(",") + "){ return binder.apply(this,arguments); }")(binder)
        if (target.prototype) {
            var Empty = function Empty() {}
            Empty.prototype = target.prototype
            bound.prototype = new Empty()
            Empty.prototype = null
        }
        return bound
    }
})

parcelRequire.register("3AxJV", function (module, exports) {
    "use strict"

    var $5lG15 = parcelRequire("5lG15")
    module.exports = $5lG15.call(Function.call, Object.prototype.hasOwnProperty)
})

parcelRequire.register("h7y5I", function (module, exports) {
    "use strict"

    var $5lG15 = parcelRequire("5lG15")

    var $7Phts = parcelRequire("7Phts")
    var $c76d88e3a4c44046$var$$apply = $7Phts("%Function.prototype.apply%")
    var $c76d88e3a4c44046$var$$call = $7Phts("%Function.prototype.call%")
    var $c76d88e3a4c44046$var$$reflectApply = $7Phts("%Reflect.apply%", true) || $5lG15.call($c76d88e3a4c44046$var$$call, $c76d88e3a4c44046$var$$apply)
    var $c76d88e3a4c44046$var$$gOPD = $7Phts("%Object.getOwnPropertyDescriptor%", true)
    var $c76d88e3a4c44046$var$$defineProperty = $7Phts("%Object.defineProperty%", true)
    var $c76d88e3a4c44046$var$$max = $7Phts("%Math.max%")
    if ($c76d88e3a4c44046$var$$defineProperty)
        try {
            $c76d88e3a4c44046$var$$defineProperty({}, "a", {
                value: 1,
            })
        } catch (e) {
            // IE 8 has a broken defineProperty
            $c76d88e3a4c44046$var$$defineProperty = null
        }
    module.exports = function callBind(originalFunction) {
        var func = $c76d88e3a4c44046$var$$reflectApply($5lG15, $c76d88e3a4c44046$var$$call, arguments)
        if ($c76d88e3a4c44046$var$$gOPD && $c76d88e3a4c44046$var$$defineProperty) {
            var desc = $c76d88e3a4c44046$var$$gOPD(func, "length")
            if (desc.configurable)
                // original length, plus the receiver, minus any additional arguments (after the receiver)
                $c76d88e3a4c44046$var$$defineProperty(func, "length", {
                    value: 1 + $c76d88e3a4c44046$var$$max(0, originalFunction.length - (arguments.length - 1)),
                })
        }
        return func
    }
    var $c76d88e3a4c44046$var$applyBind = function applyBind() {
        return $c76d88e3a4c44046$var$$reflectApply($5lG15, $c76d88e3a4c44046$var$$apply, arguments)
    }
    if ($c76d88e3a4c44046$var$$defineProperty)
        $c76d88e3a4c44046$var$$defineProperty(module.exports, "apply", {
            value: $c76d88e3a4c44046$var$applyBind,
        })
    else module.exports.apply = $c76d88e3a4c44046$var$applyBind
})

parcelRequire.register("7qka1", function (module, exports) {
    "use strict"
    var $567a99972d987ced$var$toStr = Object.prototype.toString
    var $567a99972d987ced$var$fnToStr = Function.prototype.toString
    var $567a99972d987ced$var$isFnRegex = /^\s*(?:function)?\*/

    var $567a99972d987ced$var$hasToStringTag = parcelRequire("9qqVB")()
    var $567a99972d987ced$var$getProto = Object.getPrototypeOf
    var $567a99972d987ced$var$getGeneratorFunc = function () {
        if (!$567a99972d987ced$var$hasToStringTag) return false
        try {
            return Function("return function*() {}")()
        } catch (e) {}
    }
    var $567a99972d987ced$var$GeneratorFunction
    module.exports = function isGeneratorFunction(fn) {
        if (typeof fn !== "function") return false
        if ($567a99972d987ced$var$isFnRegex.test($567a99972d987ced$var$fnToStr.call(fn))) return true
        if (!$567a99972d987ced$var$hasToStringTag) {
            var str = $567a99972d987ced$var$toStr.call(fn)
            return str === "[object GeneratorFunction]"
        }
        if (!$567a99972d987ced$var$getProto) return false
        if (typeof $567a99972d987ced$var$GeneratorFunction === "undefined") {
            var generatorFunc = $567a99972d987ced$var$getGeneratorFunc()
            $567a99972d987ced$var$GeneratorFunction = generatorFunc ? $567a99972d987ced$var$getProto(generatorFunc) : false
        }
        return $567a99972d987ced$var$getProto(fn) === $567a99972d987ced$var$GeneratorFunction
    }
})

parcelRequire.register("98fQt", function (module, exports) {
    "use strict"

    var $bOiNd = parcelRequire("bOiNd")

    var $aAAwU = parcelRequire("aAAwU")

    var $1laoF = parcelRequire("1laoF")
    var $6a6126fc664b6c24$var$$toString = $1laoF("Object.prototype.toString")

    var $6a6126fc664b6c24$var$hasToStringTag = parcelRequire("9qqVB")()
    var $6a6126fc664b6c24$var$g = typeof globalThis === "undefined" ? $parcel$global : globalThis
    var $6a6126fc664b6c24$var$typedArrays = $aAAwU()
    var $6a6126fc664b6c24$var$$slice = $1laoF("String.prototype.slice")
    var $6a6126fc664b6c24$var$toStrTags = {}

    var $1Bun7 = parcelRequire("1Bun7")
    var $6a6126fc664b6c24$var$getPrototypeOf = Object.getPrototypeOf // require('getprototypeof');
    if ($6a6126fc664b6c24$var$hasToStringTag && $1Bun7 && $6a6126fc664b6c24$var$getPrototypeOf)
        $bOiNd($6a6126fc664b6c24$var$typedArrays, function (typedArray) {
            if (typeof $6a6126fc664b6c24$var$g[typedArray] === "function") {
                var arr = new $6a6126fc664b6c24$var$g[typedArray]()
                if (Symbol.toStringTag in arr) {
                    var proto = $6a6126fc664b6c24$var$getPrototypeOf(arr)
                    var descriptor = $1Bun7(proto, Symbol.toStringTag)
                    if (!descriptor) {
                        var superProto = $6a6126fc664b6c24$var$getPrototypeOf(proto)
                        descriptor = $1Bun7(superProto, Symbol.toStringTag)
                    }
                    $6a6126fc664b6c24$var$toStrTags[typedArray] = descriptor.get
                }
            }
        })
    var $6a6126fc664b6c24$var$tryTypedArrays = function tryAllTypedArrays(value) {
        var foundName = false
        $bOiNd($6a6126fc664b6c24$var$toStrTags, function (getter, typedArray) {
            if (!foundName)
                try {
                    var name = getter.call(value)
                    if (name === typedArray) foundName = name
                } catch (e) {}
        })
        return foundName
    }

    var $fX2rl = parcelRequire("fX2rl")
    module.exports = function whichTypedArray(value) {
        if (!$fX2rl(value)) return false
        if (!$6a6126fc664b6c24$var$hasToStringTag || !(Symbol.toStringTag in value)) return $6a6126fc664b6c24$var$$slice($6a6126fc664b6c24$var$$toString(value), 8, -1)
        return $6a6126fc664b6c24$var$tryTypedArrays(value)
    }
})
parcelRequire.register("bOiNd", function (module, exports) {
    var $8992f1175275e4e8$var$hasOwn = Object.prototype.hasOwnProperty
    var $8992f1175275e4e8$var$toString = Object.prototype.toString
    module.exports = function forEach(obj, fn, ctx) {
        if ($8992f1175275e4e8$var$toString.call(fn) !== "[object Function]") throw new TypeError("iterator must be a function")
        var l = obj.length
        if (l === +l) for (var i = 0; i < l; i++) fn.call(ctx, obj[i], i, obj)
        else {
            for (var k in obj) if ($8992f1175275e4e8$var$hasOwn.call(obj, k)) fn.call(ctx, obj[k], k, obj)
        }
    }
})

parcelRequire.register("aAAwU", function (module, exports) {
    "use strict"
    var $7b599a3b00731191$var$possibleNames = ["BigInt64Array", "BigUint64Array", "Float32Array", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray"]
    var $7b599a3b00731191$var$g = typeof globalThis === "undefined" ? $parcel$global : globalThis
    module.exports = function availableTypedArrays() {
        var out = []
        for (var i = 0; i < $7b599a3b00731191$var$possibleNames.length; i++) if (typeof $7b599a3b00731191$var$g[$7b599a3b00731191$var$possibleNames[i]] === "function") out[out.length] = $7b599a3b00731191$var$possibleNames[i]
        return out
    }
})

parcelRequire.register("1Bun7", function (module, exports) {
    "use strict"

    var $7Phts = parcelRequire("7Phts")
    var $12b0ce5aae507341$var$$gOPD = $7Phts("%Object.getOwnPropertyDescriptor%", true)
    if ($12b0ce5aae507341$var$$gOPD)
        try {
            $12b0ce5aae507341$var$$gOPD([], "length")
        } catch (e) {
            // IE 8 has a broken gOPD
            $12b0ce5aae507341$var$$gOPD = null
        }
    module.exports = $12b0ce5aae507341$var$$gOPD
})

parcelRequire.register("fX2rl", function (module, exports) {
    "use strict"

    var $bOiNd = parcelRequire("bOiNd")

    var $aAAwU = parcelRequire("aAAwU")

    var $1laoF = parcelRequire("1laoF")
    var $b9ce42417f8a82ad$var$$toString = $1laoF("Object.prototype.toString")

    var $b9ce42417f8a82ad$var$hasToStringTag = parcelRequire("9qqVB")()
    var $b9ce42417f8a82ad$var$g = typeof globalThis === "undefined" ? $parcel$global : globalThis
    var $b9ce42417f8a82ad$var$typedArrays = $aAAwU()
    var $b9ce42417f8a82ad$var$$indexOf =
        $1laoF("Array.prototype.indexOf", true) ||
        function indexOf(array, value) {
            for (var i = 0; i < array.length; i += 1) {
                if (array[i] === value) return i
            }
            return -1
        }
    var $b9ce42417f8a82ad$var$$slice = $1laoF("String.prototype.slice")
    var $b9ce42417f8a82ad$var$toStrTags = {}

    var $1Bun7 = parcelRequire("1Bun7")
    var $b9ce42417f8a82ad$var$getPrototypeOf = Object.getPrototypeOf // require('getprototypeof');
    if ($b9ce42417f8a82ad$var$hasToStringTag && $1Bun7 && $b9ce42417f8a82ad$var$getPrototypeOf)
        $bOiNd($b9ce42417f8a82ad$var$typedArrays, function (typedArray) {
            var arr = new $b9ce42417f8a82ad$var$g[typedArray]()
            if (Symbol.toStringTag in arr) {
                var proto = $b9ce42417f8a82ad$var$getPrototypeOf(arr)
                var descriptor = $1Bun7(proto, Symbol.toStringTag)
                if (!descriptor) {
                    var superProto = $b9ce42417f8a82ad$var$getPrototypeOf(proto)
                    descriptor = $1Bun7(superProto, Symbol.toStringTag)
                }
                $b9ce42417f8a82ad$var$toStrTags[typedArray] = descriptor.get
            }
        })
    var $b9ce42417f8a82ad$var$tryTypedArrays = function tryAllTypedArrays(value) {
        var anyTrue = false
        $bOiNd($b9ce42417f8a82ad$var$toStrTags, function (getter, typedArray) {
            if (!anyTrue)
                try {
                    anyTrue = getter.call(value) === typedArray
                } catch (e) {}
        })
        return anyTrue
    }
    module.exports = function isTypedArray(value) {
        if (!value || typeof value !== "object") return false
        if (!$b9ce42417f8a82ad$var$hasToStringTag || !(Symbol.toStringTag in value)) {
            var tag = $b9ce42417f8a82ad$var$$slice($b9ce42417f8a82ad$var$$toString(value), 8, -1)
            return $b9ce42417f8a82ad$var$$indexOf($b9ce42417f8a82ad$var$typedArrays, tag) > -1
        }
        if (!$1Bun7) return false
        return $b9ce42417f8a82ad$var$tryTypedArrays(value)
    }
})

parcelRequire.register("2AavK", function (module, exports) {
    module.exports = function isBuffer(arg) {
        return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function"
    }
})

parcelRequire.register("fbl8R", function (module, exports) {
    if (typeof Object.create === "function")
        // implementation from standard node.js 'util' module
        module.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
                ctor.super_ = superCtor
                ctor.prototype = Object.create(superCtor.prototype, {
                    constructor: {
                        value: ctor,
                        enumerable: false,
                        writable: true,
                        configurable: true,
                    },
                })
            }
        }
    // old school shim for old browsers
    else
        module.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
                ctor.super_ = superCtor
                var TempCtor = function () {}
                TempCtor.prototype = superCtor.prototype
                ctor.prototype = new TempCtor()
                ctor.prototype.constructor = ctor
            }
        }
})

var $00f152d068d6e592$exports = {}
const $574bd3723ae64ae2$var$ANSI_BACKGROUND_OFFSET = 10
const $574bd3723ae64ae2$var$wrapAnsi16 =
    (offset = 0) =>
    (code) =>
        `\u001B[${code + offset}m`
const $574bd3723ae64ae2$var$wrapAnsi256 =
    (offset = 0) =>
    (code) =>
        `\u001B[${38 + offset};5;${code}m`
const $574bd3723ae64ae2$var$wrapAnsi16m =
    (offset = 0) =>
    (red, green, blue) =>
        `\u001B[${38 + offset};2;${red};${green};${blue}m`
function $574bd3723ae64ae2$var$assembleStyles() {
    const codes = new Map()
    const styles = {
        modifier: {
            reset: [0, 0],
            // 21 isn't widely supported and 22 does the same thing
            bold: [1, 22],
            dim: [2, 22],
            italic: [3, 23],
            underline: [4, 24],
            overline: [53, 55],
            inverse: [7, 27],
            hidden: [8, 28],
            strikethrough: [9, 29],
        },
        color: {
            black: [30, 39],
            red: [31, 39],
            green: [32, 39],
            yellow: [33, 39],
            blue: [34, 39],
            magenta: [35, 39],
            cyan: [36, 39],
            white: [37, 39],
            // Bright color
            blackBright: [90, 39],
            redBright: [91, 39],
            greenBright: [92, 39],
            yellowBright: [93, 39],
            blueBright: [94, 39],
            magentaBright: [95, 39],
            cyanBright: [96, 39],
            whiteBright: [97, 39],
        },
        bgColor: {
            bgBlack: [40, 49],
            bgRed: [41, 49],
            bgGreen: [42, 49],
            bgYellow: [43, 49],
            bgBlue: [44, 49],
            bgMagenta: [45, 49],
            bgCyan: [46, 49],
            bgWhite: [47, 49],
            // Bright color
            bgBlackBright: [100, 49],
            bgRedBright: [101, 49],
            bgGreenBright: [102, 49],
            bgYellowBright: [103, 49],
            bgBlueBright: [104, 49],
            bgMagentaBright: [105, 49],
            bgCyanBright: [106, 49],
            bgWhiteBright: [107, 49],
        },
    }
    // Alias bright black as gray (and grey)
    styles.color.gray = styles.color.blackBright
    styles.bgColor.bgGray = styles.bgColor.bgBlackBright
    styles.color.grey = styles.color.blackBright
    styles.bgColor.bgGrey = styles.bgColor.bgBlackBright
    for (const [groupName, group] of Object.entries(styles)) {
        for (const [styleName, style] of Object.entries(group)) {
            styles[styleName] = {
                open: `\u001B[${style[0]}m`,
                close: `\u001B[${style[1]}m`,
            }
            group[styleName] = styles[styleName]
            codes.set(style[0], style[1])
        }
        Object.defineProperty(styles, groupName, {
            value: group,
            enumerable: false,
        })
    }
    Object.defineProperty(styles, "codes", {
        value: codes,
        enumerable: false,
    })
    styles.color.close = "\u001B[39m"
    styles.bgColor.close = "\u001B[49m"
    styles.color.ansi = $574bd3723ae64ae2$var$wrapAnsi16()
    styles.color.ansi256 = $574bd3723ae64ae2$var$wrapAnsi256()
    styles.color.ansi16m = $574bd3723ae64ae2$var$wrapAnsi16m()
    styles.bgColor.ansi = $574bd3723ae64ae2$var$wrapAnsi16($574bd3723ae64ae2$var$ANSI_BACKGROUND_OFFSET)
    styles.bgColor.ansi256 = $574bd3723ae64ae2$var$wrapAnsi256($574bd3723ae64ae2$var$ANSI_BACKGROUND_OFFSET)
    styles.bgColor.ansi16m = $574bd3723ae64ae2$var$wrapAnsi16m($574bd3723ae64ae2$var$ANSI_BACKGROUND_OFFSET)
    // From https://github.com/Qix-/color-convert/blob/3f0e0d4e92e235796ccb17f6e85c72094a651f49/conversions.js
    Object.defineProperties(styles, {
        rgbToAnsi256: {
            value: (red, green, blue) => {
                // We use the extended greyscale palette here, with the exception of
                // black and white. normal palette only has 4 greyscale shades.
                if (red === green && green === blue) {
                    if (red < 8) return 16
                    if (red > 248) return 231
                    return Math.round(((red - 8) / 247) * 24) + 232
                }
                return 16 + 36 * Math.round((red / 255) * 5) + 6 * Math.round((green / 255) * 5) + Math.round((blue / 255) * 5)
            },
            enumerable: false,
        },
        hexToRgb: {
            value: (hex) => {
                const matches = /(?<colorString>[a-f\d]{6}|[a-f\d]{3})/i.exec(hex.toString(16))
                if (!matches) return [0, 0, 0]
                let { colorString: colorString } = matches.groups
                if (colorString.length === 3)
                    colorString = colorString
                        .split("")
                        .map((character) => character + character)
                        .join("")
                const integer = Number.parseInt(colorString, 16)
                return [(integer >> 16) & 255, (integer >> 8) & 255, integer & 255]
            },
            enumerable: false,
        },
        hexToAnsi256: {
            value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
            enumerable: false,
        },
        ansi256ToAnsi: {
            value: (code) => {
                if (code < 8) return 30 + code
                if (code < 16) return 90 + (code - 8)
                let red
                let green
                let blue
                if (code >= 232) {
                    red = ((code - 232) * 10 + 8) / 255
                    green = red
                    blue = red
                } else {
                    code -= 16
                    const remainder = code % 36
                    red = Math.floor(code / 36) / 5
                    green = Math.floor(remainder / 6) / 5
                    blue = (remainder % 6) / 5
                }
                const value = Math.max(red, green, blue) * 2
                if (value === 0) return 30
                let result = 30 + ((Math.round(blue) << 2) | (Math.round(green) << 1) | Math.round(red))
                if (value === 2) result += 60
                return result
            },
            enumerable: false,
        },
        rgbToAnsi: {
            value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
            enumerable: false,
        },
        hexToAnsi: {
            value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
            enumerable: false,
        },
    })
    return styles
}
const $574bd3723ae64ae2$var$ansiStyles = $574bd3723ae64ae2$var$assembleStyles()
var $574bd3723ae64ae2$export$2e2bcd8739ae039 = $574bd3723ae64ae2$var$ansiStyles

let $dde5ca882b3d480f$var$args = []

try {
    $dde5ca882b3d480f$var$args = Deno.args
} catch (error) {
    try {
        const [_1, _2, ...argvs] = parcelRequire("9nb1c").argv
        $dde5ca882b3d480f$var$args = argvs
    } catch (error) {}
}
function $dde5ca882b3d480f$export$2e2bcd8739ae039(flag, argv = $dde5ca882b3d480f$var$args) {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--"
    const position = argv.indexOf(prefix + flag)
    const terminatorPosition = argv.indexOf("--")
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition)
}

function $d20d3b7af9313bfd$var$isatty(fd) {
    if (typeof fd !== "number") return false
    try {
        return Deno.isatty(fd)
    } catch (_) {
        // if deno failed, try node
        try {
            var tty = parcelRequire("9u0DI")
            return tty.isatty(fd)
        } catch (error) {}
        return false
    }
}
let $d20d3b7af9313bfd$var$env = {}

try {
    $d20d3b7af9313bfd$var$env = Deno.env.toObject()
} catch (error) {
    try {
        $d20d3b7af9313bfd$var$env = parcelRequire("9nb1c").env
    } catch (error) {}
}
let $d20d3b7af9313bfd$var$flagForceColor
if ($dde5ca882b3d480f$export$2e2bcd8739ae039("no-color") || $dde5ca882b3d480f$export$2e2bcd8739ae039("no-colors") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=false") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=never")) $d20d3b7af9313bfd$var$flagForceColor = 0
else if ($dde5ca882b3d480f$export$2e2bcd8739ae039("color") || $dde5ca882b3d480f$export$2e2bcd8739ae039("colors") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=true") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=always")) $d20d3b7af9313bfd$var$flagForceColor = 1
function $d20d3b7af9313bfd$var$envForceColor() {
    if ("FORCE_COLOR" in $d20d3b7af9313bfd$var$env) {
        if ($d20d3b7af9313bfd$var$env.FORCE_COLOR === "true") return 1
        if ($d20d3b7af9313bfd$var$env.FORCE_COLOR === "false") return 0
        return $d20d3b7af9313bfd$var$env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt($d20d3b7af9313bfd$var$env.FORCE_COLOR, 10), 3)
    }
}
function $d20d3b7af9313bfd$var$translateLevel(level) {
    if (level === 0) return false
    return {
        level: level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3,
    }
}

function $d20d3b7af9313bfd$var$_supportsColor(haveStream, { streamIsTTY: streamIsTTY, sniffFlags: sniffFlags = true } = {}) {
    const noFlagForceColor = $d20d3b7af9313bfd$var$envForceColor()
    if (noFlagForceColor !== undefined) $d20d3b7af9313bfd$var$flagForceColor = noFlagForceColor
    const forceColor = sniffFlags ? $d20d3b7af9313bfd$var$flagForceColor : noFlagForceColor
    if (forceColor === 0) return 0
    if (sniffFlags) {
        if ($dde5ca882b3d480f$export$2e2bcd8739ae039("color=16m") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=full") || $dde5ca882b3d480f$export$2e2bcd8739ae039("color=truecolor")) return 3
        if ($dde5ca882b3d480f$export$2e2bcd8739ae039("color=256")) return 2
    }
    if (haveStream && !streamIsTTY && forceColor === undefined) return 0
    const min = forceColor || 0
    if ($d20d3b7af9313bfd$var$env.TERM === "dumb") return min
    let os
    try {
        os = Deno.build.os
    } catch (error) {
        try {
            os = parcelRequire("9nb1c").platform
        } catch (error) {}
    }
    if (os === "win32")
        // TODO could not find how to get the OS release in Deno, the `Deno.osRelease()` (found in std/node/os) does not seem to work
        // // Windows 10 build 10586 is the first Windows release that supports 256 colors.
        // // Windows 10 build 14931 is the first release that supports 16m/TrueColor.
        // const osRelease = os.release().split('.')
        // if (
        // 	Number(osRelease[0]) >= 10 &&
        // 	Number(osRelease[2]) >= 10586
        // ) {
        // 	return Number(osRelease[2]) >= 14931 ? 3 : 2
        // }
        return 1
    if ("CI" in $d20d3b7af9313bfd$var$env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some((sign) => sign in $d20d3b7af9313bfd$var$env) || $d20d3b7af9313bfd$var$env.CI_NAME === "codeship") return 1
        return min
    }
    if ("TEAMCITY_VERSION" in $d20d3b7af9313bfd$var$env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test($d20d3b7af9313bfd$var$env.TEAMCITY_VERSION) ? 1 : 0
    if ($d20d3b7af9313bfd$var$env.COLORTERM === "truecolor") return 3
    if ("TERM_PROGRAM" in $d20d3b7af9313bfd$var$env) {
        const version = Number.parseInt(($d20d3b7af9313bfd$var$env.TERM_PROGRAM_VERSION || "").split(".")[0], 10)
        switch ($d20d3b7af9313bfd$var$env.TERM_PROGRAM) {
            case "iTerm.app":
                return version >= 3 ? 3 : 2
            case "Apple_Terminal":
                return 2
        }
    }
    if (/-256(color)?$/i.test($d20d3b7af9313bfd$var$env.TERM)) return 2
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test($d20d3b7af9313bfd$var$env.TERM)) return 1
    if ("COLORTERM" in $d20d3b7af9313bfd$var$env) return 1
    return min
}
function $d20d3b7af9313bfd$export$6f279ba00f1459de(stream, options = {}) {
    const level = $d20d3b7af9313bfd$var$_supportsColor(stream, {
        streamIsTTY: stream && stream.isTTY,
        ...options,
    })
    return $d20d3b7af9313bfd$var$translateLevel(level)
}
const $d20d3b7af9313bfd$var$supportsColor = {
    stdout: $d20d3b7af9313bfd$export$6f279ba00f1459de({
        isTTY: $d20d3b7af9313bfd$var$isatty(1),
    }),
    stderr: $d20d3b7af9313bfd$export$6f279ba00f1459de({
        isTTY: $d20d3b7af9313bfd$var$isatty(2),
    }),
}
var $d20d3b7af9313bfd$export$2e2bcd8739ae039 = $d20d3b7af9313bfd$var$supportsColor

function $4045b2b0c9c615ca$export$9300dfb554c6c407(string, substring, replacer) {
    let index = string.indexOf(substring)
    if (index === -1) return string
    const substringLength = substring.length
    let endIndex = 0
    let returnValue = ""
    do {
        returnValue += string.substr(endIndex, index - endIndex) + substring + replacer
        endIndex = index + substringLength
        index = string.indexOf(substring, endIndex)
    } while (index !== -1)
    returnValue += string.slice(endIndex)
    return returnValue
}
function $4045b2b0c9c615ca$export$ecabf4aff2e9764(string, prefix, postfix, index) {
    let endIndex = 0
    let returnValue = ""
    do {
        const gotCR = string[index - 1] === "\r"
        returnValue += string.substr(endIndex, (gotCR ? index - 1 : index) - endIndex) + prefix + (gotCR ? "\r\n" : "\n") + postfix
        endIndex = index + 1
        index = string.indexOf("\n", endIndex)
    } while (index !== -1)
    returnValue += string.slice(endIndex)
    return returnValue
}

const $3b2637e3c7885cbd$var$TEMPLATE_REGEX = /(?:\\(u(?:[a-f\d]{4}|\{[a-f\d]{1,6}\})|x[a-f\d]{2}|.))|(?:\{(~)?(\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)(?:[ \t]|(?=\r?\n)))|(\})|((?:.|[\r\n\f])+?)/gi
const $3b2637e3c7885cbd$var$STYLE_REGEX = /(?:^|\.)(\w+)(?:\(([^)]*)\))?/g
const $3b2637e3c7885cbd$var$STRING_REGEX = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/
const $3b2637e3c7885cbd$var$ESCAPE_REGEX = /\\(u(?:[a-f\d]{4}|{[a-f\d]{1,6}})|x[a-f\d]{2}|.)|([^\\])/gi
const $3b2637e3c7885cbd$var$ESCAPES = new Map([
    ["n", "\n"],
    ["r", "\r"],
    ["t", "\t"],
    ["b", "\b"],
    ["f", "\f"],
    ["v", "\v"],
    ["0", "\0"],
    ["\\", "\\"],
    ["e", "\u001B"],
    ["a", "\u0007"],
])
function $3b2637e3c7885cbd$var$unescape(c) {
    const u = c[0] === "u"
    const bracket = c[1] === "{"
    if ((u && !bracket && c.length === 5) || (c[0] === "x" && c.length === 3)) return String.fromCharCode(Number.parseInt(c.slice(1), 16))
    if (u && bracket) return String.fromCodePoint(Number.parseInt(c.slice(2, -1), 16))
    return $3b2637e3c7885cbd$var$ESCAPES.get(c) || c
}
function $3b2637e3c7885cbd$var$parseArguments(name, arguments_) {
    const results = []
    const chunks = arguments_.trim().split(/\s*,\s*/g)
    let matches
    for (const chunk of chunks) {
        const number = Number(chunk)
        if (!Number.isNaN(number)) results.push(number)
        else if ((matches = chunk.match($3b2637e3c7885cbd$var$STRING_REGEX))) results.push(matches[2].replace($3b2637e3c7885cbd$var$ESCAPE_REGEX, (m, escape, character) => (escape ? $3b2637e3c7885cbd$var$unescape(escape) : character)))
        else throw new Error(`Invalid Chalk template style argument: ${chunk} (in style '${name}')`)
    }
    return results
}
function $3b2637e3c7885cbd$var$parseStyle(style) {
    $3b2637e3c7885cbd$var$STYLE_REGEX.lastIndex = 0
    const results = []
    let matches
    while ((matches = $3b2637e3c7885cbd$var$STYLE_REGEX.exec(style)) !== null) {
        const name = matches[1]
        if (matches[2]) {
            const args = $3b2637e3c7885cbd$var$parseArguments(name, matches[2])
            results.push([name, ...args])
        } else results.push([name])
    }
    return results
}
function $3b2637e3c7885cbd$var$buildStyle(chalk, styles) {
    const enabled = {}
    for (const layer of styles) for (const style of layer.styles) enabled[style[0]] = layer.inverse ? null : style.slice(1)
    let current = chalk
    for (const [styleName, styles1] of Object.entries(enabled)) {
        if (!Array.isArray(styles1)) continue
        if (!(styleName in current)) throw new Error(`Unknown Chalk style: ${styleName}`)
        current = styles1.length > 0 ? current[styleName](...styles1) : current[styleName]
    }
    return current
}
function $3b2637e3c7885cbd$export$2e2bcd8739ae039(chalk, temporary) {
    const styles = []
    const chunks = []
    let chunk = []
    // eslint-disable-next-line max-params
    temporary.replace($3b2637e3c7885cbd$var$TEMPLATE_REGEX, (m, escapeCharacter, inverse, style, close, character) => {
        if (escapeCharacter) chunk.push($3b2637e3c7885cbd$var$unescape(escapeCharacter))
        else if (style) {
            const string = chunk.join("")
            chunk = []
            chunks.push(styles.length === 0 ? string : $3b2637e3c7885cbd$var$buildStyle(chalk, styles)(string))
            styles.push({
                inverse: inverse,
                styles: $3b2637e3c7885cbd$var$parseStyle(style),
            })
        } else if (close) {
            if (styles.length === 0) throw new Error("Found extraneous } in Chalk template literal")
            chunks.push($3b2637e3c7885cbd$var$buildStyle(chalk, styles)(chunk.join("")))
            chunk = []
            styles.pop()
        } else chunk.push(character)
    })
    chunks.push(chunk.join(""))
    if (styles.length > 0) {
        const errorMessage = `Chalk template literal is missing ${styles.length} closing bracket${styles.length === 1 ? "" : "s"} (\`}\`)`
        throw new Error(errorMessage)
    }
    return chunks.join("")
}

const { stdout: $7de8a094d06a5fd0$export$fcbe44f5d6fcebd, stderr: $7de8a094d06a5fd0$export$8107055a758cd2bd } = $d20d3b7af9313bfd$export$2e2bcd8739ae039
const { isArray: $7de8a094d06a5fd0$var$isArray } = Array
const $7de8a094d06a5fd0$var$GENERATOR = Symbol("GENERATOR")
const $7de8a094d06a5fd0$var$STYLER = Symbol("STYLER")
const $7de8a094d06a5fd0$var$IS_EMPTY = Symbol("IS_EMPTY")
// `supportsColor.level` → `ansiStyles.color[name]` mapping
const $7de8a094d06a5fd0$var$levelMapping = ["ansi", "ansi", "ansi256", "ansi16m"]
const $7de8a094d06a5fd0$var$styles = Object.create(null)
const $7de8a094d06a5fd0$var$applyOptions = (object, options = {}) => {
    if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) throw new Error("The `level` option should be an integer from 0 to 3")
    // Detect level if not set manually
    const colorLevel = $7de8a094d06a5fd0$export$fcbe44f5d6fcebd ? $7de8a094d06a5fd0$export$fcbe44f5d6fcebd.level : 0
    object.level = options.level === undefined ? colorLevel : options.level
}
class $7de8a094d06a5fd0$export$79544b80b91c2197 {
    constructor(options) {
        // eslint-disable-next-line no-constructor-return
        return $7de8a094d06a5fd0$var$chalkFactory(options)
    }
}
const $7de8a094d06a5fd0$var$chalkFactory = (options) => {
    const chalk = {}
    $7de8a094d06a5fd0$var$applyOptions(chalk, options)
    chalk.template = (...arguments_) => $7de8a094d06a5fd0$var$chalkTag(chalk.template, ...arguments_)
    Object.setPrototypeOf(chalk, $7de8a094d06a5fd0$var$createChalk.prototype)
    Object.setPrototypeOf(chalk.template, chalk)
    chalk.template.Chalk = $7de8a094d06a5fd0$export$79544b80b91c2197
    return chalk.template
}
function $7de8a094d06a5fd0$var$createChalk(options) {
    return $7de8a094d06a5fd0$var$chalkFactory(options)
}
Object.setPrototypeOf($7de8a094d06a5fd0$var$createChalk.prototype, Function.prototype)
for (const [styleName, style] of Object.entries($574bd3723ae64ae2$export$2e2bcd8739ae039))
    $7de8a094d06a5fd0$var$styles[styleName] = {
        get() {
            const builder = $7de8a094d06a5fd0$var$createBuilder(this, $7de8a094d06a5fd0$var$createStyler(style.open, style.close, this[$7de8a094d06a5fd0$var$STYLER]), this[$7de8a094d06a5fd0$var$IS_EMPTY])
            Object.defineProperty(this, styleName, {
                value: builder,
            })
            return builder
        },
    }
$7de8a094d06a5fd0$var$styles.visible = {
    get() {
        const builder = $7de8a094d06a5fd0$var$createBuilder(this, this[$7de8a094d06a5fd0$var$STYLER], true)
        Object.defineProperty(this, "visible", {
            value: builder,
        })
        return builder
    },
}
const $7de8a094d06a5fd0$var$getModelAnsi = (model1, level, type, ...arguments_) => {
    if (model1 === "rgb") {
        if (level === "ansi16m") return $574bd3723ae64ae2$export$2e2bcd8739ae039[type].ansi16m(...arguments_)
        if (level === "ansi256") return $574bd3723ae64ae2$export$2e2bcd8739ae039[type].ansi256($574bd3723ae64ae2$export$2e2bcd8739ae039.rgbToAnsi256(...arguments_))
        return $574bd3723ae64ae2$export$2e2bcd8739ae039[type].ansi($574bd3723ae64ae2$export$2e2bcd8739ae039.rgbToAnsi(...arguments_))
    }
    if (model1 === "hex") return $7de8a094d06a5fd0$var$getModelAnsi("rgb", level, type, ...$574bd3723ae64ae2$export$2e2bcd8739ae039.hexToRgb(...arguments_))
    return $574bd3723ae64ae2$export$2e2bcd8739ae039[type][model1](...arguments_)
}
const $7de8a094d06a5fd0$var$usedModels = ["rgb", "hex", "ansi256"]
for (const model of $7de8a094d06a5fd0$var$usedModels) {
    $7de8a094d06a5fd0$var$styles[model] = {
        get() {
            const { level: level } = this
            return function (...arguments_) {
                const styler = $7de8a094d06a5fd0$var$createStyler($7de8a094d06a5fd0$var$getModelAnsi(model, $7de8a094d06a5fd0$var$levelMapping[level], "color", ...arguments_), $574bd3723ae64ae2$export$2e2bcd8739ae039.color.close, this[$7de8a094d06a5fd0$var$STYLER])
                return $7de8a094d06a5fd0$var$createBuilder(this, styler, this[$7de8a094d06a5fd0$var$IS_EMPTY])
            }
        },
    }
    const bgModel = "bg" + model[0].toUpperCase() + model.slice(1)
    $7de8a094d06a5fd0$var$styles[bgModel] = {
        get() {
            const { level: level } = this
            return function (...arguments_) {
                const styler = $7de8a094d06a5fd0$var$createStyler($7de8a094d06a5fd0$var$getModelAnsi(model, $7de8a094d06a5fd0$var$levelMapping[level], "bgColor", ...arguments_), $574bd3723ae64ae2$export$2e2bcd8739ae039.bgColor.close, this[$7de8a094d06a5fd0$var$STYLER])
                return $7de8a094d06a5fd0$var$createBuilder(this, styler, this[$7de8a094d06a5fd0$var$IS_EMPTY])
            }
        },
    }
}
const $7de8a094d06a5fd0$var$proto = Object.defineProperties(() => {}, {
    ...$7de8a094d06a5fd0$var$styles,
    level: {
        enumerable: true,
        get() {
            return this[$7de8a094d06a5fd0$var$GENERATOR].level
        },
        set(level) {
            this[$7de8a094d06a5fd0$var$GENERATOR].level = level
        },
    },
})
const $7de8a094d06a5fd0$var$createStyler = (open, close, parent) => {
    let openAll
    let closeAll
    if (parent === undefined) {
        openAll = open
        closeAll = close
    } else {
        openAll = parent.openAll + open
        closeAll = close + parent.closeAll
    }
    return {
        open: open,
        close: close,
        openAll: openAll,
        closeAll: closeAll,
        parent: parent,
    }
}
const $7de8a094d06a5fd0$var$createBuilder = (self, _styler, _isEmpty) => {
    const builder = (...arguments_) => {
        if ($7de8a094d06a5fd0$var$isArray(arguments_[0]) && $7de8a094d06a5fd0$var$isArray(arguments_[0].raw))
            // Called as a template literal, for example: chalk.red`2 + 3 = {bold ${2+3}}`
            return $7de8a094d06a5fd0$var$applyStyle(builder, $7de8a094d06a5fd0$var$chalkTag(builder, ...arguments_))
        // Single argument is hot path, implicit coercion is faster than anything
        // eslint-disable-next-line no-implicit-coercion
        return $7de8a094d06a5fd0$var$applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "))
    }
    // We alter the prototype because we must return a function, but there is
    // no way to create a function with a different prototype
    Object.setPrototypeOf(builder, $7de8a094d06a5fd0$var$proto)
    builder[$7de8a094d06a5fd0$var$GENERATOR] = self
    builder[$7de8a094d06a5fd0$var$STYLER] = _styler
    builder[$7de8a094d06a5fd0$var$IS_EMPTY] = _isEmpty
    return builder
}
const $7de8a094d06a5fd0$var$applyStyle = (self, string) => {
    if (self.level <= 0 || !string) return self[$7de8a094d06a5fd0$var$IS_EMPTY] ? "" : string
    let styler = self[$7de8a094d06a5fd0$var$STYLER]
    if (styler === undefined) return string
    const { openAll: openAll, closeAll: closeAll } = styler
    if (string.includes("\u001B"))
        while (styler !== undefined) {
            // Replace any instances already present with a re-opening code
            // otherwise only the part of the string until said closing code
            // will be colored, and the rest will simply be 'plain'.
            string = $4045b2b0c9c615ca$export$9300dfb554c6c407(string, styler.close, styler.open)
            styler = styler.parent
        }
    // We can move both next actions out of loop, because remaining actions in loop won't have
    // any/visible effect on parts we add here. Close the styling before a linebreak and reopen
    // after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
    const lfIndex = string.indexOf("\n")
    if (lfIndex !== -1) string = $4045b2b0c9c615ca$export$ecabf4aff2e9764(string, closeAll, openAll, lfIndex)
    return openAll + string + closeAll
}
const $7de8a094d06a5fd0$var$chalkTag = (chalk, ...strings) => {
    const [firstString] = strings
    if (!$7de8a094d06a5fd0$var$isArray(firstString) || !$7de8a094d06a5fd0$var$isArray(firstString.raw))
        // If chalk() was called by itself or with a string,
        // return the string itself as a string.
        return strings.join(" ")
    const arguments_ = strings.slice(1)
    const parts = [firstString.raw[0]]
    for (let i = 1; i < firstString.length; i++) parts.push(String(arguments_[i - 1]).replace(/[{}\\]/g, "\\$&"), String(firstString.raw[i]))
    return $3b2637e3c7885cbd$export$2e2bcd8739ae039(chalk, parts.join(""))
}
Object.defineProperties($7de8a094d06a5fd0$var$createChalk.prototype, $7de8a094d06a5fd0$var$styles)
const $7de8a094d06a5fd0$var$chalk = $7de8a094d06a5fd0$var$createChalk()
const $7de8a094d06a5fd0$export$8cef8185e551afa5 = $7de8a094d06a5fd0$var$createChalk({
    level: $7de8a094d06a5fd0$export$8107055a758cd2bd ? $7de8a094d06a5fd0$export$8107055a758cd2bd.level : 0,
})
var $7de8a094d06a5fd0$export$2e2bcd8739ae039 = $7de8a094d06a5fd0$var$chalk

export var chalk = $7de8a094d06a5fd0$export$2e2bcd8739ae039