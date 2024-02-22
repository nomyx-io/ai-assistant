"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        search_google: ({ query }) => __awaiter(void 0, void 0, void 0, function* () {
            const config = require('../config');
            try {
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
    }
};
//# sourceMappingURL=google.js.map