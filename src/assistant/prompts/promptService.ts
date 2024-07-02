import Conversation from "../conversation/conversation";
import { ConversationService } from "../conversation/conversationService";
import { ToolRegistry } from "../tools/toolRegistry";
import { log } from "../logging/logger";
import { StateObject } from "../state";
import { Task } from "../tasks/taskManager";
import { MemoryService } from "../memory/memoryService";

export interface AIReviewResult {
  stateUpdates: Partial<StateObject>;
  nextAction: 'continue' | 'modify_plan' | 'complete';
  additionalTasks: Task[];
  explanation: string;
}


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
      log('info', `Prompt response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      log('error', `Error in prompt function: ${error}`);
      throw error;
    }
  }
}

export class PromptService {
  constructor(
    private conversationService: ConversationService, 
    private toolRegistry: ToolRegistry,
    private memoryService: MemoryService
  ) { }

  introduction = async (): Promise<void> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an advanced AI assistant integrated into a sophisticated agent system. Your core functionality is powered by a combination of Claude and Gemini models, allowing you to leverage the strengths of both. You have access to a wide array of tools and services that significantly enhance your capabilities. Here's an overview of your system and abilities:

1. Conversation Handling:
   - You can engage in multi-turn conversations using either Claude or Gemini models.
   - Your responses can be tailored based on specific formatting requirements.

2. Tool Management:
   - You have access to a dynamic ToolRegistry that allows you to use, create, update, and manage various tools.
   - Tools can be automatically generated, reviewed, and optimized based on user needs.
   - You can interact with external systems, APIs, and perform complex operations through these tools.

3. Memory and Learning:
   - A MemoryService allows you to store and retrieve relevant information from past interactions.
   - You can use this to maintain context and improve the relevance of your responses over time.

4. Task Analysis and Execution:
   - You can break down complex tasks into subtasks and determine the best tools or sequence of actions to accomplish them.
   - You have the ability to execute single tools or orchestrate multiple tools to complete tasks.

5. Error Handling and Self-Improvement:
   - An ErrorHandlingService allows you to retry operations and attempt to repair failed script executions.
   - You can review and improve auto-generated tools, ensuring your capabilities are constantly evolving.

6. Prompt Engineering:
   - A PromptService helps you generate appropriate prompts for various tasks, enhancing your ability to communicate effectively with different parts of the system.

7. Logging and Monitoring:
   - Detailed logging is implemented throughout the system, allowing for better tracking and debugging of operations.
   - You can provide boxed, visually distinct outputs for important information or results.

8. File and System Operations:
   - You have access to file system operations, allowing you to read, write, and manipulate files when necessary.
   - You can execute bash commands, providing a wide range of system-level operations.

9. External Integrations:
   - You can interact with external services like news APIs and search engines to gather real-time information.

10. Cryptocurrency and Blockchain Capabilities:
    - You have tools for interacting with Ethereum wallets, smart contracts, and blockchain data.

11. Code Generation and Execution:
    - You can generate, validate, and execute JavaScript code to perform custom operations.

12. Natural Language Processing:
    - You can perform various NLP tasks such as sentiment analysis, entity recognition, and text classification.

Your role is to assist users by leveraging these capabilities. When given a task or query, analyze it carefully to determine the best approach, using your tools and services as needed. Always strive to provide accurate, helpful, and context-aware responses. If you're unsure about something or need more information, don't hesitate to ask for clarification. Maintain a professional and friendly demeanor, and always prioritize the user's needs and data security.

Remember, you're not just answering questions, but solving problems and completing tasks using a sophisticated set of tools and services. Approach each interaction as an opportunity to showcase your full range of capabilities.`,
      `Welcome to the AI Assistant Prompt Service. You can use this service to generate prompts for a variety of tasks.\n`,
      {}, {});
  };

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
    relevantMemories,
    state
  }: any): Promise<{
    existingTools: string[],
    newTools: string[],
    packages: string[],
    rationale: string,
    useSingleTool: boolean,
    toolName: string,
    params: any
  }> => {
    const fn = makePromptFunction(this.conversationService,
    `Given the list of available tools, Determine the best tools to use for the following task. If you need to install npm packages, return them in the "packages" field.\n
- If an available tool can fulfill the entire task, then return that tool's name along with the parameters.
- If multiple tools are needed to complete the task, then return the list of tools.
- Allow your memory of past tasks to influence your decision.
- Provide a clear rationale for your choices in the rationale field.\n
- Your available tools are:\n${this.toolRegistry.getCompactRepresentation()}`,
    `Task: ${task}\nLikely Tools: ${likelyTools}\nRelevant Memories: ${relevantMemories}`, {
    task: "string",
    likelyTools: "string",
    relevantMemories: "string"
  }, {
    existingTools: ["Tool1", "Tool2"],
    newTools: ["tool1:<tool description including functional behavior,input params and return value", "tool2:..."],
    packages: ["package1", "package2"],
    rationale: "string",
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
    commentaries: string,
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
- Provide commentary on the purpose and functionality of the tool in the commentaries field.\n
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
        commentaries: "<commentaries>",
        script: "<JavaScript script formatted in template>",
        packages: ["package1", "package2"]
      });
    return await fn({ toolName, description, task });
  };

  // given a task and available tools, generate a sequence of subtasks with scripts
  generateTasks = async ({
    task,
    availableTools,
    memories,
    state
  }: any): Promise<{
    task: string,
    script: string,
    chat: string,
  }[]> => {
    const fn = makePromptFunction(this.conversationService,
      `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.\
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
    memories,
    state
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

  
  
  async createExecutionPlan(command: string, relevantMemories: any): Promise<Task[]> {
    const availableTools = await this.toolRegistry.getToolList();
    const toolDescriptions = availableTools.map(tool => 
      `${tool.name}: ${tool.schema.description}`
    ).join('\n');

    const taskAnalysis = await this.determineTaskTools({
      task: command,
      likelyTools: toolDescriptions,
      relevantMemories: JSON.stringify(relevantMemories),
      state: {}
    });

    const fn = makePromptFunction(
      this.conversationService.conversation,
      `You are an advanced AI task planner. Your role is to create a detailed execution plan for the given command. 
      Use the tools and analysis provided to create a series of tasks that will accomplish the goal.
      
      Available Tools: ${taskAnalysis.existingTools.join(', ')}
      New Tools to Create: ${taskAnalysis.newTools.join(', ')}
      Packages to Install: ${taskAnalysis.packages.join(', ')}
      
      Consider the following in your plan:
      1. Use existing tools when possible.
      2. Include tasks for creating new tools if necessary.
      3. Include tasks for installing required packages.
      4. Use the state object to pass information between tasks.
      5. Include error handling and recovery strategies.
      6. Add review points to allow for plan adaptation.`,
      `Command: ${command}
      Task Analysis: ${taskAnalysis.rationale}
      
      Create a detailed execution plan as an array of task objects. Each task should have:
      - name: The tool name or a descriptive name for a custom task
      - params: An object with the parameters for the task
      - description: A brief description of the task's purpose
      - errorHandling: (Optional) How to handle potential errors
      - callback: (Optional) Boolean indicating if this task should trigger a review`,
      { command: "string" },
      [{
        name: "string",
        params: {},
        description: "string",
        errorHandling: "string",
        callback: "boolean"
      }]
    );

    let plan = await fn({ command });
    plan = JSON.parse(plan.content[0].text);

    // If new tools need to be created, add tasks for tool creation
    for (const newTool of taskAnalysis.newTools) {
      const [toolName, toolDescription] = newTool.split(':');
      plan.unshift({
        name: "generateTool",
        params: { toolName, description: toolDescription, task: command },
        description: `Create new tool: ${toolName}`,
        errorHandling: "Retry with modified parameters",
        callback: true
      });
    }

    // If packages need to be installed, add a task for package installation
    if (taskAnalysis.packages.length > 0) {
      plan.unshift({
        name: "installPackages",
        params: { packages: taskAnalysis.packages },
        description: "Install required npm packages",
        errorHandling: "Retry installation or seek user input",
        callback: true
      });
    }

    return plan;
  }
  
  async reviewTaskExecution(params: {
    originalTask: string,
    lastExecutedSubtask: Task,
    subtaskResults: any,
    currentState: StateObject
  }): Promise<AIReviewResult> {
    const fn = makePromptFunction(
      this.conversationService.conversation,
      `You are an AI agent responsible for executing and managing a complex task. You have just completed a subtask, and now you need to analyze its results and decide on the next steps. Your role is to:

      1. Examine the results of the last executed task
      2. Analyze the current state of the overall task
      3. Determine if the state needs to be updated based on the results
      4. Decide if additional tasks are needed or if the current plan should be modified
      5. Provide a brief explanation of your decision and any changes made`,
      `Original task: ${params.originalTask}
      Last executed subtask: ${JSON.stringify(params.lastExecutedSubtask)}
      Subtask results: ${JSON.stringify(params.subtaskResults)}
      Current state: ${JSON.stringify(params.currentState)}
      
      Provide your analysis and decisions in the specified JSON format.`,
      {
        originalTask: "string",
        lastExecutedSubtask: "object",
        subtaskResults: "any",
        currentState: "object"
      },
      {
        stateUpdates: {},
        nextAction: "string",
        additionalTasks: [],
        explanation: "string"
      }
    );

    return await fn(params);
  }

  analyzeError = async ({error, stack, context}): Promise<AIReviewResult> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an AI assistant tasked with analyzing an error that occurred during script execution. Your goal is to:
  
      1. Review the error message and stack trace to identify the issue
      2. Consider the context in which the error occurred
      3. Determine the potential causes and implications of the error
      4. Provide a detailed analysis of the error and its impact on the task
      5. Suggest potential repair strategies
  
      Your response should include:
      - stateUpdates: Any updates needed to the current state
      - nextAction: The recommended next action to take
      - additionalTasks: Any additional tasks that should be added to the plan
      - explanation: A detailed explanation of your analysis and recommendations
      - potentialRepairStrategies: A list of potential strategies to repair the error`,
      `Error: ${error}
      Stack Trace: ${stack}
      Context: ${JSON.stringify(context)}`,
      {
        error: "string",
        stack: "string",
        context: "string"
      },
      {
        stateUpdates: {},
        nextAction: "string",
        additionalTasks: ["string"],
        explanation: "string",
        potentialRepairStrategies: ["string"]
      }
    );
  
    return await fn({ error, stack, context: JSON.stringify(context) });
  }
  

  generateRepairStrategy = async (errorAnalysis: AIReviewResult): Promise<string> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an AI assistant tasked with generating a repair strategy for a given error analysis. Your goal is to:
  
      1. Review the error analysis and proposed solutions
      2. Identify the best strategy for repairing the error
      3. Implement the repair strategy as executable JavaScript code
      4. Provide a detailed explanation of the repair process
  
      Your response should be a JavaScript function that:
      - Takes 'context' and 'toolRegistry' as parameters
      - Implements the repair strategy using available tools and resources
      - Returns an object with { fixed: boolean, result: any, updatedContext: any }
  
      Example:
      (context, toolRegistry) => {
        // Implement repair strategy here
        // Use toolRegistry to access or modify tools if needed
        // Modify context as necessary
        return { fixed: true, result: "Error fixed", updatedContext: context };
      }`,
      `Error Analysis: ${JSON.stringify(errorAnalysis)}`,
      {
        errorAnalysis: "object"
      },
      "string"
    );
  
    return await fn({ errorAnalysis });
  }

  suggestEnvironmentModifications = async (errorAnalysis: AIReviewResult): Promise<string[]> => {
    const fn = makePromptFunction(this.conversationService,
      `You are an AI assistant tasked with suggesting environment modifications to address a given error analysis. Your goal is to:
  
      1. Review the error analysis and proposed solutions
      2. Identify potential modifications to the execution environment
      3. Suggest specific changes that can be implemented by the toolRegistry
  
      Your response should be an array of strings, where each string represents a specific environment modification that can be directly used by the modifyExecutionEnvironment method of the toolRegistry.
  
      Example:
      [
        "SET ENV_VAR=new_value",
        "INSTALL_PACKAGE=package_name",
        "UPDATE_CONFIG={"key": "value"}"
      ]`,
      `Error Analysis: ${JSON.stringify(errorAnalysis)}`,
      {
        errorAnalysis: "object"
      },
      ["string"]
    );
  
    return await fn({ errorAnalysis });
  }

  suggestToolModifications = async (errorAnalysis: AIReviewResult): Promise<{type: 'create' | 'modify', name: string, signature?: string, implementation?: string, modifications?: object}[]> => {
  const fn = makePromptFunction(this.conversationService,
    `You are an AI assistant tasked with suggesting tool modifications to address a given error analysis. Your goal is to:

    1. Review the error analysis and proposed solutions
    2. Identify potential modifications to existing tools or suggest new tools
    3. Provide specific instructions for creating or modifying tools

    Your response should be an array of objects, where each object represents a tool creation or modification suggestion:
    - type: 'create' or 'modify'
    - name: The name of the tool to create or modify
    - signature: The method signature of the tool
    - implementation: (for 'create') The full implementation of the new tool as a string
    - modifications: (for 'modify') An object describing the modifications to be made

    Example:
    [
      {
        type: 'create',
        name: 'newTool',
        signature: 'async execute(params, api): Promise<any>',
        implementation: '{ return await api.fetchData(params); }'
      },
      {
        type: 'modify',
        name: 'existingTool',
        modifications: { addMethod: 'newMethod', updateProperty: 'newValue' }
      }
    ]`,
    `Error Analysis: ${JSON.stringify(errorAnalysis)}`,
    {
      errorAnalysis: "object"
    },
    [{
      type: "'create' | 'modify'",
      name: "string",
      signature: "string?",
      implementation: "string?",
      modifications: "object?"
    }]
  );

  return await fn({ errorAnalysis });
}

identifyKnownErrorPattern = async (errorAnalysis: AIReviewResult): Promise<{patternName: string, fixStrategy: string} | null> => {
  const fn = makePromptFunction(this.conversationService,
    `You are an AI assistant tasked with identifying known error patterns based on the given error analysis. Your goal is to:

    1. Review the error analysis
    2. Compare it against known error patterns
    3. If a match is found, suggest a fix strategy

    Your response should be either null (if no known pattern is identified) or an object containing:
    - patternName: The name of the identified error pattern
    - fixStrategy: A brief description of the strategy to fix this error

    Example:
    {
      patternName: "UnhandledPromiseRejection",
      fixStrategy: "Wrap the async operation in a try-catch block and handle the rejection appropriately."
    }`,
    `Error Analysis: ${JSON.stringify(errorAnalysis)}`,
    {
      errorAnalysis: "object"
    },
    {
      patternName: "string",
      fixStrategy: "string"
    }
  );

  return await fn({ errorAnalysis });
}

generateFixOperation = async (error: Error, context: any): Promise<string> => {
  const fn = makePromptFunction(this.conversationService,
    `You are an AI assistant tasked with generating a fix operation for a given error and context. Your goal is to:

    1. Analyze the error and the context in which it occurred
    2. Devise a strategy to fix the error or mitigate its effects
    3. Implement the fix strategy as executable JavaScript code

    Your response should be a JavaScript function that:
    - Takes the 'error' as a parameter
    - Implements the fix strategy
    - Returns a Promise that resolves with the fix result

    Example:
    async (error) => {
      // Implement fix strategy here
      // You can use any available methods or tools
      // Return the result of the fix attempt
      return fixResult;
    }`,
    `Error: ${error.message}
    Stack: ${error.stack}
    Context: ${JSON.stringify(context)}`,
    {
      error: "object",
      context: "any"
    },
    "string"
  );

  return await fn({ error, context });
}
}

