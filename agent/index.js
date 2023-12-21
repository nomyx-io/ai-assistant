#!/usr/bin/env node
require('dotenv').config();

const { Assistant } = require("./assistant");
const { loadPersona } = require("./persona");
const { schemas, funcs, tools } = require("./tools");
const ora = require('ora');
const { threadId } = require('worker_threads');

let request = process.argv.slice(2).join(' ');

let asst = null

async function processCommand() {
    // create the spinner
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
    const getAssistant = async (threadId) => {

        const assistants = await Assistant.list();        
        let assistant = assistants.find(a => a.name === 'nomyx-assistant');
        if (!assistant) {
            assistant = await Assistant.create(
                'nomyx-assistant', 
                await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                [{"type": "code_interpreter"}, ...schemas], 
                'gpt-4-1106-preview',
                threadId
            );
        }
        return assistant;
    }

    let threadId = undefined;
    asst = await getAssistant(threadId);
    
    const processMessages = async (assistant, request, funcs, schemas, threadId) => {
        assistant = await getAssistant(threadId);
        spinner.start();
        const result = await assistant.run(request, funcs, schemas, (event, value) => {
            spinner.text = event;
        });
        spinner.stop();
        console.log('\n' + result + '\n');
        return {
            message: result,
            threadId: assistant.threadId
        }
    }

    if (request) {
        try {
            const messageResults = await processMessages(asst, request, funcs, schemas, threadId);
            threadId = messageResults['threadId'];
        } catch (err) { 
            console.error(err); 
        }
    } else {
        // If no request is given, start a chat session
        const readline = require('readline');
        const processLine = async () => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.setPrompt('> ');
            rl.prompt();
            rl.on('line', async (request) => {
                try {
                    const messageResults = await processMessages(asst, request, funcs, schemas, threadId);
                    threadId = messageResults['threadId'];
                    rl.close();
                    await processLine();
                } catch (err) {
                    console.error(err);
                    rl.close();
                    await processLine();
                }
            });
        }
        await processLine();
    }
}
processCommand();