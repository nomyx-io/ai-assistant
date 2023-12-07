#!/usr/bin/env node
const hljs = require("highlight.js");
const marked = require("marked");
const blessed = require("blessed");
const { runAIAssistant } = require("./agent/agent");
const { exec } = require('child_process');
const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const readdirAsync = fs.promises.readdir;
const readFileAsync = fs.promises.readFile;

const highlight = require('cli-highlight').highlight

let syntaxHighlightMode = false;
let syntaxHighlightString = "";
let language = "";
let codeTypeDetected = false;


const tools = [
    {
        schema: {
            type: 'function',
            function: {
                name: 'visitPage',
                description: 'return the contents of a web page given an URL',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL of the webpage to visit'
                        }
                    },
                    required: ['url']
                }
            },
        },
        function: async ({ url }) => {
            try {
                const response = await axios.get(url);
                const dom = new JSDOM(response.data);
                const content = dom.window.document.body.textContent;
                return content;
            } catch (error) {
                throw new Error(`Error visiting ${url}: ${error.message}`);
            }
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'changeHomeDirectory',
                description: 'change the default directory of the agent. All subsequent actions will be relative to this directory',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the directory.'
                        },
                    },
                    required: ['path']
                }
            },
        },
        function: async ({ path }) => {
            try {
                console.log(`Changing home directory to ${path}`);
                os.chdir(path);
                console.log(`new path: ${path}`);
                return `new path: ${path}`;
            } catch (error) {
                return `Error calling chdir: ${error}`;
            }
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'callAPI',
                description: 'make an API call at the given url using the given request method with given request params and return the response',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to call.'
                        },
                        method: {
                            type: 'string',
                            description: 'The HTTP method to use.'
                        },
                        request_params: {
                            type: 'object',
                            description: 'The request parameters to send.',
                            additionalProperties: true
                        }
                    },
                    required: ['url', 'method']
                }
            },
        },
        function: async ({ url, method, request_params = {} }) => {
            try {
                console.log(`Calling ${url} with method ${method} and params ${JSON.stringify(request_params)}`);
                const response = await axios({ method, url, data: request_params });
                const ret = JSON.stringify(response.data);
                console.log(`Response: ${ret}`);
                return ret;
            } catch (error) {
                return `Error calling ${url}: ${error.message}`
            }
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'createAppendOverwriteFile',
                description: 'create, append to, or overwrite a file in the given folder with the given name and content',
                parameters: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'The directory in which to create the file'
                        },
                        fileName: {
                            type: 'string',
                            description: 'The name of the file to create'
                        },
                        content: {
                            type: 'string',
                            description: 'Initial content of the file',
                            default: ''
                        },
                        append: {
                            type: 'boolean',
                            description: 'Flag to append to the file (default: false)',
                            default: false
                        }
                    },
                    required: ['directory', 'fileName']
                }
            },
        },
        function: async ({ directory, fileName, content = '', append = false }) => {
            const filePath = path.join(directory, fileName);
            return new Promise((resolve, reject) => {
                if (append) {
                    console.log(`Appending to ${filePath}`);
                    fs.appendFile(filePath, content, 'utf8', (err) => {
                        if (err) {
                            reject(`Error appending to ${filePath}: ${err.message}`);
                        } else {
                            resolve(`Successfully appended to ${filePath}`);
                        }
                    });
                } else {
                    console.log(`Creating ${filePath}`);
                    fs.writeFile(filePath, content, 'utf8', (err) => {
                        if (err) {
                            reject(`Error creating ${filePath}: ${err.message}`);
                        } else {
                            resolve(`Successfully created ${filePath}`);
                        }
                    });
                }
            });
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'deleteFile',
                description: 'delete a file at the given path',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path of the file to delete'
                        }
                    },
                    required: ['path']
                }
            },
        },
        function: async ({ path }) => {
            return new Promise((resolve, reject) => {
                console.log(`Deleting ${path}`);
                fs.unlink(path, (err) => {
                    if (err) {
                        console.log(`Error deleting ${path}: ${err.message}`);
                        reject(`Error deleting ${path}: ${err.message}`);
                    } else {
                        console.log(`Successfully deleted ${path}`);
                        resolve(`Successfully deleted ${path}`);
                    }
                });
            });
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'listFiles',
                description: 'Lists files in a directory',
                parameters: {
                    type: 'object',
                    properties: {
                        directory: {
                            type: 'string',
                            description: 'The directory to list files from'
                        }
                    },
                    required: ['directory']
                }
            },
        },
        function: async ({ directory }) => {
            try {
                console.log(`Listing files in ${directory}`);
                const files = await readdirAsync(directory);
                const fils = JSON.stringify(files);
                console.log(`Files in ${directory}:\n${fils}`);
                return fils;
            } catch (err) {
                console.log(`Error listing files in ${directory}: ${err.message}`);
                return JSON.stringify(err.message);
            }
        }
    },
    {
        schema: {
            type: 'function',
            function: {
                name: 'readFile',
                description: 'read the content of the file at the given path',
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path of the file to read'
                        }
                    },
                    required: ['path']
                }
            },
        },
        function: async ({ path }) => {
            try {
                console.log(`Reading ${path}`);
                const ret = await readFileAsync(path, { encoding: 'utf8' });
                console.log(`Content of ${path}:\n${ret}`);
                return ret;
            } catch (err) {
                console.log(`Error reading ${path}: ${err.message}`);
                return `Error reading ${path}: ${err.message}`
            }
        }
    },
    {
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
    },
    {
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
    }, {
        schema: {
            type: "function",
            function: {
                name: "runPython",
                description: "execute arbitrary Python code and return the result",
                parameters: {
                    type: "object",
                    properties: {
                        python: {
                            type: "string",
                            description: "Python code to run"
                        }
                    },
                    required: ["python"]
                }
            }
        },
        function: async ({ python }) => {
            return new Promise((resolve, _reject) => {
                try {
                    const fileName = path.join(__dirname, new Date().getTime() + ".py");
                    fs.writeFileSync(fileName, python);
                    console.log(hljs.highlight('python', python).value)
                    exec(`python ${fileName}`, (error, stdout, stderr) => {
                        fs.unlinkSync(fileName);
                        if (error) {
                            console.log(error.message)
                            resolve(error.message);
                        } else if (stderr) {
                            console.log(stderr)
                            resolve(JSON.stringify(stderr));
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
    },
    {
        schema: {
            type: "function",
            function: {
                name: "searchGoogle",
                description: "perform a google search using the given query",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The query to search for"
                        }
                    },
                    required: ["query"]
                }
            }
        },
        function: async ({ query }) => {
            try {
                console.log(`Searching Google for ${query}`);
                let config_api_key = process.env.GOOGLE_API_KEY;
                let config_cx =  process.env.GOOGLE_CX_ID;
                const response = await
                    axios.get(`https://www.googleapis.com/customsearch/v1?key=${config_api_key}&cx=${config_cx}&q=${query}`);
                const results = response.data.items.map(item => ({
                    title: item.title,
                    link: item.link
                }));
                const res = JSON.stringify(results);
                console.log(`Results:\n${res}`);
                return res;
            } catch (error) {
                console.log(`Error searching Google for ${query}: ${error.message}`);
                return error.message;
            }
        }
    }
]

function replaceLines(n) {
    let screen = blessed.screen();
    for (let i = 0; i < n; i++) {
        screen.alea.moveCursor(0, -1);
        screen.alea.clearLine(0);
    }
    screen.render();
}

require('dotenv').config();

// get the request from the command line
const request = process.argv.slice(2).join(' ');

// if the request contains --dry-run,
let isDryRun = false;
if (request.includes('--dry-run')) {
    isDryRun = true;
    request = request.replace('--dry-run', '');
}

// if the request contains --auto-run,
let autoRun = false;
if (request.includes('--auto-run')) {
    autoRun = true;
    request = request.replace('--auto-run', '');
}

// Keep track of last 64 tokens
const maxTokens = 8002;
const windowSize = 64;
let lastTokens = [];

// Helper to tokenize into words
function tokenize(text) {
    return text.split(/\s+/);
}

// Helper to get average token length
function getAvgTokenLength(text) {
    const tokens = tokenize(text);
    lastTokens = lastTokens.concat(tokens);
    if (lastTokens.length > windowSize) {
        lastTokens = lastTokens.slice(-windowSize);
    }
    return lastTokens.reduce((sum, t) => sum + t.length, 0) / lastTokens.length;
}

// Helper to count tokens
function countTokens(text) {
    const minTokenLength = 5;
    const tokenPadding = 0.5; // 15% padding
    // Calculate sliding window average
    const avgTokenLength = getAvgTokenLength(text);
    const adjustedAvg = Math.max(minTokenLength, avgTokenLength);
    return Math.floor(text.length / adjustedAvg) * (1 + tokenPadding);
}

let history = [];

async function processCommand() {
    if (request) {
        const shortenedText = request;
        const shortenedCount = ~~countTokens(shortenedText)

        if (shortenedCount > maxTokens) {
            console.error(`Your request is too long. It has ${shortenedCount} tokens, but the maximum is ${maxTokens} tokens.`);
            rl.prompt();
        } else
            try {
                const _req = {
                    ai: request,
                    apiKey: process.env.OPENAI_API_KEY,
                    tooling: tools
                }
                if (history.length > 0) {
                    _req.history = history;
                }
                runAIAssistant(_req).then((callHistory) => {
                    history = callHistory
                    const latestMessage = callHistory[callHistory.length - 1].content;
                    process.stdout.write(latestMessage);
                    process.stdout.write('\n');
                    process.exit(0);
                });
            } catch (err) { console.error(err); }

    } else {
        // if no request is given, start a chat session
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.setPrompt('> ');
        rl.prompt();
        rl.on('line', async (request) => {
            try {
                const ai = async () => {
                    let _req = {
                        ai: request,
                        apiKey: process.env.OPENAI_API_KEY,
                        tooling: tools
                    }
                    if (history && history.length > 0) {
                        _req.history = history;
                    }
                    runAIAssistant(_req).then((callHistory) => {
                        history = callHistory
                        let latestMessage = callHistory[callHistory.length - 1].content;
                        process.stdout.write(latestMessage + '\n');
    
                        const pro = `Examine the chat messages in this conversation immediately prior to this message. Compare the messages against the original query given by the user: "${history[1].content}" Now, determine if the original query has been completed in this conversation.  If the original query has been completed, ** RESPOND WITH "done" AND ONLY WITH "done" **.  If more information is being requested, respond with most appropriate or default answer.  If the message is asking for a confirmation, respond with "yes" or "no".  If the message is conversational, provide an appropriate response.`
                        _req = {
                            ai: pro,
                            history: callHistory,
                            apiKey: process.env.OPENAI_API_KEY,
                            tooling: tools
                        }
                        return runAIAssistant(_req).then((callHistory) => {
                            latestMessage = callHistory[callHistory.length - 1].content;
                            if(latestMessage.toLowerCase().includes('done')) {
                                return rl.prompt();
                            } else {
                                callHistory.pop();
                                callHistory.push({ content : latestMessage, role: 'assistant' })
                                history = callHistory;
                                return ai();
                            }
                        })
                    });
                }
                return await ai()

            } catch (err) { console.error(err); }
        })
    }
}
processCommand();
