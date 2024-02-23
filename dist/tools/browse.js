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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
const readability_1 = require("@mozilla/readability");
const axios_1 = __importDefault(require("axios"));
module.exports = {
    state: {},
    schemas: [{
            type: 'function',
            function: {
                name: 'browse_webpage',
                description: 'return the contents of a web page given an URL',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL of the webpage to visit'
                        }
                    },
                    required: ['url']
                }
            },
        }],
    tools: {
        browse_webpage: ({ url }) => __awaiter(void 0, void 0, void 0, function* () {
            let response, dom, mainContent;
            // Attempt to fetch page content
            try {
                response = yield axios_1.default.get(url);
            }
            catch (error) {
                console.error('Error fetching URL:', url);
                return `Error fetching URL: ${url}`;
            }
            // Create a DOM object
            dom = new jsdom_1.JSDOM(response.data);
            // Attempt to extract using Readability
            try {
                const reader = new readability_1.Readability(dom.window.document);
                const article = reader.parse();
                if (article && article.content) {
                    console.log('Content extracted via Readability');
                    return article.content;
                }
            }
            catch (error) {
                return `Error extracting content using Readability: ${error.message}`;
            }
            // Fallback: DOM inspection based on common selectors
            const selectors = ['#content', '#main', 'article', '.post', '.article', 'section'];
            for (const selector of selectors) {
                mainContent = dom.window.document.querySelector(selector);
                if (mainContent) {
                    console.log(`Content extracted using selector: ${selector}`);
                    return mainContent.innerHTML;
                }
            }
            // Further Fallback: Look for <article> or <p> tags
            mainContent = dom.window.document.querySelector('article, p');
            if (mainContent) {
                console.log('Content extracted using generic <article> or <p> tag');
                return mainContent.innerHTML;
            }
            return `Error: No content found for URL: ${url}`;
        })
    }
};
//# sourceMappingURL=browse.js.map