const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'visitPage',
            description: 'returns the contents of a web page given an URL',
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
    function: async ({ url }) => {
        try {
            const response = await axios.get(url);
            const dom = new JSDOM(response.data);
            const content = dom.window.document.body.textContent;
            return content;
        } catch (error) {
            throw new Error(`Error visiting ${url}: ${error.message}`);
        }
    }
};