const fs = require('fs')
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

(async () => {
    const inputFilePath = path.join(__dirname, '/public/disable-ads-script.source.js')
    const outputFilePath = path.join(__dirname, '/public/disable-ads-script.js')

    const inputFileData = await fs.promises.readFile(inputFilePath, { encoding: 'utf8' })

    const result = JavaScriptObfuscator.obfuscate(inputFileData, {
        compact: false,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: false,
        shuffleStringArray: true,
        splitStrings: true,
        stringArrayThreshold: 1,
        log: true,
        disableConsoleOutput: false,
        target: 'browser',
        optionsPreset: 'medium-obfuscation'
    })

    await fs.promises.writeFile(outputFilePath, result.getObfuscatedCode(), { encoding: 'utf8' })
})()