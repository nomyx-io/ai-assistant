require('dotenv').config();
const fs = require('fs');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'setPriorityTooling',
            description: 'set the tools that will be executed on every message. this setting persists across restarts.',
            parameters: {
                type: 'object',
                properties: {
                    tooling: {
                        type: 'string',
                        description: 'A comma-separated list of tooling to run on every message, or an empty string to clear the list'
                    },
                },
                required: ['tooling']
            }
        },
    },
    function: async ({ tooling }) => {
        try {
            const toolingList = tooling.split(',');
            const toolingListString = JSON.stringify(toolingList);
            fs.writeFileSync('priorityTooling.json', toolingListString);
            return `Set priority tooling to ${toolingListString}`;
        } catch (error) {
            return `Error calling ${url}: ${error.message}`
        }
    }
}