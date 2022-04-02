#!/usr/bin/env -S deno run --allow-all
const { Console, red } = await import(`../main/console.js`)

Console.env.THING = "true"

Console.log(red`Howdy!`)