const highlight = require('cli-highlight').highlight;

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'display_code',
            description: 'display the given code string to the user in a formatted way',
            parameters: {
                type: 'object',
                properties: {
                    value: {
                        type: 'string',
                        description: 'The code string to display'
                    },
                    type: {
                        type: 'string',
                        description: 'The type of the value to display (text, json, yaml, html, xml, csv, ...)'
                    }
                },
                required: ['path']
            }
        },
    },
    function: async ({ value, type }) => {
        const highlighted = highlight(value, { language: type, ignoreIllegals: true });
        console.log('\n' + highlighted + '\n');
        return value;
    }
}