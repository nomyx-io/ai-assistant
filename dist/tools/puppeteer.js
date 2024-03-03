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
const puppeteer = require('puppeteer');
module.exports = {
    enabled: true,
    tools: {
        take_screenshot: {
            schema: {
                "type": "function",
                "function": {
                    "name": "take_screenshot",
                    "description": "Capture a screenshot of a web page",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "URL of the web page to capture"
                            },
                            "filePath": {
                                "type": "string",
                                "description": "File path to save the screenshot"
                            }
                        },
                        "required": ["url", "filePath"]
                    }
                }
            },
            action: ({ url, filePath }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const browser = yield puppeteer.launch();
                    const page = yield browser.newPage();
                    yield page.goto(url, { waitUntil: 'networkidle2' });
                    yield page.screenshot({ path: filePath });
                    yield browser.close();
                    return `Screenshot saved to ${filePath}`;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        get_page_content: {
            schema: {
                "type": "function",
                "function": {
                    "name": "get_page_content",
                    "description": "Get the HTML content of a web page",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "URL of the web page"
                            }
                        },
                        "required": ["url"]
                    }
                }
            },
            action: ({ url }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const browser = yield puppeteer.launch();
                    const page = yield browser.newPage();
                    yield page.goto(url, { waitUntil: 'networkidle2' });
                    const content = yield page.content();
                    yield browser.close();
                    return content;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        submit_form: {
            schema: {
                "type": "function",
                "function": {
                    "name": "submit_form",
                    "description": "Submit a form on a web page",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "URL of the web page"
                            },
                            "formSelector": {
                                "type": "string",
                                "description": "Selector of the form to submit"
                            },
                            "formData": {
                                "type": "object",
                                "description": "Form data to submit"
                            }
                        },
                        "required": ["url", "formSelector", "formData"]
                    }
                }
            },
            action: ({ url, formSelector, formData }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const browser = yield puppeteer.launch();
                    const page = yield browser.newPage();
                    yield page.goto(url, { waitUntil: 'networkidle2' });
                    yield page.type(formSelector, formData);
                    yield page.keyboard.press('Enter');
                    yield browser.close();
                    return `Form submitted`;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
    }
};
exports.default = module.exports;
