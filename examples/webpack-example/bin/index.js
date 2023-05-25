#! /usr/bin/env node

const fs = require("fs")
const { spawn } = require("child_process")

const folder = process.argv.slice(1, 3)[1] || "."

if(!fs.existsSync(folder))
    fs.mkdirSync(folder)

spawn("git", ["clone", "https://github.com/kinuris/typescript-wasm-app", folder])
    .on("close", output => {
        if (output === 0)
            console.log("Template cloning successful")
        else 
            console.error("Template cloning failed")
    })


