const axios = require('axios');

class SearchGoogle {
  constructor() {
    this.config = {
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
    };
  }

  async search_google({ query }) {
    try {
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${this.config.GOOGLE_API_KEY}&cx=${this.config.GOOGLE_CX_ID}&q=${query}`);
      const results = response.data.items.map((item) => ({
        title: item.title,
        link: item.link
      }));
      return JSON.stringify(results);
    } catch (error) {
      return error.message;
    }
  }
}

module.exports = new SearchGoogle();