#!/usr/bin/env node
require('dotenv').config();

const { cat } = require('shelljs');
const { Assistant, Thread } = require("./assistant");
const { loadPersona } = require("./persona");
const { schemas, funcs, tools } = require("./tools");
const ora = require('ora');
const { threadId } = require('worker_threads');

let request = process.argv.slice(2).join(' ');

let asst = undefined;

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

    let threadId = undefined;
    
    const getAssistant = async (threadId) => {
        if(asst) {
            return asst;
        }
        const assistants = await Assistant.list();        
        const assistant = assistants.find(a => a.name === 'nomyx-assistant');
        if (!assistant) {
            return await Assistant.create(
                'nomyx-assistant', 
                await loadPersona(tools), // Make sure to await the asynchronous loadPersona
                [{"type": "code_interpreter"}, ...schemas], 
             //   'gpt-3.5-turbo-16k',
             'gpt-4',
                threadId
            );
        }
        if(threadId) {
            assistant.thread = await Thread.get(threadId);
        }
        return assistant;
    }
    const assist = await getAssistant(threadId);
    asst = assist;

    const processMessages = async (assistant, request, funcs, schemas, threadId) => {
        assistant = await getAssistant(threadId);
        spinner.start();
        let result;
        try {
            result = await assistant.run(request, funcs, schemas, (event, value) => {
                spinner.text = event;
            });
        } catch (err) {
            spinner.stop();
            if (err.response && err.response.status === 429) {
                console.log('Too many requests, pausing for 30 seconds');
                let result = error.message
                const retryAfter = err.response.headers['retry-after'];
                if (retryAfter) {
                    const retryAfterMs = parseInt(retryAfter) * 1000;
                    result += `... retrying in ${retryAfter} seconds`;
                    await new Promise(resolve => setTimeout(resolve, retryAfterMs));
                }
                return await processMessages(assistant, request, funcs, schemas, threadId);
            }
        }

        spinner.stop();
        console.log('\n' + result + '\n');
        return {
            message: result,
            threadId: assistant.thread.id
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