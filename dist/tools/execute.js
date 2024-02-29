"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute_python_file = exports.execute_nodejs_file = exports.execute_python_code = exports.execute_tsnodejs_code = exports.execute_nodejs_code = exports.execute_bash = void 0;
const path = require('path');
const fs = require('fs').promises;
const execute_bash = ({ command }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        console.log('\n' + command);
        const { exec } = require('child_process');
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve(error.message);
            }
            else if (stderr) {
                resolve(stderr);
            }
            else {
                resolve(stdout);
            }
        });
    });
});
exports.execute_bash = execute_bash;
const execute_nodejs_code = ({ js }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFile(fileName, js)
                .then(() => {
                exec(`node ${fileName}`, ((error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
                    yield fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    }
                    else if (stderr) {
                        resolve(stderr);
                    }
                    else {
                        resolve(JSON.stringify(stdout));
                    }
                })));
            });
        }
        catch (err) {
            resolve(err.message);
        }
    });
});
exports.execute_nodejs_code = execute_nodejs_code;
const execute_tsnodejs_code = ({ js }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".js");
            fs.writeFile(fileName, js)
                .then(() => {
                exec(`ts-node ${fileName}`, ((error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
                    yield fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    }
                    else if (stderr) {
                        resolve(stderr);
                    }
                    else {
                        resolve(JSON.stringify(stdout));
                    }
                })));
            });
        }
        catch (err) {
            resolve(err.message);
        }
    });
});
exports.execute_tsnodejs_code = execute_tsnodejs_code;
const execute_python_code = ({ python }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, _reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = path.join(__dirname, new Date().getTime() + ".py");
            fs.writeFile(fileName, python)
                .then(() => {
                exec(`python ${fileName}`, (error, stdout, stderr) => __awaiter(void 0, void 0, void 0, function* () {
                    yield fs.unlink(fileName);
                    if (error) {
                        resolve(error.message);
                    }
                    else if (stderr) {
                        resolve(JSON.stringify(stderr));
                    }
                    else {
                        resolve(JSON.stringify(stdout));
                    }
                }));
            });
        }
        catch (err) {
            resolve(err.message);
        }
    });
});
exports.execute_python_code = execute_python_code;
const execute_nodejs_file = ({ file }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = !path.isAbsolute(file) ? path.join(__dirname, file) : file;
            exec(`node ${fileName}`, ((error, stdout, stderr) => {
                if (error) {
                    resolve(error.message);
                }
                else if (stderr) {
                    resolve(stderr);
                }
                else {
                    resolve(stdout);
                }
            }));
        }
        catch (err) {
            resolve(err.message);
        }
    });
});
exports.execute_nodejs_file = execute_nodejs_file;
const execute_python_file = ({ file }) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, _reject) => {
        const { exec } = require('child_process');
        try {
            const fileName = !path.isAbsolute(file) ? path.join(__dirname, file) : file;
            exec(`python ${fileName}`, (error, stdout, stderr) => {
                if (error) {
                    resolve(error.message);
                }
                else if (stderr) {
                    resolve(stderr);
                }
                else {
                    resolve(stdout);
                }
            });
        }
        catch (err) {
            resolve(err.message);
        }
    });
});
exports.execute_python_file = execute_python_file;
module.exports = {
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
            action: exports.execute_bash,
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
            action: ({ file }) => __awaiter(void 0, void 0, void 0, function* () {
                const ext = file.split('.').pop();
                if (ext === 'js') {
                    return (0, exports.execute_nodejs_file)({ file });
                }
                else if (ext === 'ts') {
                    return (0, exports.execute_nodejs_file)({ file });
                }
                else if (ext === 'py') {
                    return (0, exports.execute_python_file)({ file });
                }
                else {
                    return 'Unsupported file type';
                }
            }),
        },
        execute_code: {
            schema: {
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
            action: ({ code, language }) => __awaiter(void 0, void 0, void 0, function* () {
                if (language === 'bash') {
                    return (0, exports.execute_bash)({ command: code });
                }
                else if (language === 'python') {
                    return (0, exports.execute_python_code)({ python: code });
                }
                else if (language === 'javascript') {
                    return (0, exports.execute_nodejs_code)({ js: code });
                }
                else if (language === 'typescript') {
                    return (0, exports.execute_tsnodejs_code)({ js: code });
                }
                else {
                    return 'Unsupported language';
                }
            }),
        }
    }
};
exports.default = module.exports;
