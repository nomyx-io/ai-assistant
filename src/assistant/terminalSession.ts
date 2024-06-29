// terminalSession.ts
import { v4 as uuidv4 } from 'uuid';
import { ChromaClient, Collection } from 'chromadb';
import { UI } from './ui';
import ToolRegistry from './toolRegistry';
import { createPrompts, makePromptFunction, PromptBuilder } from './prompts';
import Conversation from './conversation';
import { WorkflowResult } from './workflow';
import conversation from './conversation';

interface Memory {
  input: string;
  result: string;
  timestamp: number;
}

export class TerminalSession {
  id: string;
  private conversation: Conversation;
  history: string[] = [];
  debug: boolean = false;
  savedOutput: string = '';
  private memoryCollection: Collection;
  private prompts: any;

  constructor(
    private sessionManager: any,
    private chromaClient: ChromaClient,
    private ui: UI,
    private toolRegistry: ToolRegistry,
    private systemTools: any,
  ) {
    this.id = uuidv4();
    this.conversation = new Conversation('claude');
    this.prompts = createPrompts(this.conversation);
    this.initializeMemoryCollection();
  }

  private async initializeMemoryCollection() {
    this.memoryCollection = await this.chromaClient.getOrCreateCollection({
      name: `session_${this.id}_memories`,
    });
  }

