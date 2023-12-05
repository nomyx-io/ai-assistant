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
        const fs = await import ('fs');
        const path = await import ('path');
        const { exec } = await import ('child_process');
        return new Promise((resolve, reject) => {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFileSync(fileName, js);
            exec(`node ${fileName}`, (error, stdout, stderr) => {
                fs.unlinkSync(fileName);
                if (error) {
                    reject(error.message);
                } else if (stderr) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
};