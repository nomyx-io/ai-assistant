const axios = require('axios');

module.exports = {
  schema: {
    type: 'function',
    function: {
      name: 'jiraLogin',
      description: 'Handles authentication to JIRA using an API token',
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'The username for JIRA'
          },
          apiToken: {
            type: 'string',
            description: 'The API token for JIRA'
          }
        },
        required: ['username', 'apiToken']
      }
    }
  },
  function: async ({username, apiToken}) => {
    try {
      const authString = Buffer.from(`${username}:${apiToken}`).toString('base64');
      return authString;
    } catch (error) {
      return `Error in jiraLogin: ${error.message}`;
    }
  }
};