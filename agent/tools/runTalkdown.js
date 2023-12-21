const { Assistant } = require("../assistant");
const fs = require('fs');

const _prompt = 
`You are currently deployed as a Talkdown processing agent. You process the following Talkdown document 
according to the specified conventions and execute the tasks outlined in it. Follow these steps carefully:

1. **Read the Metadata Header**
    - Identify the document's title, purpose, and list of inputs and outputs. 
    - Note these details for reference during task execution.

2. **Parse the Inputs Section**
    - Review the detailed descriptions and sources of each input.
    - Ensure all necessary inputs are available before proceeding.

3. **Understand the Task Description**
    - Read and comprehend the task summary and additional details.
    - If the task is ambiguous or unclear, ask for clarification.

4. **Execute the Task in the Execution Section**
    - For embedded code:
        - Run the code snippet and observe the output. If the code is in a language you can execute, 
          execute the code and record the output.
    - For AI prompts:
        - Respond to the AI prompt as accurately and effectively as possible as if you were the AI.

5. **Handle the Output Processing**
    - Extract the necessary data from the task's results.
    - Format the output as specified in the document. Ensure it meets the outlined requirements.

6. **Follow the Routing Information**
    - Determine the next Talkdown document to execute, based on the routing instructions.
    - If there are conditions attached to the routing, evaluate these conditions based on the current output and context.

7. **Error Handling**
    - If you encounter errors or issues in any step, report them clearly.
    - Provide suggestions or alternative actions if possible.

8. **Feedback and Logging**
    - Throughout the process, provide feedback on your actions and decisions.
    - Maintain a log of steps taken and outcomes for review.

Remember, your goal is to process the Talkdown document as if you were a part of an automated system, 
handling tasks, and transitioning between different stages of the workflow. Your responses should be precise, 
based on the information given in the document, and adhere to the Talkdown conventions, as they will be fed 
into an LLM for processing to drive the workflow.

Talkdown directives have the following format:

====================================================================================================
---
title: Talkdown Directive Template
description: A template for creating a Talkdown Directive
inputs: [filenames, folders, urls, etc.]
outputs: [Markdown, JSON, text, filename, folder, image, etc.]
author: Legavy
version: 1.0.0
directives: /Users/sschepis/Development/nomyx-io/talkdown/directives
---

_Brief description of the directive's purpose and function._

## Inputs

- **input1**: _type_ - Description of input1 (constraints if any)
- **input2**: _type_ - Description of input2 (constraints if any)

## Execution

_Description of the execution logic in natural language._

May include one of more code blocks:

\`\`\`python
# python code to execute the 
def execute(inputs): # pass a dictionary of inputs from the inputs section
    pass
\`\`\`

as well as include one or more AI prompts that should be used to generate response data:

\`\`\`ai
A prompt the AI executing this directive will use to self-prompt to execute the task.
\`\`\`

## Outputs

A line-item list of the expected outputs from the directive. Should include the type of 
output and a description of the output.

Instruct the AI to output the following:
"End your output with routing information: {name of next directive, or condition}""

- **output1**: _type_ - Description of output1 (constraints if any)
- **output2**: _type_ - Description of output2 (constraints if any)

## Routing

_Description of the routing logic and conditions._

Routing might employ code to determine the next step:

\`\`\`python
if condition:
    return 'Identifier'
\`\`\`

Or might employ AI to determine the next step:

\`\`\`ai
This is a prompt for the AI to run
\`\`\`

Or might simply specify the next step:

\`\`\`text
Identifier
\`\`\`
====================================================================================================

Input Data

All input data is provided along with the Talkdown Directive as a JSON object with the following format:

\`\`\`json
{
    "inputs": {
    "variable1": "input1 data",
    "variable2": "input2 data"
    }
}
\`\`\`

Outputting Data

Output ALL Output Data as a JSON object with the following format:

\`\`\`json
{
    "outputs": {
    "variable1": "output1 data",
    "variable2": "output2 data"
    },
    "routing": "Identifier"
}
\`\`\`
Now, process the following Talkdown Directive using the given input data:
`;

const getAssistant = async (threadId) => {
    const assistants = await Assistant.list();        
    let assistant = assistants.find(a => a.name === 'nomyx-talkdown-executor');
    if (!assistant) {
        assistant = await Assistant.create(
            'nomyx-talkdown-executor', 
            _prompt, // Make sure to await the asynchronous loadPersona
            [{"type": "code_interpreter"}, ...schemas], 
            'gpt-4-1106-preview'
        );
    } else {
        assistant = await Assistant.get(assistant.id, threadId);
    }
    return assistant;
}

module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'runTalkdown',
            description: 'run the talkdown interpreter using the given talkdown file. Can run directives or processes',
            parameters: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'The path to the talkdown file to run'
                    },
                    inputs: {
                        type: 'object',
                        description: 'A JSON object containing the data inputs for the talkdown file'
                    },
                },
                required: ['command']
            }
        }
    },
    function: async ({ file, inputs }) => {
        return new Promise((resolve, reject) => {
            const { funcs, tools } = require("./agent/tools");
            if(!file || !fs.existsSync(file)) {
                reject('You must provide a valid file path to the talkdown file to run');
            }
            let contents = fs.readFileSync(file, 'utf8');
            contents = contents + '\n\nINPUTS:\n\n' + JSON.stringify(inputs);
            return getAssistant().then(assistant => 
                resolve(assistant.run(contents, funcs, tools, (event, value) => {}))
            );  
        });
    }
}