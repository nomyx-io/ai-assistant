const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

async function extractContent({url}) {
  let response, dom, mainContent;

  // Attempt to fetch page content
  try {
    response = await axios.get(url);
  } catch (error) {
    console.error('Error fetching URL:', url);
    return null;
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
  } catch (error) {
    console.warn('Readability did not find meaningful content.');
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
  
  // If all methods fail, return null
  console.warn('No meaningful content could be extracted.');
  return null;
}

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'extract_content_from_url',
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
    },
    function: extractContent
}