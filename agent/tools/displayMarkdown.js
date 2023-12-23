

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'display_Markdown',
            description: 'display the given markdown string to the user in a formatted way',
            parameters: {
                type: 'object',
                properties: {
                    value: {
                        type: 'string',
                        description: 'The markdown string to display'
                    }
                },
                required: ['path']
            }
        },
    },
    function: async ({ value, type }) => {
        const marked = require('marked');
        console.log('\n' + marked(value) + '\n');
        return value;
    }
}