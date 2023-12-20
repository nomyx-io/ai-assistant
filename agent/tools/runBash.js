const shell = require('shelljs');
const { highlight } = require('cli-highlight');

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
        return new Promise((resolve, reject) => {
            console.log(`Running ${command}`);
            shell.exec(command, { silent: true }, (code, stdout, stderr) => {
    
                if (code === 0) {
                    console.log(highlight(stdout, { language: 'bash', ignoreIllegals: true }))
                    resolve(stdout);
                } else {
                    console.log(stderr);
                    resolve(`${stdout}\n${stderr}`)
                }
            });
        });
    }
}