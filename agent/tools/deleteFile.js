const fs = require('fs');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'deleteFile',
            description: 'delete a file at the given path',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to delete'
                    }
                },
                required: ['path']
            }
        },
    },
    function: async ({ path }) => {
        return new Promise((resolve, reject) => {
            console.log(`Deleting ${path}`);
            fs.unlink(path, (err) => {
                if (err) {
                    console.log(`Error deleting ${path}: ${err.message}`);
                    reject(`Error deleting ${path}: ${err.message}`);
                } else {
                    console.log(`Successfully deleted ${path}`);
                    resolve(`Successfully deleted ${path}`);
                }
            });
        });
    }
}