// metadataManager.ts

import { ToolRegistry } from "../tools/toolRegistry";

export interface ScriptMetadata {
  originalQuery: string;
  creationDate: Date;
  lastModifiedDate: Date;
  author: string;
  version: string;
  tags: string[];
  dependencies: string[];
  description?: string;
}

export class MetadataManager {
  static async addMetadata(toolRegistry: ToolRegistry, scriptName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    const script = await toolRegistry.getTool(scriptName);
    if (script) {
      const updatedScript = {
        ...script,
        metadata: {
          ...script.metadata,
          ...metadata,
          lastModifiedDate: new Date()
        }
      };
      await toolRegistry.updateTool(scriptName, updatedScript.source, updatedScript.schema, updatedScript.tags);
    }
  }

  static async getMetadata(toolRegistry: ToolRegistry, scriptName: string): Promise<ScriptMetadata | null> {
    const script = await toolRegistry.getTool(scriptName);
    return script ? script.metadata : null;
  }

  static async updateMetadata(toolRegistry: ToolRegistry, scriptName: string, metadata: Partial<ScriptMetadata>): Promise<void> {
    const script = await toolRegistry.getTool(scriptName);
    if (script) {
      const updatedScript = {
        ...script,
        metadata: {
          ...script.metadata,
          ...metadata,
          lastModifiedDate: new Date()
        }
      };
      await toolRegistry.updateTool(scriptName, updatedScript.source, updatedScript.schema, updatedScript.tags);
    }
  }

  static async removeMetadata(toolRegistry: ToolRegistry, scriptName: string): Promise<void> {
    const script = await toolRegistry.getTool(scriptName);
    if (script) {
      const updatedScript = {
        ...script,
        metadata: {
          originalQuery: '',
          creationDate: new Date(),
          lastModifiedDate: new Date(),
        }
      };
      await toolRegistry.updateTool(scriptName, updatedScript.source, updatedScript.schema, updatedScript.tags);
    }
  }
}
