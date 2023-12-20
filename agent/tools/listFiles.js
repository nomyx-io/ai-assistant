const fs = require('fs');
const util = require('util');
const readdirAsync = util.promisify(fs.readdir);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'listFiles',
            description: 'Lists files in a directory',
            parameters: {
                type: 'object',
                properties: {
                    directory: {
                        type: 'string',
                        description: 'The directory to list files from'
                    }
                },
                required: ['directory']
            }
        },
    },
    function: async ({ directory }) => {
        try {
            console.log(`Listing files in ${directory}`);
            const files = await readdirAsync(directory);
            const fils = JSON.stringify(files);
            console.log(`Files in ${directory}:\n${fils}`);
            return fils;
        } catch (err) {
            console.log(`Error listing files in ${directory}: ${err.message}`);
            return JSON.stringify(err.message);
        }
    }
}