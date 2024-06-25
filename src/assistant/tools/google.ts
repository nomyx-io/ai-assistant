
// assistant/tools/google.ts
import 'dotenv/config';
import axios from 'axios';
import { debugLog } from '../errorLogger';

module.exports = {
  enabled: true,
  tools: {
    search_google: {
      schema: {
        "name": "search_google",
        "description": "perform a google search using the given query",
        "input_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The query to search for"
            }
          },
          "required": [
            "query"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The search results from Google."
        }
      },
      action: async ({ query }: any, api) => {
        debugLog(`search_google called with query: ${query}`);

        // Display confirmation before execution
        const confirmed = await confirmExecution(api, `Perform Google search with query: ${query}?`);
        if (!confirmed) {
          return "Execution cancelled.";
        }

        const config = {
          GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
          GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
        }
        try {
          debugLog('Calling Google Custom Search API...');
          const response = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
          debugLog('Google Custom Search API response:', response.data);
          const results = response.data.items.map((item: any) => ({
            title: item.title,
            link: item.link
          }));
          const res = JSON.stringify(results);
          debugLog('Returning search results:', res);
          return res;
        } catch (error: any) {
          debugLog('Error calling Google Custom Search API:', error);
          return error.message;
        }
      }
    }
  }
}
export default module.exports;