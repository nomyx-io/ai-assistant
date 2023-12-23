require('dotenv').config();
const fs = require('fs');
const { find } = require('shelljs');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'replace_text_in_file',
            description: 'replace text in a file with other text',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'The path of the file to replace text in'
                    },
                    find: {
                        type: 'string',
                        description: 'The text to find'
                    },
                    replace: {
                        type: 'string',
                        description: 'The text to replace'
                    },
                    caseSensitive: {
                        type: 'boolean',
                        description: 'Whether to match case'
                    },
                    regex: {
                        type: 'boolean',
                        description: 'Whether to use regex'
                    },
                    global: {
                        type: 'boolean',
                        description: 'Whether to replace all instances'
                    }
                },
                required: ['filePath', 'find', 'replace']
            }
        },
    },
    function: async ({ filePath, find, replace, caseSensitive, regex, global }) => {
        try {
            if (!fs.existsSync(filePath)) {
                return `Error reading ${filePath}: file does not exist`
            }
            const content = fs.readFileSync(filePath, { encoding: 'utf8' });
            let flags = 'g';
            if (!global) {
                flags = '';
            }
            if (caseSensitive) {
                flags += 'i';
            }
            let regexObj = undefined;
            if (regex) {
                regexObj = new RegExp(find, flags);
            } else {
                regexObj = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
            }
            const ret = content.replace(regexObj, replace);
            fs.writeFileSync(filePath, ret, { encoding: 'utf8' });
            return `Successfully replaced text in ${filePath}`
        } catch (error) {
            return `Error calling ${url}: ${error.message}`
        }
    }
}