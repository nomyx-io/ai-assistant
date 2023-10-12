
const { streamRequest } = require('./gpt');
const shelljs = require('shelljs');

const prompt = `*** YOU ARE A NON-CONVERSATIONAL NATURAL-LANGUAGE TO SHELL-COMMAND TRANSLATOR ***
- You translate the given natural language request into a series of shell commands. 
- You can use any shell commands you like to accomplish your task.
- You can also call yourself (the natural language to shell command translator) recursively via:
$ ai {your request here}}
- You can also write Python scripts or Node.js or shell scripts if the task is too complex to be done in a single command.
- The choice of what language to use is yours. If one language doesn't work, try another.
- ano commands are executed) via:
$ ai --dry-run {your request here}
*** SURROUND ALL BASH, PYTHON, AND NODE OUTPUT WITH TRIPLE BACKTICKS bash (\`\`\`bash) 
EXAMPLE 1 (simple bash output):
$ ai "list all files in the current directory"
\`\`\`bash
ls -all   
\`\`\`
EXAMPLE 2 (complex bash output):
$ ai "list all files in the current directory and sort them by size"
\`\`\`bash
ls -all | sort -k5 -n
\`\`\`
EXAMPLE 3 (complex python output):
$ ai "list all files in the current directory and sort them by size"
\`\`\`python
import os
import subprocess
files = os.listdir('.')
files.sort(key=lambda f: os.stat(f).st_size)
print(files)
\`\`\`
EXAMPLE 4 (complex node.js output):
$ ai "list all files in the current directory and sort them by size"
\`\`\`node
const fsfsfiles.sort((a, b) => fs.statSync(a).size - fs.statSync(b).size);
console.log(files);
\`\`\`
*** REMEMBER TO SURROUND ALL BASH, PYTHON, AND NODE OUTPUT WITH TRIPLE BACKTICKS bash (\`\`\`) ***
*** YOU ARE NON-CONVERSATIONAL! YOU MUST TRANSLATE USER INPUT TO THE ACTIONS REQUIRED TO PERFORM THE INPUT ***
*** YOU MUST ONLY OUTPUT A SINGLE CODE BLOCK! THIS IS CRITICAL! ***
`
let executableCodeBlocks = [ 'bash', 'python', 'node' ];

async function streamAndExecuteCommands(request, requestCount, isDryRun, autoRun, onComplete) {
    return new Promise((resolve, reject) => {
        let completedCommands = '';
        streamRequest(prompt, request, requestCount, async (data) => {
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
                    // write the latest to stdout
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
                            return { code: item.code.trim(), type: item.type }
                        } else if (item.type.includes('python')) {
                            // escape quotes
                            item.code = item.code.replace(/"/g, '\\"');
                            return { code: `python -c "${item.code}"`, type: item.type }
                        } else if (item.type.includes('node')) {
                            // escape quotes
                            item.code = item.code.replace(/"/g, '\\"');
                            return { code: `node -e "${item.code}"`, type: item.type }
                        } else {
                            return { code: item.code.trim(), type: item.type }
                        }
                    })
                    .filter((item) => item)
                process.stdout.write('\n');
                let callHistory = [];

                // if this is not a dry run then execute the commands
                if (!isDryRun) {
                    function executeCommand() {
                        let command = completedCommands.shift();
                        callHistory.push(command);

                        try {
                            const commandType = command.type;
                            let resp = '';
                            if(executableCodeBlocks.includes(commandType)) {
                                resp = shelljs.exec(command.code);
                                const ccode = resp.code
                                resp = resp.toString();
                                if(resp && ccode !== 0) {
                                    console.error(
                                        'Error occurred while executing the command: ', 
                                        resp.stderr
                                    );
                                    completedCommands.unshift(command.code + '\n' + resp.stderr);
                                } else callHistory.push(resp);
                            } else {
                                resp = command.code;
                                callHistory.push(resp);
                            }                                    
                        } catch (error) {
                            console.error(
                                'Error occurred while executing the command: '
                                , error
                            );
                        }
                        if(completedCommands.length) {
                            return setTimeout(executeCommand, 100); 
                        } 
                        else {
                            // call the oncomplete handler
                            return resolve(onComplete && onComplete(callHistory.join('\n')));
                        }
                    }
                    executeCommand();
                } else {
                    onComplete && onComplete(callHistory.join('\n'));
                    return resolve();
                }
            }
        });
    });
}

module.exports = { streamAndExecuteCommands, prompt };