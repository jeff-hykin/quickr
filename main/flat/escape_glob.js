import { build } from "https://deno.land/x/deno_deno@1.42.1.7/main.js"
import { escapeGlobForPosix } from "./escape_glob_for_posix.js"
import { escapeGlobForWindows } from "./escape_glob_for_windows.js"

export const escapeGlob = build.os == "windows" ? escapeGlobForWindows : escapeGlobForPosix