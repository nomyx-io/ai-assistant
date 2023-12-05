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
            const files = await readdirAsync(directory);
            return { success: true, files };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};

