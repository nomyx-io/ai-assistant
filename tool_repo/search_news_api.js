const axios = require('axios');

class SearchNewsAPI {
  async search_news_api(params) {
    const trunc = (str, len) => {
      return str.length > len ? str.substring(0, len - 3) + '...' : str;
    };

    try {
      const queryParams = new URLSearchParams({
        q: params.q,
        apiKey: process.env.NEWS_API_KEY,
        from: params.from,
        to: params.to,
        language: params.language,
        country: params.country,
        domains: params.domains,
        sources: params.sources,
        sortBy: params.sortBy
      });

      const response = await axios.get(`https://newsapi.org/v2/everything?${queryParams}`);
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

module.exports = SearchNewsAPI;