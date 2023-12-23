const shell = require('shelljs');
const { highlight } = require('cli-highlight');

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'run_bash_command',
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
            shell.exec(command, { silent: true }, (code, stdout, stderr) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    resolve(`${stdout}\n${stderr}`)
                }
            });
        });
    }
}