import Conversation from "../conversation/conversation";
import { ConversationService } from "../conversation/conversationService";
import { ToolRegistry } from "../tools/toolRegistry";

export function makePromptFunction(
  conversation: any,
  systemPrompt: string,
  userPromptTemplate: string,
  jsonRequestFormat: any,
  jsonResultFormat: any) {
  const validateRequestObject = (requestObject: any, jsonRequestFormat: any) => {
    if (jsonRequestFormat) {
      if (typeof requestObject !== 'object') {
        throw new Error('Request object must be an object');
      }
      for (const key in jsonRequestFormat) {
        if (jsonRequestFormat[key] === 'required' && !requestObject[key]) {
          throw new Error(`Request object must contain key: ${key}`);
        }
      }
    }
  }
  const replaceWithValues = (template: string, values: any) => {
    return template.replace(/\${([^{}]*)}/g, (substring: string, ...args: any[]) => {
      const b = args[0];
      const r = values[b];
      return typeof r === 'string' ? r : typeof r === 'number' ? r.toString() : substring;
    });
  }
  return async (requestObject: any) => {
    jsonRequestFormat && validateRequestObject(requestObject, jsonRequestFormat);
    let userPrompt = userPromptTemplate ? replaceWithValues(userPromptTemplate, requestObject) : requestObject;
    if (jsonResultFormat && systemPrompt) {
      systemPrompt = JSON.stringify({
        systemPrompt: systemPrompt && replaceWithValues(systemPrompt, requestObject),
        resultFormat: jsonResultFormat,
        userPrompt,
        options: ['DISABLE_ALL_COMMENTARY', 'DISABLE_CODEBLOCKS', 'JSON_OUTPUT_ONLY']
      });
    }
    try {
      const response = await conversation.chat([{
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },]);
      return response;
    } catch (error) {
      console.error(`Error calling prompt:`, error);
      throw error;
    }
  }
}

export class PromptService {
  constructor(private conversationService: ConversationService, private toolRegistry: ToolRegistry) { }

  // given a task, likely tools, and relevant memories, determine:
  // - which existing tools to likely use
  // - which new tools to create
  // - which npm packages to install
  // - whether to use a single tool or multiple tools
  // - the name of the tool to use
  // - the parameters to pass to the tool
  determineTaskTools = async ({
    task,
    likelyTools,
    relevantMemories
  }: any): Promise<{
    existingTools: string[],
    newTools: string[],
    packages: string[],
    useSingleTool: boolean,
    toolName: string,
    params: any
  }> => {
    const fn = makePromptFunction(this.conversationService,
    `Given the list of available tools, Determine the best tools to use for the following task. If you need to install npm packages, return them in the "packages" field.\n
- If an available tool can fulfill the entire task, then return that tool's name along with the parameters.
- If multiple tools are needed to complete the task, then return the list of tools.
- Allow your memory of past tasks to influence your decision.
- Your available tools are:\n${this.toolRegistry.getCompactRepresentation()}`,
    `Task: ${task}\nLikely Tools: ${likelyTools}\nRelevant Memories: ${relevantMemories}`, {
    task: "string",
    likelyTools: "string",
    relevantMemories: "string"
  }, {
    existingTools: ["Tool1", "Tool2"],
    newTools: ["tool1:<tool description including functional behavior,input params and return value", "tool2:..."],
    packages: ["package1", "package2"],
    useSingleTool: "boolean",
    toolName: "Tool1",
    params: {}
  });
  return await fn({ task, likelyTools, relevantMemories });
}

