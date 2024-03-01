const path = require('path');
const fs = require('fs').promises;

export const execute_bash = async ({ command }: any) => {
    return new Promise((resolve, reject) => {
        console.log('\n'+command);
        const { exec } = require('child_process');
        exec(command, (error: any, stdout: any, stderr: any) => {
            if (error) {
                resolve(error.message);
            } else if (stderr) {
                resolve(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}


export const execute_nodejs_code = async ({ js }: any) => {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js")
            fs.writeFile(fileName, js)
            .then(() => {
                exec(`node ${fileName}`, ( async (error: any, stdout: any, stderr: any) => {
                    await fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    } else if (stderr) {
                        resolve(stderr);
                    } else {
                        resolve(JSON.stringify(stdout));
                    }
                } ));
            });

        } catch (err: any) {
            resolve(err.message);
        }
    });
}


export const execute_tsnodejs_code = async ({ js }: any) => {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFile(fileName, js)
                .then(() => {
                exec(`ts-node ${fileName}`, (async (error: any, stdout: any, stderr: any) => {
                    await fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    } else if (stderr) {
                        resolve(stderr);
                    } else {
                        resolve(JSON.stringify(stdout));
                    }
                } ));
            });
        } catch (err: any) {
            resolve(err.message);
        }
    });
}


export const execute_python_code = async ({ python }: any) => {
    return new Promise((resolve, _reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".py");
            fs.writeFile(fileName, python)
            .then(() => {
                exec(`python ${fileName}`, async (error: any, stdout: any, stderr: any) => {
                    await fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    } else if (stderr) {
                        resolve(JSON.stringify(stderr));
                    } else {
                        resolve(JSON.stringify(stdout));
                    }
                });
            });
        } catch (err: any) {
            resolve(err.message);
        }
    });
}


export const execute_nodejs_file = async ({ file }: any) => {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = !path.isAbsolute(file) ? path.join(__dirname, file) : file;
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


export const execute_python_file = async ({ file }: any) => {
    return new Promise((resolve, _reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = !path.isAbsolute(file) ? path.join(__dirname, file) : file;
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
    enabled: true,
    tools: {
        execute_bash: {
            schema: {
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
            },
            action: execute_bash,
        },
        execute_file: {
            schema: {
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
            },
            action:  async ({ file }: any) => {
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
        },
        execute_code: {
            schema:  {
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
            },
            action: async ({ code, language }: any) => {
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
            },
        }
    }
}
export default module.exports;