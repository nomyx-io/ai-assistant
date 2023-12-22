const fs = require('fs');
const path = require('path');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'writeFileWindow',
            description: 'write a window of content to the file at the given path starting at the given offset',
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
                    },
                    offset: {
                        type: 'integer',
                        description: 'The offset to start writing at'
                    },
                    length: {
                        type: 'integer',
                        description: 'The length to write'
                    }
                },
                required: ['path', 'content', 'offset', 'length']
            }
        },
    },
    function: async ({ path, content, offset, length }) => {
        try {
            const pathContent = await readFileAsync(path, { encoding: 'utf8' });
            const start = pathContent.substring(0, offset);
            const end = pathContent.substring(offset + length);
            const ret = start + content + end;
            return ret;
        } catch (err) {
            return `Error reading ${path}: ${err.message}`
        }
    }
}