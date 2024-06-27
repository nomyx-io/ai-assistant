// This is javascript code for a tool module
class search_googleTool {

  async execute(params, api) {
    const config = {
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
    };
    try {
      const axios = require('axios');
      const response = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${params.query}`);
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

module.exports = new search_googleTool();