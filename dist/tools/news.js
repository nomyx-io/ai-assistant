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
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    enabled: false,
    tools: {
        search_news_api: {
            schema: { "type": "function", "function": { "name": "search_news_api", "description": "perform a news search using the given query", "parameters": { "type": "object", "properties": { "q": { "type": "string", "description": "The query to search for" }, "from": { "type": "string", "description": "The start date to search for" }, "to": { "type": "string", "description": "The end date to search for" }, "language": { "type": "string", "description": "The language to search for" }, "country": { "type": "string", "description": "The country to search for" }, "domains": { "type": "string", "description": "The domains to search for" }, "sources": { "type": "string", "description": "The sources to search for" }, "sortBy": { "type": "string", "description": "The sort order to search for" }, "num": { "type": "number", "description": "The number of results to return" } }, "required": ["q"] } } },
            action: (values) => __awaiter(void 0, void 0, void 0, function* () {
                const axios = require('axios');
                const config = require('../config');
                const trunc = (str, len) => {
                    return str.length > len ? str.substring(0, len - 3) + '...' : str;
                };
                try {
                    const response = yield axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${config.NEWS_API_KEY}`);
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
        }
    }
};
exports.default = module.exports;
