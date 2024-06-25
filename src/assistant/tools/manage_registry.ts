// assistant/tools/manage_registry.ts
// File: ./src/tools/registry_management.ts

import Assistant from '../assistant';
import { Tool } from '../tool_registry';
import { debugLog } from '../errorLogger';
import { confirmExecution } from '../confirmation';

interface RegistryManagementParams {
  action: 'list' | 'add' | 'update' | 'rollback' | 'history';
  name?: string;
  source?: string;
  tags?: string[];
  version?: string;
}

export const registryManagementTool: Tool = {
  name: 'registry_management',
  version: '1.0.0',
  description: 'Manage the tool registry',
  schema: {
    "description": "Manage the tool registry",
    "input_schema": {
      "type": "object",
      "properties": {
        "action": {
          "type": "string",
          "description": "The action to perform on the tool registry.",
          "enum": ["list", "add", "update", "rollback", "history"]
        },
        "name": {
          "type": "string",
          "description": "The name of the tool to manage."
        },
        "source": {
          "type": "string",
          "description": "The source code of the tool to add or update."
        },
        "tags": {
          "type": "array",
          "description": "The tags to add to the tool.",
          "items": {
            "type": "string"
          }
        },
        "version": {
          "type": "string",
          "description": "The version to rollback the tool to."
        }
      },
      "required": ["action"]
    },
    "output_schema": {
      "type": "any"
    }
  },
  execute: async (assistant: Assistant, params: RegistryManagementParams) => {
  debugLog(`registryManagementTool called with params: ${JSON.stringify(params)}`);
      // Display confirmation before adding the tool
    const confirmed = await confirmExecution(assistant, `Add tool '${name}' with the provided source and tags?`);
    if (!confirmed) {
      return false;
    }


    const { action, name, source, tags, version } = params;

    switch (action) {
      case 'list':
        return listTools(assistant);
      case 'add':
        return addTool(assistant, name!, source!, tags);
      case 'update':
        return updateTool(assistant, name!, source!);
      case 'rollback':
        return rollbackTool(assistant, name!, version!);
      case 'history':
        return getToolHistory(assistant, name!);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  },
};

async function listTools(assistant: Assistant): Promise<Tool[]> {
  debugLog('Listing all tools...');
  return assistant.toolRegistry.getToolList();
}

async function addTool(assistant: Assistant, name: string, source: string, schema: any, tags: string[] = []): Promise<boolean> {
  debugLog(`Adding tool: ${name} with source: ${source} and tags: ${tags}`);
  return assistant.toolRegistry.addTool(name, source, schema, tags);
}

async function updateTool(assistant: Assistant, name: string, source: string): Promise<boolean> {
  debugLog(`Updating tool: ${name} with source: ${source}`);
  return assistant.updateTool(name, source);
}

async function rollbackTool(assistant: Assistant, name: string, version: string): Promise<boolean> {
  debugLog(`Rolling back tool: ${name} to version: ${version}`);
  return assistant.rollbackTool(name, version);
}

async function getToolHistory(assistant: Assistant, name: string): Promise<string[]> {
  debugLog(`Getting history for tool: ${name}`);
  return assistant.toolRegistry.getToolHistory(name);
}
