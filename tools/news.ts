module.exports = {
    state: {
        modules: [{
            name: "news",
            description: "News Search",
            version: "0.0.1"
        }]
    },
    schemas: [{"type": "function", "function": {"name": "search_news_api", "description": "perform a news search using the given query", "parameters": {"type": "object", "properties": {"q": {"type": "string", "description": "The query to search for"}, "from": {"type": "string", "description": "The start date to search for"}, "to": {"type": "string", "description": "The end date to search for"}, "language": {"type": "string", "description": "The language to search for"}, "country": {"type": "string", "description": "The country to search for"}, "domains": {"type": "string", "description": "The domains to search for"}, "sources": {"type": "string", "description": "The sources to search for"}, "sortBy": {"type": "string", "description": "The sort order to search for"}, "num": {"type": "number", "description": "The number of results to return"}}, "required": ["q"]}}}],
    tools: {
        search_news_api: async (values: any) => {
            const axios = require('axios');
            const config = require('../config');
            const trunc = (str: any, len: any) => {
                return str.length > len ? str.substring(0, len - 3) + '...' : str;
            }
            try {
                const response = await axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${config.NEWS_API_KEY}`);
                const results = response.data.articles.map((item: any) => ({
                    content: trunc(item.content, 100),
                    title: item.title,
                    url: item.url,
                }));
                // keep only the first num results
                let num = values.num ? values.num : 10;
                const res = results.slice(0, num);
                return JSON.stringify(res);
            } catch (error: any) {
                return `Error calling News API: ${error.message}`
            }
        }
    }
}
export default module.exports;