// This is javascript code for a tool module
class search_news_apiTool {

  async execute(params, api) {
    const axios = require('axios');
    const trunc = (str, len) => {
      return str.length > len ? str.substring(0, len - 3) + '...' : str;
    };
    try {
      const response = await axios.get(`https://newsapi.org/v2/everything?q=${params.q}&apiKey=${process.env.NEWS_API_KEY}`);
      const results = response.data.articles.map((item) => ({
        content: trunc(item.content, 100),
        title: item.title,
        url: item.url,
      }));
      let num = params.num ? params.num : 10;
      const res = results.slice(0, num);
      return JSON.stringify(res);
    } catch (error) {
      return `Error calling News API: ${error.message}`;
    }
  }

}

module.exports = new search_news_apiTool();