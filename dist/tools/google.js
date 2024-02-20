"use strict";
// import axios from "axios";
const axios = require('axios');
module.exports = {
    state: {
        modules: [{
                name: "google",
                description: "Google Search",
                version: "0.0.1"
            }]
    },
    schemas: [{
            type: "function",
            function: {
                name: "search_google",
                description: "perform a google search using the given query",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The query to search for"
                        }
                    },
                    required: ["query"]
                }
            }
        }],
    tools: {
        search_google: async ({ query }) => {
            const config = require('../config');
            try {
                const response = await axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
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
        }
    }
};
//# sourceMappingURL=google.js.map