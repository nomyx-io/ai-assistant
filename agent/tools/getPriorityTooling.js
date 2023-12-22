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
    function: async ({}) => {
        try {
            // look for priorityTooling.json in the current folder
            // if it doesn't exist, create an empty array and write it to the file
            if (!fs.existsSync('priorityTooling.json')) {
                fs.writeFileSync('priorityTooling.json', '[]');
            }
            return  fs.readFileSync('priorityTooling.json', 'utf8');
        } catch (error) {
            return `Error calling ${url}: ${error.message}`
        }
    }
}