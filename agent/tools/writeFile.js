const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'writeFile',
            description: 'write the given content to the file at the given path',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to read'
                    },
                    content: {
                        type: 'string',
                        description: 'The content to write'
                    }
                },
                required: ['path', 'content']
            }
        },
    },
    function: async ({ path }) => {
        try {
            const ret = await readFileAsync(path, { encoding: 'utf8' });
            return ret;
        } catch (err) {
            return `Error reading ${path}: ${err.message}`
        }
    }
}