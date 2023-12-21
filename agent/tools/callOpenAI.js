require('dotenv').config();
const { OpenAI } = require('openai');
const client = new OpenAI(process.env.OPENAI_API_KEY);

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'callOpenAI',
            description: 'call an OpenAI API using the openai npm package ** YOU ARE ALREADY LOGGED IN **',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The function path to call (e.g. beta.threads.messages.create)'
                    },
                    params: {
                        type: 'string',
                        description: 'Comma-separated list of parameters to pass to the function'
                    },
                },
                required: ['command']
            }
        },
    },
    function: async ({ command, params = {} }) => {
        try {
            return await client[command](params.split(','));
        } catch (error) {
            return `Error calling ${command}: ${error.message}`
        }
    }
}