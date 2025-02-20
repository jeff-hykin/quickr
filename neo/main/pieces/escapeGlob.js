import { build } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
import { escapeGlobForPosix } from "./escapeGlobForPosix.js"
import { escapeGlobForWindows } from "./escapeGlobForWindows.js"

export const escapeGlob = build.os == "windows" ? escapeGlobForWindows : escapeGlobForPosix