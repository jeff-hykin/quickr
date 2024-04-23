import { normalize } from "https://deno.land/std@0.128.0/path/mod.ts"
import { pathStandardize } from "./_path_standardize.js"

export const normalizePath = (path)=>normalize(pathStandardize(path)).replace(/\/$/,"")