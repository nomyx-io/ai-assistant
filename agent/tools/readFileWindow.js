const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'readFileWindow',
            description: 'read a window of content of the file at the given path starting at the given offset and ending at the given length',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to read'
                    },
                    offset: {
                        type: 'integer',
                        description: 'The offset to start reading at'
                    },
                    length: {
                        type: 'integer',
                        description: 'The length to read'
                    }
                },
                required: ['path', 'offset', 'length']
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