// get a list of DOM nodes that match the given selector
function getDOMNode(path: any, selector: any, isBrowser: any) {
  let dom;
  if (isBrowser) {
    dom = document;
  } else {
    const fs = require('fs');
    const { JSDOM } = require('jsdom');
    const html = fs.readFileSync(path, 'utf8');
    dom = new JSDOM(html).window.document;
  }
  return dom.querySelectorAll(selector);
}

function summarizeHTMLElement(element: any, level = 0) {
  let summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0, divCount: 0 };

  if (level === 0) {
      summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
      summary.imageCount += element.querySelectorAll('img').length;
      summary.linkCount += element.querySelectorAll('a').length;
      summary.divCount += element.querySelectorAll('div').length;
      summary.interactiveCount += element.querySelectorAll('input, button, select, textarea, video, audio', 'iframe').length;
  } else {
      // Summarize child elements
      const children = element.children;
      for (let i = 0; i < children.length; i++) {
          let childSummary = summarizeHTMLElement(children[i], level - 1);
          summary.textSummary += ' ' + parseInt(childSummary.textSummary);
          summary.imageCount += childSummary.imageCount;
          summary.linkCount += childSummary.linkCount;
          summary.interactiveCount += childSummary.interactiveCount;
      }
      // Simplify the summary for this level
      summary.textSummary = `${summary.textSummary.substring(0, 50)}... (${children.length} elements)`;
  }
  return summary;
}

const toolSchema = {
  enabled: false,
  tools: {
    selector: {
      schema: {
        type: 'function',
        function: {
          name: 'selector',
          description: 'Performs the selector operation on the HTML page at the given path. The operation can be get, append, prepend, replace, remove, get_attributes, or set_attributes, or summarize. IF running in the browser, the path is ignored and the current page is used.',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'The file path to the HTML file.' },
              operation: { type: 'string', description: 'The operation to perform on the selector. Can be get, append, prepend, replace, remove, get_attributes, set_attributes, or summarize' },
              selector: { type: 'string', description: 'The CSS selector to match elements.' },
              value: { type: 'string', description: 'The HTML content to append.' },
              n: { type: 'string', description: 'For summarize, specifies the depth of child elements to summarize. 0 for detailed information.' },
            },
            required: ['selector', 'operation']
          }
        }
      },
      action: function ({ path, operation, selector, value, n }: any) {
        const fs = require('fs');
        const { JSDOM } = require('jsdom');
        let dom;
        try {
          if (typeof document !== 'undefined') {
            dom = document;
          } else {
            const html = fs.readFileSync(path, 'utf8');
            dom = new JSDOM(html).window.document;
          }
        } catch (e) { 
          const html = fs.readFileSync(path, 'utf8');
          dom = new JSDOM(html).window.document;
        }
  
        const elements: any = getDOMNode(path, selector, true);
        let result: any = '';
        switch (operation) {
          case 'get':
            const content: any = [];
            elements.forEach((ele: any) => content.push(ele.innerHTML));
            result = content.join('\n');
            break;
          case 'append':
            elements.forEach((ele: any) => ele.innerHTML += value);
            result = 'Content appended successfully.';
            break;
          case 'prepend':
            elements.forEach((ele: any) => ele.innerHTML = value + ele.innerHTML);
            result = 'Content prepended successfully.';
            break;
          case 'replace':
            elements.forEach((ele: any) => ele.innerHTML = value);
            result = 'Content replaced successfully.';
            break;
          case 'remove':
            elements.forEach((ele: any) => ele.innerHTML = ele.innerHTML.replace(value, ''));
            result = 'Content removed successfully.';
            break;
          case 'get_attributes':
            const attributes: any = [];
            elements.forEach((ele: any) => attributes.push(ele.getAttribute(value)));
            result = attributes;
            break;
          case 'set_attributes':
            elements.forEach((ele: any) => ele.setAttribute(value, n));
            result = 'Attribute set successfully.';
            break;
          case 'summarize':
            const summary = { textSummary: '', imageCount: 0, linkCount: 0, interactiveCount: 0 };
            elements.forEach((element: any) => {
  
              if (n === 0) {
                // Base case: detailed information
                summary.textSummary = element.textContent.slice(0, 100) + '...'; // First 100 chars
                summary.imageCount += element.querySelectorAll('img').length;
                summary.linkCount += element.querySelectorAll('a').length;
                summary.interactiveCount += element.querySelectorAll('input, button, select, textarea').length;
              } else {
                // Summarize child elements
                const children = element.children;
                for (let i = 0; i < children.length; i++) {
                  let childSummary = summarizeHTMLElement(children[i], n - 1);
                  summary.textSummary += childSummary.textSummary; // Concatenate text summaries
                  summary.imageCount += childSummary.imageCount;
                  summary.linkCount += childSummary.linkCount;
                  summary.interactiveCount += childSummary.interactiveCount;
                }
                // Simplify the summary for this level
                summary.textSummary += `${summary.textSummary.substring(0, 50)}... (${children.length} elements)\n`;
              }
            });
            result = summary;
            break;
          default:
            result = 'Invalid operation.';
        }
        fs.writeFileSync(path, dom.serialize());
        return dom.serialize();
      }
    },
  }
}

module.exports = toolSchema;
export default module.exports;