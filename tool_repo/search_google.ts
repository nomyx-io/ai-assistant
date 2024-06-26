({ query }) => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
                GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
            };
            try {
                const axios = require('axios');
                const response = yield axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
                const results = response.data.items.map((item) => ({
                    title: item.title,
                    link: item.link
                }));
                const res = JSON.stringify(results);
                return res;
            }
            catch (error) {
                return error.message;
            }
        })