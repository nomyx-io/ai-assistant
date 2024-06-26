(values) => __awaiter(void 0, void 0, void 0, function* () {
            const axios = require('axios');
            const trunc = (str, len) => {
                return str.length > len ? str.substring(0, len - 3) + '...' : str;
            };
            try {
                const response = yield axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${process.env.NEWS_API_KEY}`);
                const results = response.data.articles.map((item) => ({
                    content: trunc(item.content, 100),
                    title: item.title,
                    url: item.url,
                }));
                // keep only the first num results
                let num = values.num ? values.num : 10;
                const res = results.slice(0, num);
                return JSON.stringify(res);
            }
            catch (error) {
                return `Error calling News API: ${error.message}`;
            }
        })