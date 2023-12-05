const fs = require('fs');
const path = require('path');

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
            fs.unlink(path, (err) => {
                if (err) {
                    reject(`Error deleting ${path}: ${err.message}`);
                } else {
                    resolve(`Successfully deleted ${path}`);
                }
            });
        });
    }
};

