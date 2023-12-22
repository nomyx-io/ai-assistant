const highlight = require('cli-highlight').highlight;

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'display',
            description: 'display the content of the string value mid-process',
            parameters: {
                type: 'object',
                properties: {
                    value: {
                        type: 'string',
                        description: 'The string value to display'
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
        console.log(highlighted);
        return value;
    }
}