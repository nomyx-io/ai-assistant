#!/usr/bin/env node
require('dotenv').config();

const { message } = require('blessed');
const { Assistant } = require("./agent/assistant");
// eslint-disable-next-line no-unused-vars
const { schemas, funcs, tools } = require("./agent/tools");
const ora = require('ora');

const spinner = ora({
  spinner: {
    interval: 100,
    frames: [
      '⠋',
      '⠙',
      '⠹',
      '⠸',
      '⠼',
      '⠴',
      '⠦',
      '⠧',
      '⠇',
      '⠏'
    ]
  },
  text: 'Loading'
})

let request = process.argv.slice(2).join(' ');

let isDryRun = false;
if (request.includes('--dry-run')) {
    isDryRun = true;
    request = request.replace('--dry-run', '').trim();
}

let autoRun = false;
if (request.includes('--auto-run')) {
    autoRun = true;
    request = request.replace('--auto-run', '').trim();
}


function runAIAssistantConfiguration() {
    return {
        schema: {
            type: "function",
            function: {
                name: "runAIAssistant",
                description: "Run a natural language command using an AI assistant",
                parameters: {
                    type: "object",
                    properties: {
                        ai: {
                            type: "string",
                            description: "The natural language command to run"
                        }
                    },
                    required: ["ai"]
                }
            }
        },
        function: async ({ ai }) => {
            const assistants = await Assistant.list();
            let assistant = assistants.find(a => a.name === 'nomyx-assistant');
            if (!assistant) {
                assistant = await Assistant.create(
                    'nomyx-assistant', 
                    await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                    funcs, 
                    'gpt-4-1106-preview'
                );
            }
            const response = await assistant.run(ai);
            return response.content;
        },
        description: "run a natural language command using an AI assistant"
    }
}


async function loadPersona(tools) {
    let persona_out = [`You are an advanced, sophisticated AI assistant capable of performing any coding or file related task. 
You are enhanced with a number of tooling functions which give you a flexible interface to the underlying system, allowing you to act:`]
    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]
        if(Object.keys(tool).length === 0) {
            continue
        }
        const tool_name = tool.schema.function.name
        const description = tool.schema.function.description
        const tool_description = `- You can ${description} using the ${tool_name} function.`
        persona_out.push(tool_description)
    }
    const config = runAIAssistantConfiguration()
    const description = config.description
    persona_out.push(`- You can ${description} using the ${config.schema.function.name} function.`)
    persona_out.push(`Examine the available tooling carefully, then perform the following task to the best of your ability using the available tooling.`)
    return persona_out.join("\n") + '\n'
}


async function processCommand() {
    const getAssistant = async (threadId) => {
        const assistants = await Assistant.list();
        let assistant = assistants.find(a => a.name === 'nomyx-assistant');
        if (!assistant) {
            assistant = await Assistant.create(
                'nomyx-assistant', 
                await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                schemas, 
                'gpt-4-1106-preview'
            );
        } else {
            assistant = await Assistant.get(assistant.id, threadId);
        }
        return assistant;
    }

    let assistant = await getAssistant();
    const processMessages = async (assistant, request, funcs, schemas) => {
        assistant = await getAssistant();
        const result = await assistant.run(request, funcs, schemas, (event, value) => {
            spinner.text = event;
        });
        console.log(result);
        return {
            message: result,
            threadId: assistant.threadId
        }
    }

    let messageResults = null;
    if (request) {
        try {
            if (isDryRun) {
                console.log("Dry run - your input:", request);
                // Handle a dry run where you don't actually send the request, just simulate it
            } else {
                const threadId = assistant['threadId'] ? assistant['threadId'] : null;
                spinner.start();
                messageResults = await processMessages(assistant, request, funcs, schemas, threadId);
                spinner.stop();
            }
        } catch (err) { 
            console.error(err); 
        }
    } else {
        // If no request is given, start a chat session
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.setPrompt('> ');
        rl.prompt();
        rl.on('line', async (request) => {
            try {
                const threadId = assistant['threadId'] ? assistant['threadId'] : null;
                spinner.start();
                messageResults = await processMessages(assistant, request, funcs, schemas, threadId);
                spinner.stop();
                rl.prompt(request, funcs, schemas);
            } catch (err) {
                console.error(err);
                rl.prompt();
            }
        });
    }
}
processCommand();