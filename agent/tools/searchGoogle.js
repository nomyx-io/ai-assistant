const axios = require('axios');
const vscode = require('vscode');
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
            let config = vscode.workspace.getConfiguration('sanuel');
            let config_api_key = config.get('googleApiKey') || '';
            let config_cx =  config.get('googleCX') || '';
            const response = await
                axios.get(`https://www.googleapis.com/customsearch/v1?key=${config_api_key}&cx=${config_cx}&q=${query}`);
            const results = response.data.items.map(item => ({
                title: item.title,
                link: item.link
            }));
            return JSON.stringify(results);
        } catch (error) {
            return error.message;
        }
    }
}