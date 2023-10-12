#!/usr/bin/env node
const hljs = require("highlight.js");
const marked = require("marked");
const blessed = require("blessed");

let syntaxHighlightMode = false;
let syntaxHighlightString = "";
let language = "";
let codeTypeDetected = false;

function highlightSyntax(code, language) {
    return hljs.highlight(language, code).value;
}

function replaceLines(n) {
    let screen = blessed.screen();
    for (let i = 0; i < n; i++) {
        screen.alea.moveCursor(0, -1);
        screen.alea.clearLine(0);
    }
    screen.render();
}

require('dotenv').config();

const { streamAndExecuteCommands, prompt } = require('./executor');

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
const maxTokens = 8042;
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

function maybeShortenString(text) {
    let chunks = text.split('---');
    while (countTokens(chunks.join('---')) > maxTokens) {
        // Remove second element 
        chunks.splice(1, 1);
    }
    // Add ellipsis 
    chunks.splice(1, 0, '...');
    return chunks.join('---');
}
let history = [];

async function processCommand() {
    if (request) {
        const shortenedText = maybeShortenString(request);
        const shortenedCount = ~~countTokens(prompt + shortenedText)

        if (shortenedCount > maxTokens) {
            console.error(`Your request is too long. It has ${shortenedCount} tokens, but the maximum is ${maxTokens} tokens.`);
            rl.prompt();
        } else
            streamAndExecuteCommands(request, maxTokens - shortenedCount, isDryRun, autoRun, (callHistory) => {
                process.stdout.write(callHistory);
                process.stdout.write('\n');
                process.exit(0);
            });

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
            history.push(request);
            const shortenedText = maybeShortenString(history.join('\n') + request);
            const shortenedCount = ~~countTokens(prompt + shortenedText)
            if (shortenedCount > maxTokens) {
                console.error(`Your request is too long. It has ${shortenedCount} tokens, but the maximum is ${maxTokens} tokens.`);

            } else
                await streamAndExecuteCommands(shortenedText, maxTokens - shortenedCount, isDryRun, autoRun, async (callHistory) => {
                    history.push(callHistory);
                    history.push('---');
                    rl.prompt();
                });
        })
    }
}
processCommand();
