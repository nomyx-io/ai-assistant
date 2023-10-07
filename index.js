#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');
const shelljs = require('shelljs');
const cardinal = require('cardinal');
const marked = require('marked');

async function streamRequest(system, request, onUpdate, onComplete) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            JSON.stringify({
                model: 'gpt-4',
                max_tokens: 4096,
                temperature: 0.7,
                top_p: 1,
                stream: true,
                messages: [{
                    role: 'system',
                    content: system
                }, {
                    role: 'user',
                    content: request
                }]
            }), {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            responseType: 'stream',
        });
        let output = '';
        response.data.on('data', (chunk) => {
            output += chunk.toString();
            onUpdate(output);
        });
        response.data.on('end', () => {
            onComplete();
        });
        response.data.on('error', (error) => {
            onComplete();
        });
    } catch (error) {
        throw error;
    }
}

const prompt = `*** YOU ARE A NATURAL-LANGUAGE TO SHELL-COMMAND TRANSLATOR ***
- You translate the given natural language request into a series of shell commands. 
- You can use any shell commands you like to accomplish your task.
- You can also call yourself (the natural language to shell command translator) recursively via:
$ ./chat-gpt.js {your request here}}
- You can also write Python scripts or Node.js or shell scripts if the task is too complex to be done in a single command.
- The choice of what language to use is yours. If one language doesn't work, try another.
- You can also perform a dry-run (no commands are executed) via:
$ ./chat-gpt.js --dry-run {your request here}
*** SURROUND ALL BASH, PYTHON, AND NODE OUTPUT WITH TRIPLE BACKTICKS bash (\`\`\`bash) 
EXAMPLE 1 (simple bash output):
$ ./chat-gpt.js "list all files in the current directory"
\`\`\`bash
ls -all   
\`\`\`
EXAMPLE 2 (complex bash output):
$ ./chat-gpt.js "list all files in the current directory and sort them by size"
\`\`\`bash
ls -all | sort -k5 -n
\`\`\`
EXAMPLE 3 (complex python output):
$ ./chat-gpt.js "list all files in the current directory and sort them by size"
\`\`\`python
import os
import subprocess
files = os.listdir('.')
files.sort(key=lambda f: os.stat(f).st_size)
print(files)
\`\`\`
EXAMPLE 4 (complex node.js output):
$ ./chat-gpt.js "list all files in the current directory and sort them by size"
\`\`\`node
const fs = require('fs');
const files = fs.readdirSync('.');
files.sort((a, b) => fs.statSync(a).size - fs.statSync(b).size);
console.log(files);
\`\`\`
*** REMEMBER TO SURROUND ALL BASH, PYTHON, AND NODE OUTPUT WITH TRIPLE BACKTICKS bash (\`\`\`) ***
*** YOUR OUTPUT IS EXECUTED ONE CODE BLOCK AT A TIME. PREFER PYTHON FOR FILE UPDATES ***
`
// get the request from the command line
const request = process.argv.slice(2).join(' ');

// if the request contains --dry-run,
let isDryRun = false;
if (request.includes('--dry-run')) {
    isDryRun = true;
    request = request.replace('--dry-run', '');
}

function streamAndExecuteCommands(request, onComplete) {
    let completedCommands = '';
    streamRequest(prompt, request, async (data) => {
        // slice off  the first five characters
        // to remove the prompt
        data = data.split('\n')
            .map((item) => item.slice(5))
            .filter((item) => item.trim() !== '[DONE]')
            .map((item) => {
                try {
                    return JSON.parse(item)
                } catch (error) { return null }
            })
            .map((item) => item && item.choices[0].delta.content)
            .filter((item) => item);

        if (data) {
            const latest = data[data.length - 1];
            if (latest) {
                completedCommands += latest;
                process.stdout.write(latest);
            }
        }
    }, () => {
        if (completedCommands) {
            // parse the commands into a list of blocks. ignore anything outside of the blocks
            // pparse the block type (bash, python, node.js)
            // execute the blocks in order
            completedCommands = completedCommands.split('```')
                .filter((item) => item.trim())
                .map((item) => {
                    const lines = item.split('\n');
                    const type = lines[0].trim();
                    const code = lines.slice(1).join('\n');
                    return { type, code };
                })
                .map((item) => {
                    if (item.type.includes('bash')) {
                        return item.code.trim();
                    } else if (item.type.includes('python')) {
                        return `python -c "${item.code}"`;
                    } else if (item.type.includes('node')) {
                        return `node -e "${item.code}"`;
                    }
                })
                .filter((item) => item)
            process.stdout.write('\n');
            let callHistory = [];
            if (!isDryRun) {
                while(completedCommands.length) {
                    let item = completedCommands.shift();
                    callHistory.push(item);
                    const resp = shelljs.exec(item);
                    callHistory.push(resp.toString());
                    if(resp.code !== 0) {
                       completedCommands.push('./chat-gpt.js "' + callHistory.join('\\\n') + '"');
                    }
                }
            }
            onComplete && onComplete(callHistory.join('\n'));
        }
    });
}

// Keep track of last 64 tokens
const windowSize = 64;
let lastTokens = [];

// Helper to tokenize into words
function tokenize(text) {
    return text.split(/\s+/);
}

function getAvgTokenLength(text) {
    const tokens = tokenize(text);
    lastTokens = lastTokens.concat(tokens);
    if (lastTokens.length > windowSize) {
        lastTokens = lastTokens.slice(-windowSize);
    }
    const avgLength = lastTokens.reduce((sum, t) => sum + t.length, 0) / lastTokens.length;
    return avgLength;
}

function countTokens(text) {
    const minTokenLength = 3.5;
    const tokenPadding = 0.15; // 15% padding
    // Calculate sliding window average
    const avgTokenLength = getAvgTokenLength(text);
    const adjustedAvg = Math.max(minTokenLength, avgTokenLength);
    const numTokens = Math.floor(text.length / adjustedAvg) * (1 + tokenPadding);
    return numTokens;
}

const maxTokens = 8192;

function splitString(text) {
    let chunks = text.split('---');
    while (countTokens(chunks.join('---')) > maxTokens) {
        // Remove second element 
        chunks.splice(1, 1);
    }
    // Add ellipsis 
    chunks.splice(1, 0, '...');
    // Join back together
    const shortenedText = chunks.join('---');
    return shortenedText;
}

let history = [];
if (request) {
    streamAndExecuteCommands(request);
} else {
    // if no request is given, start a chat session
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.setPrompt('> ');
    rl.prompt();
    rl.on('line', (request) => {
        history.push(request);
        const shortenedText = splitString(history.join('\n') + request);
        streamAndExecuteCommands(shortenedText, (callHistory) => {
            history.push(callHistory);
            history.push('---');
            rl.prompt();
        });
    }).on('close', () => {
        process.exit(0);
    });
}
