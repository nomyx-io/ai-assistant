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
            action: async ({ url, filePath }: any) => {
                try {
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    await page.goto(url, { waitUntil: 'networkidle2' });
                    await page.screenshot({ path: filePath });
                    await browser.close();
                    return `Screenshot saved to ${filePath}`;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            }
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
            action: async ({ url }: any) => {
                try {
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    await page.goto(url, { waitUntil: 'networkidle2' });
                    const content = await page.content();
                    await browser.close();
                    return content;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            }
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
            action: async ({ url, formSelector, formData }: any) => {
                try {
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    await page.goto(url, { waitUntil: 'networkidle2' });
                    await page.type(formSelector, formData);
                    await page.keyboard.press('Enter');
                    await browser.close();
                    return `Form submitted`;
                } catch (err: any) {
                    return JSON.stringify(err.message);
                }
            }
        },
    }
};

export default module.exports;
