
const execute_bash = async ({ command }: any) => {
    return new Promise((resolve, reject) => {
        const shell = require('shelljs');
        shell.exec(command, { silent: true }, (code: any, stdout: any, stderr: any) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                
                resolve(`${stdout}\n${stderr}`)
            }
        });
    });
}

const execute_nodejs_code = async ({ js }: any) => {
    return new Promise((resolve, reject) => {
        const path = require('path');
        const fs = require('fs');
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFileSync(fileName, js);
            exec(`node ${fileName}`, ((error: any, stdout: any, stderr: any) => {
                fs.unlinkSync(fileName);
                if (error) {
                    resolve(error.message);
                } else if (stderr) {
                    resolve(stderr);
                } else {
                    resolve(JSON.stringify(stdout));
                }
            } ));
        } catch (err: any) {
            resolve(err.message);
        }
    });
}

const execute_tsnodejs_code = async ({ js }: any) => {
    return new Promise((resolve, reject) => {
        const path = require('path');
        const fs = require('fs');
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFileSync(fileName, js);
            exec(`ts-node ${fileName}`, ((error: any, stdout: any, stderr: any) => {
                fs.unlinkSync(fileName);
                if (error) {
                    resolve(error.message);
                } else if (stderr) {
                    resolve(stderr);
                } else {
                    resolve(JSON.stringify(stdout));
                }
            } ));
        } catch (err: any) {
            resolve(err.message);
        }
    });
}

const execute_python_code = async ({ python }: any) => {
    return new Promise((resolve, _reject) => {
        const path = require('path');
        const fs = require('fs');
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".py");
            fs.writeFileSync(fileName, python);
            exec(`python ${fileName}`, (error: any, stdout: any, stderr: any) => {
                fs.unlinkSync(fileName);
                if (error) {
                    resolve(error.message);
                } else if (stderr) {
                    resolve(JSON.stringify(stderr));
                } else {
                    resolve(JSON.stringify(stdout));
                }
            });
        } catch (err: any) {
            resolve(err.message);
        }
    });
}

const execute_nodejs_file = async ({ file }: any) => {
    return new Promise((resolve, reject) => {
        const path = require('path');
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, file);
            exec(`node ${fileName}`, ((error: any, stdout: any, stderr: any) => {
                if (error) {
                    resolve(error.message);
                } else if (stderr) {
                    resolve(stderr);
                } else {
                    resolve(stdout);
                }
            } ));
        } catch (err: any) {
            resolve(err.message);
        }
    });
}

const execute_python_file = async ({ file }: any) => {
    return new Promise((resolve, _reject) => {
        const path = require('path');
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, file);
            exec(`python ${fileName}`, (error: any, stdout: any, stderr: any) => {
                if (error) {
                    resolve(error.message);
                } else if (stderr) {
                    resolve(stderr);
                } else {
                    resolve(stdout);
                }
            });
        } catch (err: any) {
            resolve(err.message);
        }
    });
}

module.exports = {
    schemas: [{
        type: 'function',
        function: {
            name: 'execute_bash',
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
    },{
        type: "function",
        function: {
            name: "execute_file",
            description: "execute a file containing Typescript, Javascript, or Python code and return the result",
            parameters: {
                type: "object",
                properties: {
                    file: {
                        type: "string",
                        description: "Source code file to execute"
                    }
                },
                required: ["file"]
            }
        }
    }, {
        type: "function",
        function: {
            name: "execute_code",
            description: "execute a code snippet in a specific language and return the result",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "Code snippet to execute"
                    },
                    language: {
                        type: "string",
                        description: "Language of the code snippet. Can be bash, python, javascript or typescript"
                    }
                },
                required: ["code", "language"]
            }
        }
    }],
    tools: {
        execute_bash,
        execute_file: async ({ file }: any) => {
            const ext = file.split('.').pop();
            if (ext === 'js') {
                return execute_nodejs_file({ file });
            } else if (ext === 'ts') {
                return execute_nodejs_file({ file });
            } else if (ext === 'py') {
                return execute_python_file({ file });
            } else {
                return 'Unsupported file type';
            }
        },
        execute_code: async ({ code, language }: any) => {
            if (language === 'bash') {
                return execute_bash({ command: code });
            } else if (language === 'python') {
                return execute_python_code({ python: code });
            } else if (language === 'javascript') {
                return execute_nodejs_code({ js: code });
            } else if (language === 'typescript') {
                return execute_tsnodejs_code({ js: code });
            } else {
                return 'Unsupported language';
            }
        }
    }
}