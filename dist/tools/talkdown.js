"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const talkdownToolbelt = {
    prompt: `You transform a given input Jajascript-represented program into pseudocode logic and a number of custom function-implementing tools.

Given a Javascript-represented program with format:

{
    "name": "SampleTalkdownProgram",
    "version": "1.0.0",
    "description": "A simple program to demonstrate basic Talkdown functionalities.",
    "config": {
    "entryPoint": "process1",
    "assistantName": "SampleAssistant",
    "openaiApiKey": "YourOpenAIKeyHere",
    "model": "text-davinci-003"
    },
    "functions": [
    {
        "name": "calculateSum",
        "description": "Calculates the sum of two numbers.",
        "inputs": [
        {
            "name": "number1",
            "type": "number",
            "description": "The first number."
        },
        {
            "name": "number2",
            "type": "number",
            "description": "The second number."
        }
        ],
        "outputs": [
        {
            "name": "result",
            "type": "number",
            "description": "The sum of the two numbers."
        }
        ],
        "logic": "Return the sum of number1 and number2."
    }
    ],
    "directives": [
    {
        "name": "printResult",
        "description": "Prints the result to the console.",
        "actions": [
        {
            "type": "util",
            "name": "logOutput",
            "parameters": {
            "message": "Calculated Result: \${result}"
            }
        }
        ]
    }
    ],
    "processes": [
    {
        "name": "process1",
        "description": "A simple process to calculate and print the sum of two numbers.",
        "steps": [
        {
            "type": "function",
            "name": "calculateSum",
            "parameters": {
            "number1": 5,
            "number2": 10
            }
        },
        {
            "type": "directive",
            "name": "printResult",
            "parameters": {
            "result": "\${calculateSum.result}"
            }
        }
        ]
    }
    ],
    "utils": [
    {
        "name": "logOutput",
        "description": "Logs a message to the console.",
        "logic": "Console log the provided message."
    }
    ]
}

You transform the program into pseudocode logic like so:

set_logic(\`// Read the input JSON object to get initial data
CALL read_input to get "number1" and "number2"

// Check if input numbers are provided
IF "number1" and "number2" are available

    // Calculate the sum of the two numbers
    CALL calculateSum with "number1" and "number2"
    STORE result in "sum"

    // Print the result
    CALL logOutout to send "Calculated Result: \${sum}" to the user

    // Update the process status to complete
    CALL status_set to set the status to 'complete'
    CALL percent_complete_set to update the percent complete to 100
    CALL echo to send a status "Sum calculation complete" to the user
    EXIT

ELSE
    // If numbers are not provided, request them from the user
    CALL ask to request "number1" 
    CALL ask to reqest  "number2" from the user
    EXIT

ON ERROR:
    CALL status_set to set the status to 'error'
    CALL error to log the FULL TECHNICAL DETAILS of the error message
    EXIT

ON WARNING:
    CALL status_set to set the status to 'warning'
    CALL warn to log the warning message
    EXIT
\`);

You also transform the program into a number of custom function-implementing tools like so:

create_process("process1", "A simple process to calculate and print the sum of two numbers.", [
    {
        "type": "function",
        "name": "calculateSum",
        "parameters": {
            "number1": 5,
            "number2": 10
        }
    },
    {
        "type": "directive",
        "name": "printResult",
        "parameters": {
            "result": "\${calculateSum.result}"
        }
    }
]);

create_directive("printResult", "Prints the result to the console.", {
    "result": "\${calculateSum.result}"
}, [
    {
        "type": "util",
        "name": "logOutput",
        "parameters": {
            "message": "Calculated Result: \${result}"
        }
    }
]);

create_function("calculateSum", "Calculates the sum of two numbers.", {
    "number1": {
        "type": "number",
        "description": "The first number."
    },
    "number2": {
        "type": "number",
        "description": "The second number."
    }
}, {
    "result": {
        "type": "number",
        "description": "The sum of the two numbers."
    }
}, \`Return the sum of number1 and number2.\`);

create_util("logOutput", "Logs a message to the console.", \`Console log the provided message.\`);

    `,
    enabled: false,
    state: {
        modules: [{
                name: "talkdown",
                description: "Talkdown functions, directives, and processes",
                version: "0.0.1"
            }],
        talkdown: {
            logic: "",
            processes: [],
            directives: [],
            functions: [],
            utils: []
        }
    },
    schemas: [
        {
            type: "function",
            function: {
                name: "set_logic",
                description: "Set the logic for a given process.",
                parameters: {
                    type: "object",
                    properties: {
                        logic: {
                            type: "string",
                            description: "The pseudocode logic to set for the process."
                        }
                    },
                    required: ["logic"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_process",
                description: "Create a new process.",
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The name of the process."
                        },
                        description: {
                            type: "string",
                            description: "The description of the process."
                        },
                        steps: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: {
                                        type: "string",
                                        description: "The type of step (function or directive)."
                                    },
                                    name: {
                                        type: "string",
                                        description: "The name of the function or directive."
                                    },
                                    parameters: {
                                        type: "object",
                                        description: "The parameters to pass to the function or directive."
                                    }
                                }
                            }
                        }
                    },
                    required: ["name", "description", "steps"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_directive",
                description: "Create a new directive.",
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The name of the directive."
                        },
                        description: {
                            type: "string",
                            description: "The description of the directive."
                        },
                        parameters: {
                            type: "object",
                            description: "The parameters to pass to the directive."
                        },
                        actions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    type: {
                                        type: "string",
                                        description: "The type of action (function or util)."
                                    },
                                    name: {
                                        type: "string",
                                        description: "The name of the function or util."
                                    },
                                    parameters: {
                                        type: "object",
                                        description: "The parameters to pass to the function or util."
                                    }
                                }
                            }
                        }
                    },
                    required: ["name", "description", "parameters", "actions"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_function",
                description: "Create a new function.",
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The name of the function."
                        },
                        description: {
                            type: "string",
                            description: "The description of the function."
                        },
                        inputs: {
                            type: "object",
                            description: "The inputs of the function."
                        },
                        outputs: {
                            type: "object",
                            description: "The outputs of the function."
                        },
                        logic: {
                            type: "string",
                            description: "The logic of the function."
                        }
                    },
                    required: ["name", "description", "inputs", "outputs", "logic"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_util",
                description: "Create a new util.",
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "The name of the util."
                        },
                        description: {
                            type: "string",
                            description: "The description of the util."
                        },
                        logic: {
                            type: "string",
                            description: "The logic of the util."
                        }
                    },
                    required: ["name", "description", "logic"]
                }
            }
        },
    ],
    tools: {
        set_logic: ({ logic }, state) => __awaiter(void 0, void 0, void 0, function* () {
            state.talkdown.logic = logic;
            return `Pseudocode logic set to: ${logic}`;
        }),
        create_process: ({ name, description, steps }, state) => __awaiter(void 0, void 0, void 0, function* () {
            state.talkdown.processes.push({ name, description, steps });
            return `Process ${name} created with description: ${description} and steps: ${steps}`;
        }),
        create_directive: ({ name, description, parameters, actions }, state) => __awaiter(void 0, void 0, void 0, function* () {
            state.talkdown.directives.push({ name, description, parameters, actions });
            return `Directive ${name} created with description: ${description}, parameters: ${parameters}, and actions: ${actions}`;
        }),
        create_function: ({ name, description, inputs, outputs, logic }, state) => __awaiter(void 0, void 0, void 0, function* () {
            state.talkdown.functions.push({ name, description, inputs, outputs, logic });
            return `Function ${name} created with description: ${description}, inputs: ${inputs}, outputs: ${outputs}, and logic: ${logic}`;
        }),
        create_util: ({ name, description, logic }, state) => __awaiter(void 0, void 0, void 0, function* () {
            state.talkdown.utils.push({ name, description, logic });
            return `Util ${name} created with description: ${description} and logic: ${logic}`;
        })
    }
};
module.exports = {
    schema: {
        type: "function",
        function: {
            name: "compile_talkdown_code",
            description: "Compile a talkdown project into a runnable talkdown json object",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "The path to the talkdown project to compile"
                    }
                },
                required: ["path"]
            }
        }
    },
    tools: {
        compile_talkdown_code: {
            action: ({ path }) => __awaiter(void 0, void 0, void 0, function* () {
                const fs = require('fs');
                const pathModule = require('path');
                const yamlFront = require('yaml-front-matter');
                // Helper function to read and parse markdown files
                function readAndParseMD(filePath) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    return yamlFront.loadFront(content);
                }
                // Recursive function to compile each directory
                function compileDirectory(dirPath) {
                    let items = [];
                    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            items = items.concat(compileDirectory(pathModule.join(dirPath, entry.name)));
                        }
                        else if (entry.isFile() && entry.name.endsWith('.md')) {
                            const itemData = readAndParseMD(pathModule.join(dirPath, entry.name));
                            items.push({
                                name: itemData.title || pathModule.basename(entry.name, '.md'),
                                description: itemData.description,
                                inputs: itemData.inputs,
                                outputs: itemData.outputs,
                                logic: itemData.logic,
                                actions: itemData.actions
                            });
                        }
                    }
                    return items;
                }
                // Main compile function
                function compile(projectPath) {
                    const compiled = {
                        functions: [],
                        directives: [],
                        processes: [],
                        utils: [],
                        config: {}
                    };
                    const configPath = pathModule.join(projectPath, 'config.json');
                    if (fs.existsSync(configPath)) {
                        compiled.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    }
                    const dirs = ['functions', 'directives', 'processes', 'utils'];
                    dirs.forEach(dir => {
                        const dirPath = pathModule.join(projectPath, 'src', dir);
                        if (fs.existsSync(dirPath)) {
                            compiled[dir] = compileDirectory(dirPath);
                        }
                    });
                    return compiled;
                }
                try {
                    const compiledProject = compile(path);
                    return JSON.stringify(compiledProject, null, 2);
                }
                catch (error) {
                    return error.message || 'An error occurred while compiling the talkdown project.';
                }
            })
        }
    }
};
exports.default = module.exports;
