#!/usr/bin/env -S deno run --allow-all
const { OperatingSystem : OS } = await import(`../main/operating_system.js`)

console.log(OS)