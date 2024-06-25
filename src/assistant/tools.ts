
// tools.ts
// tools.ts
import 'dotenv/config';
import shell from 'shelljs';
import Conversation from './conversation';
import validator from 'validator';
import * as fs from 'fs/promises'; // Use fs.promises for async/await
import ajv from 'ajv';
import { Tool } from './types';
import { text } from 'blessed';

const jsonSchemaValidator = new ajv();

async function jsonValidator(
  jsonSchema: string,
  jsonData: string,
): Promise<boolean> {
  try {
    const schema = JSON.parse(jsonSchema);
    const data = JSON.parse(jsonData);
    const validate = jsonSchemaValidator.compile(schema);
    const valid = validate(data);
    return valid;
  } catch (error) {
    return false;
  }
}

// Generic error handling function for file system operations
async function handleFileError(context: any, api: any) {
  const logError = (message: string, level: string = 'error') => {
    api.emit('error', `[${level.toUpperCase()}] ${message} `);
  };

  logError(`File operation error: ${JSON.stringify(context)} `);

  const llmResponse = await api.callTool('callLLM', {
    system_prompt: 'Analyze the file operation error and suggest a fix.',
    prompt: JSON.stringify(context),
  });

  if (llmResponse.fix) {
    logError(`Attempting LLM fix: ${llmResponse.fix} `, 'debug');
    try {
      // Attempt to apply the LLM's fix (make sure it's safe!)
      // ... (Implement safe fix application logic here)
    } catch (fixError: any) {
      logError(`LLM fix attempt failed: ${fixError.message} `, 'error');
    }
  }

  // Safe Fallback:
  if (context.errorCode === 'ENOENT') {
    logError('File not found. Suggest creating the file or checking the path.', 'info');
    // ... (Implement logic to suggest file creation or path correction)
  } else {
    logError(`Unhandled file error code: ${context.errorCode} `, 'error');
    // ... (Handle other error codes with appropriate fallbacks)
  }
}

