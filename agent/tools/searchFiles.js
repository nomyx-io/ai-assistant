const fs = require('fs');
const path = require('path');
const util = require('util');
const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);

async function searchDirectory(dir, regex) {
    let results = [];
    const files = await readdirAsync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await statAsync(filePath);
        if (stats.isDirectory()) {
            results = results.concat(await searchDirectory(filePath, regex));
        } else if (regex.test(file)) {
            results.push(filePath);
        }
    }
    return results;
}

module.exports =  {
    schema: {
        type: "function",
        function: {
            name: "searchFiles",
            description: "Searches for files in a directory matching a pattern",
            parameters: {
                type: "object",
                properties: {
                    directory: {
                        type: "string",
                        description: "The directory to search files in"
                    },
                    pattern: {
                        type: "string",
                        description: "The regular expression pattern to match file names"
                    }
                },
                required: ["directory", "pattern"]
            }
        }
    },
    function: async ({ directory, pattern }) => {
        try {
            const regex = new RegExp(pattern);
            const files = await searchDirectory(directory, regex);
            return { success: true, files: files };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}