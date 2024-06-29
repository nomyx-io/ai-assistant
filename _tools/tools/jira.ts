
// assistant/tools/jira.ts
import axios from 'axios';
import 'dotenv/config';
import { debugLog } from '../errorLogger';

async function callJIRA({ methodPath, data }: any, api: any) { // Add api parameter
  debugLog(`callJIRA called with methodPath: ${methodPath}, data: ${JSON.stringify(data)}`);

  // Display confirmation before execution
  const confirmed = await confirmExecution(api, `Call JIRA API with method path: ${methodPath}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  const url = `${config.domain}/rest/api/3/${methodPath}`;
  const auth = {
    username: config.username,
    password: config.token
  };
  try {
    debugLog(`Making JIRA API request to ${url}...`);
    const response = await axios({
      method: 'post',
      url,
      auth,
      data
    } as any);
    debugLog('JIRA API response:', response.data);
    return response.data;
  } catch (error: any) {
    debugLog('Error calling JIRA API:', error.response.data);
    return error.response.data;
  }
}

module.exports = {
  enabled: false,
  tools: {
    "call_jira": {
      schema: {
        "name": "call_jira",
        "description": "Call JIRA API",
        "input_schema": {
          "type": "object",
          "properties": {
            "methodPath": {
              "type": "string",
              "description": "The JIRA API method path"
            },
            "data": {
              "type": "object",
              "description": "The data to send to the JIRA API"
            }
          },
          "required": [
            "methodPath"
          ]
        },
        "output_schema": {
          "type": "object",
          "description": "The response from the JIRA API"
        }
      },
      action: callJIRA
    }
  },
  callJIRA
};

// JIRA API configuration obtained from environment variables for enhanced security
const config = {
  domain: process.env.JIRA_DOMAIN,
  username: process.env.JIRA_USERNAME,
  token: process.env.JIRA_API_KEY
};
