const vscode = require('vscode');
const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'readFile',
            description: 'read the content of the file at the given path',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to read'
                    }
                },
                required: ['path']
            }
        },
    },
    function: async ({ path }) => {
        try {
            const content = await readFileAsync(path, { encoding: 'utf8' });
            return content
        } catch (err) {
            return `Error reading ${path}: ${err.message}`
        }
    }
};

