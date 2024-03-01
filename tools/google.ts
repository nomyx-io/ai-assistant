// import axios from "axios";
module.exports = {
    enabled: true,
    tools: { 
        search_google: {
            schema: {
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
            },
            action: async ({ query }: any) => {
                const config = require('../config');
                try {
                    const axios = require('axios');
                    const response = await
                        axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
                    const results = response.data.items.map((item: any) => ({
                        title: item.title,
                        link: item.link
                    }));
                    const res = JSON.stringify(results);
                    return res;
                } catch (error: any) {
                    return error.message;
                }
            }
        }
    }
}
export default module.exports;