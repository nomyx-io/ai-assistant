const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

// append the request and response to the history file
function appendToHistory(request, response) {
    const historyFile = path.join(os.homedir(), '.ai_history');
    fs.appendFileSync(historyFile, `${request}\n---\n${response}\n---\n`);
}

// make a request to the OpenAI API and stream the response back
async function streamRequest(system, request, count, onUpdate, onComplete) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            JSON.stringify({
                model: 'gpt-4',
                max_tokens: count,
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
            appendToHistory(request, output);
            onComplete();
        });
        response.data.on('error', (error) => {
            console.error('Error occurred during the stream: ', error);
            onComplete();
        });
    } catch (error) {
        console.error('Error occurred while making the request: ', error);
        throw error;
    }
}

module.exports = { streamRequest };