export const tools: { [key: string]: any } = {
  'files': {
    'name': 'files',
    'version': '1.0.0',
    'description': 'Performs batch file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, and detach. If this doesnt work, try using the busybox tool.',
    'schema': {
      'name': 'files',
      'description': 'Performs batch file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy, attach, list_attached, and detach. If this doesnt work, try using the busybox tool.',
      "methodSignature": "files(operations: { operation: string, path?: string, match?: string, data?: string, position?: number, target?: string }[]): string",
    },
    execute: async function ({ operations }: any, run: any) {
      try {
        const fs = require('fs');
        const pathModule = require('path');
        const cwd = process.cwd();
        for (const { operation, path, match, data, position, target } of operations) {
          const p = pathModule.join(cwd, path || '');
          const t = pathModule.join(cwd, target || '');
          if (!fs.existsSync(p || t)) {
            return `Error: File not found at path ${p || t} `;
          }
          let text = fs.readFileSync(p, 'utf8');
          switch (operation) {
            case 'read':
              return text;
            case 'append':
              text += data;
              break;
            case 'prepend':
              text = data + text;
              break;
            case 'replace':
              text = text.replace(match, data);
              break;
            case 'insert_at':
              text = text.slice(0, position) + data + text.slice(position);
              break;
            case 'remove':
              text = text.replace(match, '');
              break;
            case 'delete':
              fs.unlinkSync(p);
              break;
            case 'copy':
              fs.copyFileSync(p, t);
              break;
            default:
              return `Error: Unsupported operation ${operation} `;
          }
          fs.writeFileSync(p, text);
        }
        return `Successfully executed batch operations on files`;
      } catch (error: any) {
        const context = {
          errorCode: error.code,
          operations: operations,
          // ... other details
        };
        await handleFileError(context, run);
        return `File operation '${operations}' failed. Check logs for details.`;
      }
    },
  },
  'get_file_tree': {
    'name': 'get_file_tree',
    'version': '1.0.0',
    'description': 'Retrieves the file tree structure from the given path.',
    'schema': {
      'name': 'get_file_tree',
      'description': 'Retrieves the file tree structure from the given path.',
      'methodSignature': 'get_file_tree(value: string, n: number): object',
    },
    execute: async ({ value, n }: any, state: any) => {
      const fs = require('fs');
      const pathModule = require('path');
      const cwd = process.cwd();
      const explore = (dir: any, depth: any) => {
        dir = pathModule.join(cwd, dir || '');
        if (depth < 0) return null;
        const directoryTree: any = { path: dir, children: [] };
        try {
          const fsd = fs.readdirSync(dir, { withFileTypes: true });
          fsd.forEach((dirent: any) => {
            const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
            // ignore node_modules and .git directories
            if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) return;
            if (dirent.isDirectory()) {
              directoryTree.children.push(explore(fullPath, depth - 1));
            } else {
              directoryTree.children.push({ path: fullPath });
            }
          });
        } catch (e: any) {
          return e.message;
        }
        return directoryTree;
      };
      return explore(value, n);
    },
  },
  'say_aloud': {
    'name': 'say_aloud',
    'version': '1.0.0',
    'description': 'Speaks the given text aloud using PlayHT. PASS IN A text and voice PARAMETERS TO SPEAK ALOUD.',
    'schema': {
      'name': 'say_aloud',
      'description': 'Speaks the given text aloud using PlayHT. PASS IN A text and voice PARAMETERS TO SPEAK ALOUD. voice can be either \'male\' or \'female\'.',
      'methodSignature': 'say_aloud({text, voice}:{string, string}): string',
    },
    execute: async (params: any, api: any) => {
      const PlayHT = require('playht');
      const fs = require('fs');
      var player = require('play-sound')({});

      const apiKey = process.env.PLAYHT_AUTHORIZATION;
      const userId = process.env.PLAYHT_USER_ID;
      const maleVoice = process.env.PLAYHT_MALE_VOICE;
      const femaleVoice = process.env.PLAYHT_FEMALE_VOICE;

      // Initialize PlayHT API
      PlayHT.init({
        apiKey: apiKey,
        userId: userId,
      });
      function getNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      async function speakSentence(sentence: string, voice: string) {
        if (!sentence) return;
        const stream = await PlayHT.stream(sentence, {
          voiceEngine: 'PlayHT2.0-turbo',
          voiceId: voice === 'male' ? maleVoice : femaleVoice,
        });
        const chunks: any = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));

        return new Promise((resolve, reject) => {
          stream.on('end', () => {
            const buf = Buffer.concat(chunks);
            // save the audio to a file
            const filename = `${getNonce()}.mp3`;
            fs.writeFileSync(filename, buf);
            player.play(
              filename,
              function (err: any) {
                fs.unlinkSync(filename);
                resolve('done');
              },
            );
          });
        });
      }

      if (!Array.isArray(params)) params = [params];
      for (const param of params) {
        // if params is a string, convert it to an object
        let { text, voice } = param;
        voice = voice || 'female';
        if (!text) throw new Error('Text is required to speak aloud');
        if (!voice) throw new Error('Voice is required to speak aloud');

        let sentences = await api.callTool('callLLM', {
          system_prompt:
            'convert the following text into a number of sentences meant to be spoken aloud. This means breaking the text into sentences that are easy to read and understand as well as phonetically pronouncing any difficult words, urls, or acronyms. *** Return your response as a RAW JSON ARRAY of strings. ***',
          prompt: text,
          responseFormat: `string[]`,
        });
        sentences = sentences instanceof Array ? sentences : JSON.parse(sentences);
        const consumeSentence = async () => {
          return new Promise((resolve, reject) => {
            const loop: any = async () => {
              const sentence = sentences.shift();
              if (!sentence) return resolve('done');
              await speakSentence(sentence, voice);
              return await loop();
            };
            return loop();
          });
        };
        await consumeSentence();
  
      }

      return '(aloud) ' + text;
    },
  },
  pause: {
    'name': 'pause',
    'version': '1.0.0',
    'description': 'Pause execution for the specified duration.',
    'schema': {
      'name': 'pause',
      'description': 'Pause execution for the specified duration.',
      "methodSignature": "pause(duration: number): void",
    },
    execute: async ({ duration }: any) => {
      return await new Promise((resolve) => setTimeout(resolve, duration));
    },
  },  
  echo: {
    'name': 'echo',
    'version': '1.0.0',
    'description': 'Print the given text to the console',
    'schema': {
      'name': 'echo',
      'description': 'Print the given text to the console',
      'input_schema': {
        'type': 'object',
        'properties': {
          'text': {
            'type': 'string',
            'description': 'The text to print',
          },
        },
        'required': ['text'],
      },
    },
    execute: async ({ text }: any, api: any) => {
      api.emit('text', text);
      return text;
    },
  },
  busybox: {
    'name': 'busybox',
    'version': '1.0.0',
    'description': "A versatile asynchronous function that provides a lot of functionality. Commands include 'assistant', 'ls', 'cat', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'find', 'chmod', 'chown', 'cwd', 'ch_cwd', 'stat', 'node', 'python', 'jq', 'date', 'hostname', 'whoami', 'uptime', 'ping', 'curl', 'wget', 'echo', 'grep', 'sed', 'awk', 'git', 'ps', 'kill', 'help'.",
    'schema': {
      'name': 'busybox',
      'methodSignature': 'busybox({ command: string, args?: string[], options?: object, resultVar?: string }[]): string',
      'description': "A versatile asynchronous function that provides a lot of functionality. Commands include 'assistant', 'ls', 'cat', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'find', 'chmod', 'chown', 'cwd', 'ch_cwd', 'stat', 'node', 'python', 'jq', 'date', 'hostname', 'whoami', 'uptime', 'ping', 'curl', 'wget', 'echo', 'grep', 'sed', 'awk', 'git', 'ps', 'kill', 'help'.",
    },
    execute: async (params_array: any, api: any) => {
      try {
        for (const params of params_array) {
          const { command, args = [], options = {}, resultVar } = params;

          // Input validation
          if (!command) {
            throw new Error("The 'command' parameter is required for the 'busybox' tool.");
          }
          const existsSync = require('fs').existsSync;

          // Validate file paths for certain commands
          if (['cat', 'touch', 'rm', 'cp', 'mv', 'stat'].includes(command)) {
            args.forEach((arg: string) => {
              const argPath = require('path').resolve(args[0] || '');
              if (!existsSync(argPath)) {
                throw new Error(`The file or directory '${arg}' does not exist.`);
              }
            });
          }

          const supportedCommands: any = {
            'assistant': (args: string[]) => shell.exec(`assistant ${args.join(' ')} `, options).toString(),
            'ls': (args: string[]) => shell.ls(...args).toString(),
            'cat': (args: string[]) => shell.cat(...args).toString(),
            'pwd': () => shell.pwd().toString(),
            'mkdir': (args: string[]) => shell.mkdir(...args),
            'touch': (args: string[]) => shell.touch(...args),
            'rm': (args: string[]) => shell.rm(...args),
            'cp': (args: string[]) => (shell.cp as any)(...args),
            'mv': (args: string[]) => (shell.mv as any)(...args),
            'find': (args: string[]) => shell.exec(`find ${args.join(' ')} `, options).toString(),
            'chmod': (args: string[]) => shell.exec(`chmod ${args.join(' ')} `, options).toString(),
            'chown': (args: string[]) => shell.exec(`chown ${args.join(' ')} `, options).toString(),
            'cwd': () => shell.exec('pwd', options).toString(),
            'ch_cwd': (args: string[]) => shell.cd(args[0]).toString(),
            'stat': (args: string[]) => shell.exec(`stat ${args.join(' ')} `, options).toString(),
            'node': (args: string[]) => shell.exec(`node ${args.join(' ')} `, options).toString(),
            'python': (args: string[]) => shell.exec(`python ${args.join(' ')} `, options).toString(),
            'jq': (args: string[]) => shell.exec(`jq ${args.join(' ')} `, options).toString(),
            'date': () => shell.exec('date', options).toString(),
            'hostname': () => (shell as any).hostname().toString(),
            'whoami': () => shell.exec('whoami', options).toString(),
            'uptime': () => shell.exec('uptime', options).toString(),
            'ping': (args: string[]) => {
              if (args.length === 0) {
                throw new Error("The 'ping' command requires at least one argument (the host to ping).");
              }
              return shell.exec(`ping ${args.join(' ')} -c 4`, options).toString();
            },
            'curl': (args: string[]) => {
              if (args.length === 0) {
                throw new Error("The 'curl' command requires at least one argument (the URL).");
              }
              args.forEach((arg: string) => {
                if (!validator.isURL(arg)) {
                  throw new Error(`Invalid URL: ${arg} `);
                }
              });
              return shell.exec(`curl ${args.join(' ')} `, options).toString();
            },
            'wget': (args: string[]) => {
              if (args.length === 0) {
                throw new Error("The 'wget' command requires at least one argument (the URL).");
              }
              args.forEach((arg: string) => {
                if (!validator.isURL(arg)) {
                  throw new Error(`Invalid URL: ${arg} `);
                }
              });
              return shell.exec(`wget ${args.join(' ')} `, options).toString();
            },
            'echo': (args: string[]) => shell.echo(...args).toString(),
            'grep': (args: string[]) => (shell.grep as any)(...args).toString(),
            'sed': (args: string[]) => (shell.sed as any)(...args).toString(),
            'awk': (args: string[]) => shell.exec(`awk ${args.join(' ')} `, options).toString(),
            'git': (args: string[]) => shell.exec(`git ${args.join(' ')} `, options).toString(),
            'ps': () => shell.exec('ps', options).toString(),
            'kill': (args: string[]) => shell.exec(`kill ${args.join(' ')} `, options),
            help: () => `Available commands: \n${Object.keys(supportedCommands).join('\n')} `,
          };

          const cmdFunction = supportedCommands[command];
          if (cmdFunction) {

            const result = cmdFunction(args);
            if (resultVar) {
              api.store[resultVar] = result;
            }

            return result;
          } else {
            throw new Error(`Invalid command: '${command}'.Tool source: ${__filename} `);
          }
        }
      } catch (error: any) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt:
            'Analyze the provided error details and generate a fix or provide guidance on resolving the issue. If the error is related to a missing file or directory, suggest an alternative location or provide instructions on how to create the missing item.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { params_array },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw new Error(`Error in busybox tool: ${error.message} Tool source: ${error.stack} `);
      }
    },
  },
  callLLM: {
    'name': 'callLLM',
    'version': '1.0.0',
    'description': 'Call the LLM with the given system prompt and prompt, optionally specifying the model and response format and setting a result variable.',
    'schema': {
      'name': 'callLLM',
      "methodSignature": "callLLM(params: { prompt: string, system_prompt?: string, model?: string, responseFormat?: string, resultVar?: string }[]): any",
      'description': 'Call the LLM with the given system prompt and prompt, optionally specifying the model and response format and setting a result variable.',
    },
    execute: async (params: any, api: any) => {
      if (!Array.isArray(params)) params = [params];
      for (const param of params) {
        let { prompt, system_prompt, model, responseFormat, resultVar } = param;
        try {
          if (!prompt) {
            throw new Error("Both 'prompt' and 'system_prompt' are required parameters for the 'callLLM' tool.");
          }
          if (!system_prompt) system_prompt = prompt;
          model = model || 'claude';
          if (model !== 'claude' && model !== 'gemini') {
            throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
          }
          if (responseFormat) {
            system_prompt = `${system_prompt}. Response Format: You MUST respond with a JSON - encoded string in the following format: \n\`\`\`typescript\n${responseFormat}\n\`\`\`\n`;
          }
          const convo = new Conversation(model);
          const response = await convo.chat([
            {
              role: 'system',
              content: system_prompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ]);

          const data = response.content[0].text.trim();

          // Validate JSON structure before parsing
          if (responseFormat) {
            try {
              const isValidJson = jsonValidator(responseFormat, data);
              if (!isValidJson) {
                throw new Error('Invalid JSON structure in LLM response. Actual response: ' + data) + ' Expected response format: ' + responseFormat;
              }

              const rr = JSON.parse(data);
              if (resultVar) {
                api.store[resultVar] = rr;
              }
              return rr;
            } catch (error: any) {
              api.emit('error', `JSON parsing failed for LLM response: ${data}`);
              if (resultVar) {
                api.store[resultVar] = data;
              }
              return data;
            }
          } else {
            if (resultVar) {
              api.store[resultVar] = data;
            }
            return data;
          }
        } catch (error: any) {
          const llmResponse = await api.callTool('callLLM', {
            system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
            prompt: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { prompt, system_prompt, model, responseFormat, resultVar },
            }),
          });
          if (llmResponse.fix) {
            return llmResponse.fix;
          }
          throw error;
        }
      }
    },
  },
  'call_agent': {
    'name': 'call_agent',
    'version': '1.0.0',
    'description': 'Call the agent with the given task to perform.',
    'schema': {
      'name': 'call_agent',
      "methodSignature": "call_agent(params: { prompt: string, model?: string, resultVar?: string }): any",
      'description': 'Call the agent with the given task to perform.'
    },
    execute: async ({ prompt, model = 'claude', resultVar }: any, api: any) => {
      try {
        if (!prompt) {
          throw new Error("The 'prompt' parameter is required for the 'call_agent' tool.");
        }
        if (model !== 'claude' && model !== 'gemini') {
          throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
        }
        const compactRepresentation = () => {
          return JSON.stringify(api.getSchemas());
        };
        const convo = new Conversation(model);
        const jsonPrompt = `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.

Available Tools:

${compactRepresentation()}

Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.

Process:

1. Analyze the task and identify necessary steps
2. Decompose into subtasks with clear objectives and input/output
3. For each subtask, write a JavaScript script using the tools
  a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
  b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
  b. End the script with a return statement for the subtask deliverable: \`return result;\`
4. Test each script and verify the output
5. Provide a concise explanation of the subtask's purpose and approach

Data Management:

- Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
Include only resultVar instructions in responses, not the actual data.

Output Format:
\`\`\`json
[
  {
  "task": "<taskName>:<description>",
  "script": "<JavaScript script>",
  "chat": "<subtask explanation>",
  "resultVar": "<optional result variable>"
  },
  // ... additional subtasks
]
\`\`\`

CRITICAL: Verify the JSON output for accuracy and completeness before submission. *** OUTPUT ONLY JSON ***`;
        const response = await convo.chat([
          {
            role: 'system',
            content: jsonPrompt,
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'First off: OUTPUTTING ONLY *VALID*, RAW JSON IS CRITICAL! Now read and handle this: ' + prompt,
            }),
          },
        ]);
        let tasks = response.content[0].text;

        // crop anything outside the ````json and ``` to get only the json response
        tasks = tasks.replace(/.*```json/g, '');
        tasks = tasks.replace(/.*```/g, '');
        tasks = tasks.replace(/[\r\n]+/g, '');
        let message = '';
        try {
          tasks = JSON.parse(tasks);
        } catch (error: any) {
          tasks = api.extractJson(response.content[0].text);
          message = error.message;
        }
        if (!Array.isArray(tasks) || tasks.length === 0) {
          api.emit('error', message);
          throw new Error('The task must be an array of subtasks. Check the format and try again. RETURN ONLY JSON RESPONSES' + message);
        }

        const results = [];

        api.store[prompt] = tasks;

        if (resultVar) {
          api.store[resultVar] = results;
        }

        for (const task of tasks) {
          let { task: taskName, script, chat } = task;
          const splitTask = taskName.split(':');
          let taskId = taskName;
          if (splitTask.length > 1) {
            taskId = splitTask[0];
            taskName = splitTask[1];
          }
          api.store['currentTaskId'] = taskId;
          api.emit('taskId', taskId);

          api.store[`${taskId}_task`] = task;
          api.emit(`${taskId}_task`, task);

          api.store[`${taskId}_chat`] = chat;
          api.emit(`${taskId}_chat`, chat);

          api.store[`${taskId}_script`] = script;
          api.emit(`${taskId}_script`, script);

          const sr = await api.callScript(script);
          task.scriptResult = sr;

          api.store[`${taskId}_result`] = sr;
          api.store[`${taskId}_results`] = sr;
          const rout = { id: taskId, task: taskName, script, result: sr };
          api.emit(`${taskId}_results`, rout);

          results.push(rout);
        }

        if (resultVar) {
          api.store[resultVar] = results;
        }

        return results;
      } catch (error: any) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { prompt, model, resultVar },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
      }
    },
  },
  'call_agents': {
    'name': 'call_agents',
    'version': '1.0.0',
    'description': 'Call multiple agents with the given tasks to perform.',
    'schema': {
      'name': 'call_agents',
      "methodSignature": "call_agents(params: { prompts: string[], resultVar?: string }): any",
      'description': 'Call multiple agents with the given tasks to perform.',
    },
    execute: async ({ prompts, resultVar }: any, api: any) => {
      try {
        if (!prompts || !Array.isArray(prompts)) {
          throw new Error("The 'prompts' parameter must be an array for the 'call_agents' tool.");
        }
        const results = await Promise.all(
          prompts.map(async (prompt: string) => {
            return await api.callTool('call_agent', { prompt, model: 'claude' });
          }),
        );
        if (resultVar) {
          api.store[resultVar] = results;
        }
        return results;
      } catch (error: any) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { prompts, resultVar },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    },
  },
  callLLMs: {
    'name': 'callLLMs',
    'version': '1.0.0',
    'description': 'Call the LLM with the given system prompt and prompts concurrently.',
    'schema': {
      'name': 'callLLMs',
      "methodSignature": "callLLMs(params: { prompts: string[], system_prompt: string, resultVar?: string }): any",
      'description': 'Call the LLM with the given system prompt and prompts concurrently.',
    },
    execute: async ({ prompts, system_prompt, resultVar }: any, api: any) => {
      try {
        if (!prompts || !Array.isArray(prompts) || !system_prompt) {
          throw new Error("The 'prompts' parameter must be an array and 'system_prompt' is required for the 'callLLMs' tool.");
        }
        const results = await Promise.all(
          prompts.map(async (prompt: string) => {
            return await api.callTool('callLLM', { prompt, system_prompt });
          }),
        );
        if (resultVar) {
          api.store[resultVar] = results;
        }
        return results;
      } catch (error: any) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { prompts, system_prompt, resultVar },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    },
  },
  // apply a universal patch to a file
  'apply_patch': {
    'name': 'apply_patch',
    'version': '1.0.0',
    'description': 'Apply a universal patch to a file. Pass a file path, a patch string, and an optional resultVar to save the patched file contents.',
    'schema': {
      'name': 'apply_patch',
      "methodSignature": "apply_patch({ file: string, patch: string, resultVar?: string }): string",
      'description': 'Apply a universal patch to a file. Pass a file path, a patch string, and an optional resultVar to save the patched file contents.',
      "required": ["file", "patch"],
    },
    execute: async (params: any, api: any) => {
      if(!Array.isArray(params)) params = [params];
      for (const { file, patch, resultVar } of params) {
        try {
          if (!file || !patch) {
            throw new Error("Both 'file' and 'patch' are required parameters for the 'apply_patch' tool.");
          }
          const existsSync = require('fs').existsSync;
          const filePath =  require('path').resolve(file);
          if (!(await existsSync(filePath))) {
            throw new Error(`The file '${file}' does not exist.`);
          }
          try {
            const result = await api.callTool('busybox', {
              command: 'patch',
              args: [file],
              options: { input: patch },
              resultVar,
            });
            if (resultVar) {
              api.store[resultVar] = result;
            }
            return result;
          } catch (error: any) {
            try {
              const fileContent = await fs.readFile(file, 'utf8');
              return await api.callTool('callLLM', {
                system_prompt:
                  'Given one or more universal patches and file content, analyze the patches and the file content to determine the best way to apply the patch to the content, then apply the patch to the file. Return ONLY the patched file contents IN ITS ENTIRETY.',
                prompt: `File content: ${fileContent}\n\nPatch: ${patch}`,
              });
            } catch (error: any) {
              throw new Error(`Failed to apply patch: ${error.message} Tool source: ${error.stack}`);
            }
          }
        } catch (error: any) {
          const llmResponse = await api.callTool('callLLM', {
            system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
            prompt: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { file, patch, resultVar },
            }),
          });
          if (llmResponse.fix) {
            return llmResponse.fix;
          }
          throw error;
        }
      }
    },
  },
  'generate_patches': {
    'name': 'generate_patches',
    'version': '1.0.0',
    'description':
      'Generate a number of patches for a number of files given a list of file paths and instructions for what to generate. Use this tool to make changes to one or more files given a set of instructions.',
    'schema': {
      'name': 'generate_patches',
      "methodSignature": "generate_patches(params: { files: string[], instructions: string, resultVar?: string }): string",
      'description':
        'Generate a number of patches for a number of files given a list of file paths and instructions for what to generate. Use this tool to make changes to one or more files given a set of instructions.',
    },
    execute: async ({ files, instructions, resultVar }: any, api: any) => {
      try {
        const content = files
          .map((file: string) => {
            return [file, api.fs.readFileSync(file).toString()].join('\n');
          })
          .join('\n\n');
        const prompt = `INSTRUCTIONS: ${instructions}\n\nFILES:\n\n${content}\n\nRemember to provide a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }].`;
        const llmResponse = await api.callTool('callLLM', {
          system_prompt:
            'Analyze the provided files, then analyse the instructions. Then, generate one or more patches for the files based on the given instructions. Return your patches as a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }]. OUTPUT ONLY RAW JSON!',
          prompt,
        });
        if (resultVar) {
          api.store[resultVar] = llmResponse;
        }
        return llmResponse;
      } catch (error: any) {
        const llmResponse = await api.callTool('callLLM', {
          system_prompt: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          prompt: JSON.stringify({
            error: error.message,
            stackTrace: error.stack,
            context: { files, instructions },
          }),
        });
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    },
  },
  'get_tools_home': {
    'name': 'get_tools_home',
    'version': '1.0.0',
    'description': 'Get the path to the tools home directory.',
    'schema': {
      'name': 'get_tools_home',
      "methodSignature": "get_tools_home(): string",
      'description': 'Get the path to the tools home directory.',
    },
    execute: async (params: any, api: any) => {
      const thisFolder = __dirname;
      const toolsHome = thisFolder + '/tools';
      return toolsHome;
    },
  },
  'list_all_tools': {
    'name': 'list_all_tools',
    'version': '1.0.0',
    'description': 'List all the tools available in the tools home directory.',
    'schema': {
      'name': 'list_all_tools',
      "methodSignature": "list_all_tools(): { type: 'array', items: { name: 'string' } }",
      'description': 'List all the tools available in the tools home directory.',
    },
    execute: async (params: any, api: any) => {
      const toolsHome = await api.callTool('get_tools_home', {});
      //const tools = fs.readdirSync(toolsHome).filter((file: string) => file.endsWith('.ts')).map((file: string) => file.replace('.ts', ''));
      const tools = await fs.readdir(toolsHome);
      return tools;
    },
  },
  'get_tool_details': {
    'name': 'get_tool_details',
    'version': '1.0.0',
    'description': 'Get the details of a tool.',
    'schema': {
      'name': 'get_tool_details',
      "methodSignature": "get_tool_details(tool: string): { name: 'string', description: 'string', input_schema: 'object', output_schema: 'object' }",
      'description': 'Get the details of a tool.',
    },
    execute: async ({ tool }: any, api: any) => {
      const toolsHome = await api.callTool('get_tools_home', {});
      const toolPath = `${toolsHome}/${tool}.ts`;
      const existsSync = require('fs').existsSync;
      if (!existsSync(toolPath)) {
        throw new Error(`The tool '${tool}' does not exist.`);
      }
      const toolModule = require(toolPath);
      return toolModule.schema;
    },
  },
  'get_tools_details': {
    'name': 'get_tools_details',
    'version': '1.0.0',
    'description': 'Get the details of the specified tools.',
    'schema': {
      'name': 'get_tools_details',
      "methodSignature": "get_tools_details(tools: string[]): { name: 'string', description: 'string', input_schema: 'object', output_schema: 'object' }[]",
      'description': 'Get the details of the specified tools.',
    },
    execute: async (params: any, api: any) => {
      const { tools } = params;
      const toolsDetails = await Promise.all(
        tools.map(async (tool: string) => {
          return await api.callTool('get_tool_details', { tool });
        }),
      );
      return toolsDetails;
    },
  },
  'list_active_tools': {
    'name': 'list_active_tools',
    'version': '1.0.0',
    'description': 'List all the active tools in the current session.',
    'schema': {
      'name': 'list_active_tools',
      "methodSignature": "list_active_tools(): string[]",
      'description': 'List all the active tools in the current session.',
    },
    execute: async (params: any, api: any) => {
      return Object.keys(api.tools);
    },
  },
  'load_tool': {
    'name': 'load_tool',
    'version': '1.0.0',
    'description': 'Load a tool from a file path.',
    'schema': {
      name: 'load_tool',
      "methodSignature": "load_tool(path: string): string",
      description: 'Load a tool from a file path.',
    },
    execute: async ({ path }: any, api: any) => {
      try {
        const toolModule = require(path);
        const toolName = toolModule.name; // Assuming the tool module exports its name
        api.toolRegistry.addTool(toolName, toolModule.source, toolModule.schema, toolModule.tags || []);
        return toolName;
      } catch (error: any) {
        throw new Error(`Failed to load tool: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  'load_tool_source': {
    'name': 'load_tool_source',
    'version': '1.0.0',
    'description': 'Load a tool from a file path and return the source code.',
    'schema': {
      'name': 'load_tool_source',
      "methodSignature": "load_tool_source(path: string): string",
      'description': 'Load a tool from a file path and return the source code.',
    },
    execute: async ({ path }: any, api: any) => {
      try {
        const tool = await fs.readFile(path, 'utf8');
        return tool;
      } catch (error: any) {
        throw new Error(`Failed to load tool source: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  'save_tool': {
    'name': 'save_tool',
    'version': '1.0.0',
    'description': 'Save a tool to a file path.',
    'schema': {
      name: 'save_tool',
      'methodSignature': 'save_tool(params: { tool: object, path: string }): string',
      description: 'Save a tool to a file path.',
    },
    execute: async ({ tool, path }: any, api: any) => {
      try {
        const name = Object.keys(tool)[0];
        await fs.writeFile(path, `module.exports = ${JSON.stringify(tool, null, 2)};`);
        return name;
      } catch (error: any) {
        throw new Error(`Failed to save tool: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  search_news_api: {
    'name': 'search_news_api',
    'version': '1.0.0',
    'description': 'Performs a news search using the given query.',
    'schema': {
      'name': 'search_news_api',
      "methodSignature": "search_news_api(params: { q: string, from?: string, to?: string, language?: string, country?: string, domains?: string, sources?: string, sortBy?: string, num?: number }): string",
      'description': 'Performs a news search using the given query.',
    },
    execute: async (values: any) => {
      const axios = require('axios');
      const trunc = (str: any, len: any) => {
        return str.length > len ? str.substring(0, len - 3) + '...' : str;
      }
      try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${process.env.NEWS_API_KEY}`);
        const results = response.data.articles.map((item: any) => ({
          content: trunc(item.content, 100),
          title: item.title,
          url: item.url,
        }));
        // keep only the first num results
        let num = values.num ? values.num : 10;
        const res = results.slice(0, num);
        return JSON.stringify(res);
      } catch (error: any) {
        return `Error calling News API: ${error.message}`
      }
    }
  },
  search_google: {
    'name': 'search_google',
    'version': '1.0.0',
    'description': 'perform a google search using the given query',
    'schema': {
      "name": "search_google",
      "methodSignature": "search_google(params: { query: string }): string",
      "description": "perform a google search using the given query",
    },
    execute: async ({ query }: any) => {
      const config = {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
      }
      try {
        const axios = require('axios');
        const response = await
          axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
        const results = response.data.items.map((item: any) => ({
          title: item.title,
          link: item.link
        }));
        const res = JSON.stringify(results);
        return res;
      } catch (error: any) {
        return error.message;
      }
    }
  },
  fixJson: {
    // given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array
    // given some text content without any JSON within it, it will attempt to structure the text content into a JSON object
    'name': 'fixJson',
    'version': '1.0.0',
    'description': 'given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array, given some text content without any JSON within it, it will attempt to structure the text content into a JSON object',
    'schema': {
      'name': 'fixJson',
      'methodSignature': 'fixJson(params: { json: string, resultVar?: string }): any',
      'description': 'given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array, given some text content without any JSON within it, it will attempt to structure the text content into a JSON object',
    },
    execute: async ({ json, resultVar }: any, api: any) => {
      const convo = new Conversation('gemini');
      const sp = `Given some content that contains a JSON object or array, you ignore EVERYTHING BEFORE OR AFTER what is obviously JSON data, ignoring funky keys and weird data, and you output a syntactically-valid version of the JSON, with other quoting characters properly escaped, on a single line. If the content contains no JSON data, you output a JSON object containing the input data, structured in the most appropriate manner for the data.`;
      const tasks = await convo.chat([
        {
          role: 'system',
          content: sp
        },
        {
          role: 'user',
          content: json,
        },
      ], {}, 'gemini-1.5-flash-001');
      let task = tasks.content[0].text;
      try {
        task = JSON.parse(task);
      } catch (error: any) {
        task = api.extractJson(task);
      }
      if (resultVar) {
        api.store[resultVar] = task;
      }
      return task;
    }
  }

};
