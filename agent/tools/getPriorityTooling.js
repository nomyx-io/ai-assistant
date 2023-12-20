require('dotenv').config();
const fs = require('fs');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'getPriorityTooling',
            description: 'get the tools that will be executed on every message.',
            parameters: {}
        },
    },
    function: async () => {
        try {
            const toolingFile = fs.readFileSync('priorityTooling.json', 'utf8');
            return toolingFile;
        } catch (error) {
            return `Error calling ${url}: ${error.message}`
        }
    }
}