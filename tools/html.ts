const cheerio = require('cheerio');
const fs = require('fs');
const pathModule = require('path');

module.exports = {
    enabled: true,
    mode: ['fs'],
    tools: {
        htmlfile_append_element: {
            schema: {
                "type": "function",
                "function": {
                    "name": "append_element",
                    "description": "Append content to a specified element",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "The path of the HTML file"
                            },
                            "selector": {
                                "type": "string",
                                "description": "The CSS selector of the target element"
                            },
                            "newContent": {
                                "type": "string",
                                "description": "The content to append"
                            }
                        },
                        "required": ["htmlContent", "selector", "newContent"]
                    }
                }
            },
            action: async ({ path, selector, newContent }: any) => {
                try {
                    if(path.slice(0, 1) !== '/') {
                        path = pathModule.join(process.cwd(), path);
                    }
                    const $ = cheerio.load(path);
                    $(selector).append(newContent);
                    fs.writeFileSync(path, $.html());
                    return `appended to selector ${selector} in file ${path}`;
                } catch (err: any) {
                    return err.message
                }
            }
        },
        htmlfile_prepend_element: {
            schema: {
                "type": "function",
                "function": {
                    "name": "prepend_element",
                    "description": "Prepend content to a specified element",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "The path of the HTML file"
                            },
                            "selector": {
                                "type": "string",
                                "description": "The CSS selector of the target element"
                            },
                            "newContent": {
                                "type": "string",
                                "description": "The content to prepend"
                            }
                        },
                        "required": ["htmlContent", "selector", "newContent"]
                    }
                }
            },
            action: async ({ path, selector, newContent }: any) => {
                try {
                    if(path.slice(0, 1) !== '/') {
                        path = pathModule.join(process.cwd(), path);
                    }
                    const $ = cheerio.load(path);
                    $(selector).prepend(newContent);
                    fs.writeFileSync(path, $.html());
                    return `prepended to selector ${selector} in file ${path}`;
                } catch (err: any) {
                    return err.message
                }
            }
        },
        htmlfile_replace_element: {
            schema: {
                "type": "function",
                "function": {
                    "name": "replace_element",
                    "description": "Replace content of a specified element",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "The path of the HTML file"
                            },
                            "selector": {
                                "type": "string",
                                "description": "The CSS selector of the target element"
                            },
                            "newContent": {
                                "type": "string",
                                "description": "The content to replace"
                            }
                        },
                        "required": ["htmlContent", "selector", "newContent"]
                    }
                }
            },
            action: async ({ path, selector, newContent }: any) => {
                try {
                    if(path.slice(0, 1) !== '/') {
                        path = pathModule.join(process.cwd(), path);
                    }
                    const $ = cheerio.load(path);
                    $(selector).replaceWith(newContent);
                    fs.writeFileSync(path, $.html());
                    return `replaced selector ${selector} in file ${path}`;
                } catch (err: any) {
                    return err.message
                }
            }
        },
        htmlfile_remove_element: {
            schema: {
                "type": "function",
                "function": {
                    "name": "remove_element",
                    "description": "Remove a specified element",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "The path of the HTML file"
                            },
                            "selector": {
                                "type": "string",
                                "description": "The CSS selector of the target element"
                            }
                        },
                        "required": ["htmlContent", "selector"]
                    }
                }
            },
            action: async ({ path, selector }: any) => {
                try {
                    if(path.slice(0, 1) !== '/') {
                        path = pathModule.join(process.cwd(), path);
                    }
                    const $ = cheerio.load(path);
                    $(selector).remove();
                    fs.writeFileSync(path, $.html());
                    return `removed selector ${selector} in file ${path}`;
                } catch (err: any) {
                    return err.message
                }
            }
        }
    }
};

export default module.exports;