  private async slugify(input: string): Promise<string> {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  async execute(command: string): Promise<WorkflowResult> {
    try {
      this.history.push(command);
      const result = await this.processCommand(command);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error in TerminalSession execute:', error);
      return { success: false, error: error as Error };
    }
  }

  async processCommand(input: string): Promise<WorkflowResult> {
    try {
      this.history.push(input);

      const analyzeRequestPrompt = makePromptFunction(conversation, `Determine the best tools to use for the following task. If you need to install npm packages, return them in the "packages" field.
Available Tools:
${this.toolRegistry.getCompactRepresentation()}

Likely Tools:
${await this.toolRegistry.predictLikelyTools(input)}

Relevant Memories:
${await this.retrieveSimilarMemories(input)}

- If an existing tool can fulfill the entire task, then return that tool's name.
- If multiple tools are needed to complete the task, then return the list of tools.
- Allow your memory of past tasks to influence your decision.`, 
'{"existingTools": ["Tool1", "Tool2"], newTools: ["tool1:<tool description including functional behavior,input params and return value", "tool2:...", ...], packages: ["package1", "package2"], "useSingleTool": false, "toolName": "Tool1", "params": {}}');
      const analysisPrompt = await analyzeRequestPrompt(input);

      if (analysisPrompt.useSingleTool) {
        const result = await this.toolRegistry.callTool(analysisPrompt.toolName, analysisPrompt.params);
        return { success: true, data: result };
      } else {

        // Step 3: Generate new tools if suggested
        if (analysisPrompt.newTools.length > 0) {
          for (const newTool of analysisPrompt.newTools) {
            const [ toolName, description ] = newTool.split(':');
            const createNewToolWithLLM = makePromptFunction(conversation, `You are an AI assistant tasked with writing new tools in Javascript.

- You are given a tool name and description, along with the originating task name.
- You must create a new tool module using the provided template.
- You can use npm packages and external libraries as needed. If you need to install npm packages, return them in the "packages" field.
- Return the tool module code, packages to install, and a method signature for the tool.

Template:

\`\`\`javascript
// This is javascript code for a tool module
class ${this.slugify(newTool)}Tool {

  async execute(params, api) {
    // Tool implementation goes here
  }

}

module.exports = new ${this.slugify(newTool)}Tool();
\`\`\`

Please provide the complete standardized tool module code, including the class definition and export.`, 
'{ "tool": "<toolName>", "description": "<description>", "methodSignature": "<method signature>", "script": "<JavaScript script formatted in template>", "packages": ["package1", "package2"] }');
            await createNewToolWithLLM(`Tool Name: ${toolName}, Description: ${description}`);
          }
          return this.processCommand(input);
        }

        const scriptGenerationPrompt = makePromptFunction(conversation, `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.

Available Tools:
{compactRepresentation}

Similar Past Experiences:
{memoriesRepresentation}

Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.

Process:

1. Analyze the task and identify necessary steps, considering similar past experiences
2. Decompose into subtasks with clear objectives and input/output
3. For each subtask, write a JavaScript script using the tools
  a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
  b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
  c. End the script with a return statement for the subtask deliverable: \`return result;\`
4. Test each script and verify the output
  a. Use the template below to structure the script. Replace {name} with the subtask name.

Template:

\`\`\`javascript
// This is javascript code for a tool module
class {name}Tool {

  async execute(params, api) {
    // Tool implementation goes here. MUST return a value.
  }

}

module.exports = new {name}Tool();
\`\`\`

5. Provide a concise explanation of the subtask's purpose and approach
6. MAKE SURE THE SCRIPT YOU WRITE IS JAVASCRIPT.

Data Management:

- Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
Include only resultVar instructions in responses, not the actual data.
`, `{ "task": "<taskName>:<description>", "script": "<JavaScript script formatted in template>", "chat": "<subtask explanation>", "resultVar": "<optional result variable>" }[...]`);

        const scriptResponse = await scriptGenerationPrompt(input); 
        const taskResults = {};
        for(const subtask of scriptResponse) {
          const { task, script, chat } = subtask;

          this.emit('subtaskStart', { task, chat });

          // Step 4: Execute the generated script
          const result = await this.toolRegistry.callScript(script);
    
          // Step 5: Evaluate script for potential new tools
          await this.toolRegistry.analyzeAndCreateToolFromScript(script, input);
        }

        // Step 6: Store memory and optimize
        await this.storeMemory(input, JSON.stringify(result));
        await this.toolRegistry.improveTools();
  
        return { success: true, data: result };
      }
    } catch (error) {
      console.error('Error in TerminalSession processCommand:', error);
      return { success: false, error: error as Error };
    }
  }

  private parseScriptResponse(response: string): any {
    // Implement parsing logic here
    // This is a placeholder implementation
    return JSON.parse(response);
  }

  private async executeSingleTool(toolName: string, params: any): Promise<any> {
    return await this.toolRegistry.callTool(toolName, params);
  }
  
  private prepareContext(): any {
    return {
      tools: this.toolRegistry.getTools(),
      // Add any other necessary context
    };
  }

  private async executeTasks(tasks: any[]): Promise<any[]> {
    const results = [];
    for (const task of tasks) {
      const { name: taskName, script, chat } = task;
      const [taskId, taskDescription] = taskName.split(':');
  
      this.emit('taskStart', { id: taskId, description: taskDescription });
  
      try {
        const result = await this.toolRegistry.callScript(script);
        task.scriptResult = result;
        results.push({ id: taskId, task: taskDescription, script, result });
        this.emit('taskComplete', { id: taskId, description: taskDescription, result });
      } catch (error) {
        console.error(`Error executing task ${taskId}:`, error);
        const errorReport = this.generateErrorReport(error, script, results.join('\n'), chat);
        const fixedScript = await this.getFixedScript(errorReport);
        try {
          const result = await this.toolRegistry.callScript(fixedScript);
          task.scriptResult = result;
          results.push({ id: taskId, task: taskDescription, script: fixedScript, result });
          this.emit('taskComplete', { id: taskId, description: taskDescription, result });
        } catch (retryError) {
          results.push({ id: taskId, task: taskDescription, error: retryError.message });
          this.emit('taskError', { id: taskId, description: taskDescription, error: retryError });
        }
      }
    }
    return results;
  }

  // create an error report that includes the error message and the script
  // as well as the context in which the error occurred
  private generateErrorReport(task: any, error: Error, script: string, result: any): string {
    return `Task ${task.id}: ${task.description}\nError: ${error.message}\nScript: ${script}\nContext: ${JSON.stringify(result)}\n`
  }
  
  private async getFixedScript(errorReport: string): Promise<string> {
    return this.prompts.fixScript(errorReport);
  }
  
  private async processResults(results: any[]): Promise<any> {
    // Implement any post-processing of results here
    // This could involve summarizing, formatting, or further analysis
    return results;
  }
  
  private emit(event: string, data: any) {
    // This method can be used to implement an event system if needed
    console.log(`Event: ${event}`, data);
  }

  async callAgent(input: string): Promise<string> {
    const tools = this.toolRegistry.getCompactRepresentation();
    const memories = await this.retrieveSimilarMemories(input);
    
    const taskDecompositionPrompt = this.prompts.taskProcessing(input, tools, memories, 'decompose');
    const response = await this.conversation.chat([
      { role: 'system', content: taskDecompositionPrompt },
      { role: 'user', content: input }
    ]);

    const tasks = this.parseTasksFromResponse(response);
    const results = await this.executeTasks(tasks);

    await this.storeMemory(input, JSON.stringify(results));

    return JSON.stringify(results, null, 2);
  }

  async retrieveSimilarMemories(input: string): Promise<string> {
    try {
      const results = await this.memoryCollection.query({
        queryTexts: [input],
        nResults: 5,
      });

      if (results.ids.length === 0) {
        return "No relevant memories found.";
      }

      const memories = results.metadatas[0].map((metadata, index) => ({
        input: metadata.input,
        result: results.documents[0][index],
        similarity: 1 - (results.distances[0][index] || 0),
      }));

      return memories
        .map(m => `Input: ${m.input}\nResult: ${m.result}\nSimilarity: ${m.similarity.toFixed(2)}`)
        .join('\n\n');
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return "Error retrieving memories.";
    }
  }

  parseTasksFromResponse(response: string): any[] {
    try {
      const tasks = JSON.parse(response);
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array of tasks');
      }
      return tasks.map(task => ({
        name: task.task,
        script: task.script,
        description: task.chat,
      }));
    } catch (error) {
      console.error('Error parsing tasks:', error);
      return [];
    }
  }

  async storeMemory(input: string, result: string): Promise<void> {
    try {
      const id = uuidv4();
      await this.memoryCollection.add({
        ids: [id],
        metadatas: [{ input, timestamp: Date.now() }],
        documents: [result],
      });
    } catch (error) {
      console.error('Error storing memory:', error);
    }
  }

  restoreState() {
    this.ui.print(`Session ${this.id} restored`);
    this.ui.print(`Command history:`);
    this.history.forEach((cmd, index) => {
      this.ui.print(`${index + 1}. ${cmd}`);
    });
  }
}