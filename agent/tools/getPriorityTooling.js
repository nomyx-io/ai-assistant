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
            return  fs.readFileSync('priorityTooling.json', 'utf8');
        } catch (error) {
            return `Error calling ${url}: ${error.message}`
        }
    }
}