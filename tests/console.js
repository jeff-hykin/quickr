#!/usr/bin/env -S deno run --allow-all
const { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } = await import("../main/console.js")

Console.env.THING = "true"
// Console.env.NO_COLOR = ""

Console.log(red`Howdy!`)
Console.log(`Howdy! ${red`im red`} ${Console.env.THING} ${undefined} ${null} ${blue`im blue`} im not`)