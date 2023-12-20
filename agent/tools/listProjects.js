const axios = require('axios');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'listProjects',
            description: 'List all available JIRA projects',
            parameters: {
                type: 'object',
                properties: {
                    authString: {
                        type: 'string',
                        description: 'The authorization string (Base64 encoded).'
                    },
                    baseUrl: {
                        type: 'string',
                        description: 'The base URL for the JIRA server.'
                    }
                },
                required: ['authString', 'baseUrl']
            }
        },
    },
    function: async ({ authString, baseUrl }) => {
        try {
            const response = await axios({
                method: 'get',
                url: `${baseUrl}/rest/api/2/project`,
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            return `Error calling ${baseUrl}/rest/api/2/project: ${error.message}`
        }
    }
};