const shell = require('shelljs');
module.exports = {
    enabled: true,
    tools: {
        run_command: {
            schema: {
                "type": "function",
                "function": {
                    "name": "run_command",
                    "description": "Execute a shell command or script",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "The command to be executed"
                            },
                            "options": {
                                "type": "object",
                                "description": "Optional parameters for command execution"
                            }
                        },
                        "required": ["command"]
                    }
                }
            },
            action: async ({ command, options = {} }: any) => {
                try {
                    const execResult = shell.exec(command, options);
                    if (execResult.code !== 0) {
                        return `Error: ${execResult.stderr}`;
                    }
                    return execResult.stdout;
                } catch (err: any) {
                    return `Execution error: ${err.message}`;
                }
            }
        },
        // Additional tools leveraging different shelljs functionalities can be defined here.
    }
};

export default module.exports;
