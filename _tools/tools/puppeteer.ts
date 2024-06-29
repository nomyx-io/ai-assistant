

// assistant/tools/puppeteer.ts
const puppeteer = require('puppeteer');
import { debugLog } from '../errorLogger';

// Function to handle different form field types
const fillFormField = async (page, fieldSelector, value) => {
  const field = await page.$(fieldSelector);
  const fieldType = await field.evaluate(el => el.tagName.toLowerCase());

  switch (fieldType) {
    case 'input':
      const inputType = await field.evaluate(el => (el.type || 'text').toLowerCase());
      if (inputType === 'radio' || inputType === 'checkbox') {
        await field.evaluate((el, value) => { el.checked = value; }, value);
      } else {
        await field.type(value);
      }
      break;
    case 'select':
      await page.select(fieldSelector, value);
      break;
    default:
      console.warn(`Unsupported field type: ${fieldType}`);
  }
};

module.exports = {
  enabled: true,
  // Option to enable/disable headless mode
  headless: true,  
  tools: {
    take_screenshot: {
      schema: {
        "name": "take_screenshot",
        "description": "Capture a screenshot of a web page",
        "input_schema": {
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
        },
        "output_schema": {
          "type": "string",
          "description": "The output of the function, typically a success message."
        }
      },
      action: async ({ url, filePath }, api: any) => {
        debugLog(`take_screenshot called with url: ${url}, filePath: ${filePath}`);

        // Display confirmation before execution
        const confirmed = await confirmExecution(api, `Take screenshot of ${url} and save to ${filePath}?`);
        if (!confirmed) {
          return "Execution cancelled.";
        }

        try {
          debugLog('Launching Puppeteer browser...');
          const browser = await puppeteer.launch({ headless: module.exports.headless }); // Use headless option
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'); // Set custom user agent
          debugLog(`Navigating to ${url}...`);
          await page.goto(url, { waitUntil: 'networkidle2' });
          debugLog(`Capturing screenshot to ${filePath}...`);
          await page.screenshot({ path: filePath });
          debugLog('Closing Puppeteer browser...');
          await browser.close();
          return `Screenshot saved to ${filePath}`;
        } catch (err) {
          debugLog("Error taking screenshot:", err); // Log the entire error object
          return JSON.stringify(err.message);
        }
      }
    },
    get_page_content:{
      "name": "get_page_content",
      "description": "Get the HTML content of a web page",
      "input_schema": {
        "type": "object",
        "properties": {
          "url": {
            "type": "string",
            "description": "URL of the web page"
          },
          "resultVar": {
            "type": "string",
            "description": "Optional. The variable name to store the result in."
          }
        },
        "required": ["url"]
      },
      "output_schema": {
        "type": "string",
        "description": "The HTML content of the web page."
      }
    },
    action: async ({ url }, api: any) => {
      debugLog(`get_page_content called with url: ${url}`);
      try {
        debugLog('Launching Puppeteer browser...');
        const browser = await puppeteer.launch({ headless: module.exports.headless }); // Use headless option
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'); // Set custom user agent
        debugLog(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        debugLog('Retrieving page content...');
        const content = await page.content();
        debugLog('Closing Puppeteer browser...');
        await browser.close();
        return content;
      } catch (err) {
        debugLog("Error getting page content:", err); // Log the entire error object
        return JSON.stringify(err.message);
      }
    }
  },
  submit_form: {
    schema: {
      "name": "submit_form",
      "description": "Submit a form on a web page",
      "input_schema": {
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
      },
      "output_schema": {
        "type": "string",
        "description": "The output of the function, typically a success message or the response from the server."
      }
    },
    action: async ({ url, formSelector, formData }, api: any) => {
      debugLog(`submit_form called with url: ${url}, formSelector: ${formSelector}, formData: ${JSON.stringify(formData)}`);
      try {
        debugLog('Launching Puppeteer browser...');
        const browser = await puppeteer.launch({ headless: module.exports.headless }); // Use headless option
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'); // Set custom user agent
        debugLog(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Populate form fields
        debugLog('Populating form fields...');
        for (const [key, value] of Object.entries(formData)) {
          const fieldSelector = `${formSelector} [name="${key}"]`;
          debugLog(`Filling field ${key} with value ${value}...`);
          await fillFormField(page, fieldSelector, value); // Use the helper function
        }

        // Submit the form
        debugLog('Submitting form...');
        await page.$eval(formSelector, form => form.submit());

        debugLog('Closing Puppeteer browser...');
        await browser.close();
        return `Form submitted`;
      } catch (err) {
        debugLog("Error submitting form:", err); // Log the entire error object
        return JSON.stringify(err.message);
      }
    }
  },
}


export default module.exports;