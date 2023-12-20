const fs = require('fs');
const path = require('path');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'runNodeJS',
            description: 'execute arbitrary JavaScript code in node.js and return the result',
            parameters: {
                type: 'object',
                properties: {
                    js: {
                        type: 'string',
                        description: 'JavaScript code to run'
                    }
                },
                required: ['js']
            }
        }
    },
    function: async ({ js }) => {
        return new Promise((resolve, reject) => {
            try {
                const fileName = path.join(__dirname, new Date().getTime() + ".js");
                fs.writeFileSync(fileName, js);
                console.log(hljs.highlight('javascript', js).value)
                exec(`node ${fileName}`, (error, stdout, stderr) => {
                    fs.unlinkSync(fileName);
                    if (error) {
                        console.log(error.message)
                        resolve(error.message);
                    } else if (stderr) {
                        console.log(stderr)
                        resolve(stderr);
                    } else {
                        console.log(stdout)
                        resolve(JSON.stringify(stdout));
                    }
                });
            } catch (err) {
                resolve(err.message);
            }
        });
    }
}