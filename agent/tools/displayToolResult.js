

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'display_tool_result',
            description: 'display the result of the tool to the user in a formatted way. ** ALWAYS RUM THIS TOOL AFTER EXECUTING A TOOL **',
            parameters: {
                type: 'object',
                properties: {
                    result: {
                        type: 'string',
                        description: 'The reult of the tool'
                    }
                },
                required: ['result']
            }
        },
    },
    function: async ({ value, type }) => {
        const marked = require('marked');
        console.log('\n' + marked(value) + '\n');
        return value;
    }
}