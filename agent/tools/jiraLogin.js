const axios = require('axios');

module.exports = {
  schema: {
    type: 'function',
    function: {
      name: 'login_to_jira',
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
      return Buffer.from(`${username}:${apiToken}`).toString('base64');
    } catch (error) {
      return `Error in jiraLogin: ${error.message}`;
    }
  }
};