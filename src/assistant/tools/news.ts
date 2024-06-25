// assistant/tools/news.ts
import axios from 'axios';
import { debugLog } from '../errorLogger'; 
import { confirmExecution, displayCodeForEdit } from '../confirmation'; // Import confirmation functions

module.exports = {
  enabled: false,
  tools: {
    search_news_api: {
      schema:  {
        'name': 'search_news_api',
        'description': 'Performs a news search using the given query.',
        'input_schema': {
          'type': 'object',
          'properties': {
            'q': {
              'type': 'string',
              'description': 'The query to search for.',
              'required': true
            },
            'from': {
              'type': 'string',
              'description': 'The start date to search for.'
            },
            'to': {
              'type': 'string',
              'description': 'The end date to search for.'
            },
            'language': {
              'type': 'string',
              'description': 'The language to search for.'
            },
            'country': {
              'type': 'string',
              'description': 'The country to search for.'
            },
            'domains': {
              'type': 'string',
              'description': 'The domains to search for.'
            },
            'sources': {
              'type': 'string',
              'description': 'The sources to search for.'
            },
            'sortBy': {
              'type': 'string',
              'description': 'The sort order to search for.'
            },
            'num': {
              'type': 'number',
              'description': 'The number of results to return.'
            }
          }
        },
        'output_schema': {
          'type': 'array',
          'description': 'An array of news articles matching the search query.',
          'items': {
            'type': 'object',
            'properties': {
              'content': {
                'type': 'string',
                'description': 'The content of the news article, truncated to 100 characters.'
              },
              'title': {
                'type': 'string',
                'description': 'The title of the news article.'
              },
              'url': {
                'type': 'string',
                'description': 'The URL of the news article.'
              }
            }
          }
        }
      },
      action: async (values: any, api: any) => { // Add api parameter
        debugLog('search_news_api called with values:', values);

        // Display confirmation before execution
        const confirmed = await confirmExecution(api, `Execute news search with query: ${values.q}?`);
        if (!confirmed) {
          return "Execution cancelled.";
        }

        const trunc = (str: any, len: any) => {
          return str.length > len ? str.substring(0, len - 3) + '...' : str;
        }
        try {
          debugLog('Calling News API with query:', values.q);
          const response = await axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${process.env.NEWS_API_KEY}`);
          debugLog('News API response:', response.data);
          const results = response.data.articles.map((item: any) => ({
            content: trunc(item.content, 100),
            title: item.title,
            url: item.url,
          }));
          let num = values.num ? values.num : 10;
          const res = results.slice(0, num);
          debugLog('Returning search results:', res);
          return JSON.stringify(res);
        } catch (error: any) {
          debugLog('Error calling News API:', error);
          return `Error calling News API: ${error.message}`
        }
      }
    }
  }
}
export default module.exports;