module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'runBash',
            description: 'execute an arbitrary Bash command',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Bash command to run'
                    }
                },
                required: ['command']
            }
        }
    },
    function: async ({ command }) => {
        const shell = (await import('shelljs')).default;
        return new Promise((resolve, reject) => {
            shell.exec(command, { silent: true }, (code, stdout, stderr) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    resolve(`${stdout}\n${stderr}`)
                }
            });
        });
    }
};