const axios = require('axios');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'getProject',
            description: 'Fetch the details of a specific project',
            parameters: {
                type: 'object',
                properties: {
                    authString: {
                        type: 'string',
                        ddescription: 'The authorization string (Base64 encoded).'
                    },
                    baseUrl: {
                        type: 'string',
                        description: 'The base URL for the JIRA server.'
                    },
                    projectId: {
                        type: 'string',
                        description: 'The ID of the project to fetch.'
                    }
                },
                required: ['authString', 'baseUrl', 'projectId']
            }
        },
    },
    function: async ({ authString, baseUrl, projectId }) => {
        try {
            const response = await axios({
                method: 'get',
                url: `${baseUrl}/rest/api/2/project/${projectId}`,
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            return `Error calling ${baseUrl}/rest/api/2/project/${projectId}: ${error.message}`
        }
    }
};