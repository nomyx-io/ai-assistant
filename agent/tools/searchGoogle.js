const axios = require('axios');
module.exports = {
    schema: {
        type: "function",
        function: {
            name: "searchGoogle",
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
    function: async ({ query }) => {
        try {
            console.log(`Searching Google for ${query}`);
            let config_api_key = process.env.GOOGLE_API_KEY;
            let config_cx =  process.env.GOOGLE_CX_ID;
            const response = await
                axios.get(`https://www.googleapis.com/customsearch/v1?key=${config_api_key}&cx=${config_cx}&q=${query}`);
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link
            }));
            const res = JSON.stringify(results);
            console.log(`Results:\n${res}`);
            return res;
        } catch (error) {
            console.log(`Error searching Google for ${query}: ${error.message}`);
            return error.message;
        }
    }
}