  // given a tool name, description, and task, generate a new tool module, returning:
  // - the tool name
  // - the tools description
  // - the method signature for the tool
  // - the tools script
  // - the packages to install
  generateTool = async ({
    toolName,
    description,
    task
  }: any): Promise<{
    tool: string,
    description: string,
    methodSignature: string,
    script: string,
    packages: string[]
  }> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an AI assistant tasked with writing a new tool in Javascript.\n
- You are given a tool name and description, along with the originating task name.
- You must create a new tool module using the provided template which accomplishes the task.
- You can use npm packages and external libraries if needed. If you need to install npm packages, return them in the "packages" field.
- Return the tool module code, packages to install, and a method signature for the tool.\n
Please provide the complete standardized tool module code, including the class definition and export.
Your available tools are:\n${this.toolRegistry.getCompactRepresentation()}`,
      `Tool name: ${toolName}\nDescription: ${description}\nTask: ${task}\n\n
Template:\n\n\`\`\`javascript
// This is javascript code for a tool module
class {toolName}Tool {\n
  async execute(params, api) {
    // Tool implementation goes here
  }\n\n}\n\nmodule.exports = new {toolName}Tool();
\`\`\``,
      {
        toolName: "string",
        description: "string",
        task: "string"
      },
      {
        tool: "<toolName>",
        description: "<description>",
        methodSignature: "<method signature>",
        script: "<JavaScript script formatted in template>",
        packages: ["package1", "package2"]
      });
    return await fn({ toolName, description, task });
  };

  // given a task and available tools, generate a sequence of subtasks with scripts
  generateTasks = async ({
    task,
    availableTools,
    memories
  }: any): Promise<{
    task: string,
    script: string,
    chat: string,
  }[]> => {
    const fn = makePromptFunction(this.conversationService,
      `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.\n
Available Tools:\n${availableTools}\n
Similar Past Experiences:\n${memories}\n
Process:\n
1. Analyze the task and identify necessary steps, considering similar past experiences
2. Decompose into subtasks with clear objectives and input/output
3. For each subtask, write a JavaScript script using the tools
  a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
  b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
  c. End the script with a return statement for the subtask deliverable: \`return result;\`
4. Test each script and verify the output
  a. Use the template below to structure the script. Replace [name] with the subtask name.`,
      `Task: ${task}\n\nTemplate:\n\n\`\`\`javascript
// This is javascript code for a tool module
class [name]Tool {\n
  async execute(params, api) {
    // Tool implementation goes here. MUST return a value.
  }\n\n}\n
module.exports = new [name]Tool();
\`\`\`\n
5. Provide a concise explanation of the subtask's purpose and approach
6. MAKE SURE THE SCRIPT YOU WRITE IS JAVASCRIPT.\n      
Data Management:\n
- Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
- Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
- <critical>Include only resultVar instructions in responses, not the actual data.</critical>`,
      {
        task: "string",
        memories: "string"
      },
      [{
        task: "<taskName>:<description>",
        script: "<JavaScript script formatted in template>",
        chat: "<subtask explanation>",
      }, '...']);
    return await fn({ task, memories });
  };

  repairFailedScriptExecution = async ({
    task,
    source,
    availableTools,
    memories
  }: any): Promise<{
    repaired: boolean,
    reason: string,
    name: string,
    source: string
  }> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an AI assistant tasked with repairing a failed script execution.\n
Available Tools:\n${availableTools}\n
Similar Past Experiences:\n${memories}\n
Process:\n
1. Analyze the failed script source code and identify the issue
2. If you can repair the script, do so, using the provided source code as your starting point. Set reason to the failure reason and what you did to fix it.
3. If tou cannot repair the script, set repaired to false and provide a reason why.`,
`Task: ${task}\n\nSource:\n\n${source}\n\nTemplate:\n\n\`\`\`javascript
// This is javascript code for a tool module
class [name]Tool {\n
  async execute(params, api) {
    // Tool implementation goes here. MUST return a value.
  }\n\n}\n
  };
  module.exports = new [name]Tool();
\`\`\`\n`,
      {
        task: "string",
        source: "string",
        memories: "string"
      },
      {
        repaired: "boolean",
        reason: "string",
        name: "string",
        source: "string"
      });
    return await fn({ task, source, memories });
  }
}