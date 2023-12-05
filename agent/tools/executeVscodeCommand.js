const vscode = require('vscode');
module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'executeVscodeCommand',
            description: 'execute a VS Code command using the given arguments',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The VS Code command to execute.'
                    },
                    arguments: {
                        type: 'array',
                        description: 'An array of arguments for the command.',
                        items: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                },
                required: ['command']
            }
        },
    },
    function: async ({ command, arguments = [] }) => {
        try {
            const result = await vscode.commands.executeCommand(command, ...arguments);
            return result || "Command executed successfully."
        } catch (err) {
            return err.message;
        }
    }
};

