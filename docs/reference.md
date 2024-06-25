# AI Assistant CLI

## Reference Guide

### Core Components

1. **TerminalSessionManager**: Manages multiple terminal sessions and handles user input.
   - Key methods: `createNewSession()`, `switchToNextSession()`, `executeCommandInActiveSession()`

2. **TerminalSession**: Represents a single session, extending the `CoreWorkflow` class.
   - Key methods: `execute()`, `callAgent()`, `callTool()`, `callScript()`

3. **Assistant**: The main class for interacting with AI models and managing tools.
   - Key methods: `callAgent()`, `callTool()`, `extractJson()`

4. **CoreWorkflow**: Implements the core workflow logic for processing tasks and managing memory.
   - Key methods: `execute()`, `callAgent()`, `performMemoryMaintenance()`

5. **ToolRegistry**: Manages the registration, versioning, and execution of tools.
   - Key methods: `addTool()`, `updateTool()`, `rollbackTool()`, `getToolHistory()`

6. **Conversation**: Handles communication with AI models (Claude and Gemini).
   - Key methods: `chat()`, `chatWithClaude()`, `chatWithGemini()`

### Key Files

- `index.ts`: Entry point of the application, sets up the TerminalSessionManager
- `assistant/assistant.ts`: Implements the main Assistant class
- `assistant/workflow.ts`: Defines the CoreWorkflow class
- `assistant/tool_registry.ts`: Implements the ToolRegistry class
- `assistant/conversation.ts`: Handles communication with AI models
- `assistant/memory/store.ts`: Manages the storage of memories using Chroma
- `assistant/memory/confidence.ts`: Calculates confidence scores for memories
- `assistant/memory/consolidator.ts`: Consolidates similar memories
- `assistant/memory/pruner.ts`: Removes low-confidence or outdated memories
- `assistant/memory/refiner.ts`: Refines existing memories

### Tools

Tools are defined in the `assistant/tools` directory. Each tool is a TypeScript module that exports an object with the following structure:

```typescript
{
  name: string;
  version: string;
  description: string;
  schema: {
    name: string;
    description: string;
    input_schema: object;
    output_schema: object;
  };
  execute: (params: any, api: any) => Promise<any>;
}
```

## Getting Started Guide

1. **Setup the Environment**:
   - Install Node.js and npm
   - Clone the repository and install dependencies
   - Set up environment variables in a `.env` file
   - Start the Chroma vector database

2. **Run the AI Assistant CLI**:
   - Start in interactive mode: `npm start`
   - Or run a single query: `npm start "Your query here"`

3. **Explore Available Tools**:
   - Use the `.tool list` command to see all available tools
   - Try out different tools by calling them in your queries

4. **Create a Custom Tool**:
   - Create a new TypeScript file in `assistant/tools`
   - Define your tool's schema and execute function
   - Export the tool as a module
   - Restart the CLI to load your new tool

5. **Manage Multiple Sessions**:
   - Use `Ctrl+A` to create a new session
   - Use `Ctrl+C` to switch between sessions
   - Use `.exit` to close the current session

6. **Debug and Troubleshoot**:
   - Toggle debug mode with the `.debug` command
   - Check the session state with `.state`
   - Review the command history with `.history`

## How-To Guide

### How to Add a New Tool

1. Create a new TypeScript file in `assistant/tools`, e.g., `myTool.ts`
2. Define your tool's schema and execute function:

```typescript
import { Tool } from '../types';

const myTool: Tool = {
  name: 'myTool',
  version: '1.0.0',
  description: 'Description of what your tool does',
  schema: {
    name: 'myTool',
    description: 'Description for the AI to understand the tool',
    input_schema: {
      type: 'object',
      properties: {
        // Define input properties here
      },
      required: ['property1', 'property2'],
    },
    output_schema: {
      type: 'string',
      description: 'Description of the tool's output',
    },
  },
  execute: async (params: any, api: any) => {
    // Implement your tool's functionality here
    // Return the result
  },
};

export default myTool;
```

3. Restart the AI Assistant CLI to load your new tool

### How to Use Memory Management

The AI Assistant uses a memory system to improve its responses over time. Here's how to leverage it:

1. **Storing Memories**: The assistant automatically stores interactions as memories.

2. **Retrieving Memories**: When processing a new query, the assistant searches for similar past interactions.

3. **Refining Memories**: Use the `MemoryRefiner` to improve existing memories:

```typescript
const memoryRefiner = new MemoryRefiner();
await memoryRefiner.refineMemories(memoryStore);
```

4. **Consolidating Memories**: Use the `MemoryConsolidator` to merge similar memories:

```typescript
const memoryConsolidator = new MemoryConsolidator(chromaClient);
await memoryConsolidator.consolidateMemories(memoryStore);
```

5. **Pruning Memories**: Use the `MemoryPruner` to remove low-confidence or outdated memories:

```typescript
const memoryPruner = new MemoryPruner();
await memoryPruner.pruneMemories(memoryStore);
```

### How to Customize the Workflow

To customize the AI Assistant's workflow:

1. Extend the `CoreWorkflow` class in `assistant/workflow.ts`
2. Override methods like `execute()` or `callAgent()` to modify behavior
3. Add new methods for additional functionality
4. Update the `TerminalSession` class to use your custom workflow

Example:

```typescript
class CustomWorkflow extends CoreWorkflow {
  async execute(input: string): Promise<WorkflowResult> {
    // Custom pre-processing logic
    const result = await super.execute(input);
    // Custom post-processing logic
    return result;
  }

  // Add new methods for custom functionality
  async customFeature() {
    // Implement your custom feature
  }
}
```

Then update `TerminalSession`:

```typescript
class TerminalSession extends CustomWorkflow {
  // ...existing code...
}