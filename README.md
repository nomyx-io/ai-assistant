# AI Interpreter

This project implements a conversational AI interpreter / chatbot assistant using Node.js. It allows you to control your machine and execute scripts through natural language commands.

## Overview

The bot uses OpenAI's GPT-3 API to understand text requests and translate them into executable bash, Python, or Node.js scripts.

Key features:

- Natural language understanding
- Converts requests to code
- Executes scripts on your system
- CLI for conversing with bot

Refer to the [tutorial article](https://medium.com/@sschepis/building-a-gpt-driven-chatbot-assistant-ai-interpreter-with-node-js-e7ee29d0c9ec) for a full guide on how this bot is built and how the components fit together.

## Getting Started

### Prerequisites

You'll need:

- Node.js installed
- NPM modules: `axios`, `shelljs`, `cardinal`, `python-shell`, `marked` 
- OpenAI API key 

### Installation

- Clone this repo: `git clone https://github.com/nomyx-io/ai-interpreter.git`
- Navigate into the project: `cd chatbot-assistant`
- Install dependencies: `npm install`
- Create a `.env` file with your OpenAI key:

```
OPENAI_API_KEY=YOUR_KEY_HERE 
```

### Usage

- Start the bot: `node chatbot.js`
- Conversationally make requests: 

```
> List all PNG files ordered by size
> Install package tensorflow
```

Refer to the [article](https://medium.com/@sschepis/building-a-gpt-driven-chatbot-assistant-ai-interpreter-with-node-js-e7ee29d0c9ec) for more details.

## Customizing

See the [Now It's Your Turn](https://medium.com/@sschepis/building-a-gpt-driven-chatbot-assistant-ai-interpreter-with-node-js-e7ee29d0c9ec#now-its-your-turn) section of the tutorial for enhancement ideas like:

- Output formatting
- Authentication
- Visual interface
- Expanding capabilities

Contributions welcome!

## License

This project is open source and available under the [MIT License](LICENSE).
