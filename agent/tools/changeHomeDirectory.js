const os = require('os');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'change_Home_Directory',
            description: 'change the default directory of the agent. All subsequent actions will be relative to this directory',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path to the directory.'
                    },
                },
                required: ['path']
            }
        },
    },
    function: async ({ path }) => {
        try {
            os.chdir(path);
            return `new path: ${path}`;
        } catch (error) {
            return `Error calling chdir: ${error}`;
        }
    }
};