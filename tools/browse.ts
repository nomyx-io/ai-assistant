import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import axios from 'axios';


module.exports = {
  state: {},
  schemas: [{
    type: 'function',
    function: {
      name: 'browse_webpage',
      description: 'return the contents of a web page given an URL',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to visit'
          }
        },
        required: ['url']
      }
    },
  }],
  tools: {
    browse_webpage: async ({ url }: any) => {
      let response, dom, mainContent;

      // Attempt to fetch page content
      try {
        response = await axios.get(url);
      } catch (error: any) {
        console.error('Error fetching URL:', url);
        return `Error fetching URL: ${url}`
      }

      // Create a DOM object
      dom = new JSDOM(response.data);

      // Attempt to extract using Readability
      try {
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article && article.content) {
          console.log('Content extracted via Readability');
          return article.content;
        }
      } catch (error: any) {
        return `Error extracting content using Readability: ${error.message}`;
      }

      // Fallback: DOM inspection based on common selectors
      const selectors = ['#content', '#main', 'article', '.post', '.article', 'section'];
      for (const selector of selectors) {
        mainContent = dom.window.document.querySelector(selector);
        if (mainContent) {
          console.log(`Content extracted using selector: ${selector}`);
          return mainContent.innerHTML;
        }
      }

      // Further Fallback: Look for <article> or <p> tags
      mainContent = dom.window.document.querySelector('article, p');
      if (mainContent) {
        console.log('Content extracted using generic <article> or <p> tag');
        return mainContent.innerHTML;
      }

      return `Error: No content found for URL: ${url}`;
    }
  }
}