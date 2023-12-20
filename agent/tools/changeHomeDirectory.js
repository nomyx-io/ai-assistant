const os = require('os');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'changeHomeDirectory',
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
            console.log(`Changing home directory to ${path}`);
            os.chdir(path);
            console.log(`new path: ${path}`);
            return `new path: ${path}`;
        } catch (error) {
            return `Error calling chdir: ${error}`;
        }
    }
};