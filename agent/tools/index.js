const fs = require('fs');
const path = require('path');

const curFolder = path.join(__dirname, '.');

// read all the files in the current folder
const files = fs.readdirSync(curFolder);

// remove files not ending with js and index.js
const jsFiles = files.filter(f => f.endsWith('.js') || f.startsWith('index'));

const schemas = []
const funcs = {}
const tools = []

for(const jsFile of jsFiles) {
    const jsFilePath = path.join(curFolder, jsFile);
    const jsFileContent = require(jsFilePath);
    tools.push(jsFileContent);
    const schema = jsFileContent.schema;
    const func = jsFileContent.function;
    if(schema) {
        schemas.push(schema);
    }
    if(func) {
        funcs[schema.function.name] = func;
    }
}

module.exports = {
    schemas,
    funcs,
    tools
}