import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Tool } from './tool';
import { ScriptMetadata } from '../script/metadataManager';
import { loggingService } from '../logging/logger';

export class ToolStorage {
  private baseDir: string;
  private toolsDir: string;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.ai');
    this.toolsDir = path.join(this.baseDir, 'tools');
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.toolsDir, { recursive: true });
    } catch (error) {
      loggingService.error('Failed to initialize directories', error);
    }
  }

  async loadAllTools(): Promise<Tool[]> {
    try {

      if (!await fs.access(this.toolsDir).then(() => true).catch(() => false)) {
        await fs.mkdir(this.toolsDir, { recursive: true });
        return [];
      }
      const files = await fs.readdir(this.toolsDir);

      const tools: Tool[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.toolsDir, file);
            const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
            const execute = new Function('params', 'state', 'api', data.source);
            tools.push(new Tool(
              data.name,
              data.source,
              data.schema,
              data.tags,
              data.metadata,
              execute
            ));
          } catch (error) {
            loggingService.warn(`Failed to load tool ${file}`);
          }
        }
      }

      return tools;
    } catch (error) {
      loggingService.error('Failed to load tools from storage', error);
      return [];
    }
  }

  async saveTool(tool: Tool): Promise<void> {
    try {
      const filePath = path.join(this.toolsDir, `${tool.name}.json`);
      const data = {
        name: tool.name,
        source: tool.source,
        schema: tool.schema,
        tags: tool.tags,
        metadata: tool.metadata
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      loggingService.error(`Failed to save tool ${tool.name}`, error);
    }
  }

  async deleteTool(name: string): Promise<void> {
    try {
      const filePath = path.join(this.toolsDir, `${name}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      loggingService.error(`Failed to delete tool ${name}`, error);
    }
  }
}