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
            action: ({ query }) => __awaiter(void 0, void 0, void 0, function* () {
                const config = require('../config');
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
        }
    }
};
exports.default = module.exports;
