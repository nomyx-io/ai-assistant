// toolWatcher.ts
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { ToolRegistry } from '../tools/toolRegistry';
import { loggingService } from '../logging/logger';

export class ToolWatcher {
  private watcher: chokidar.FSWatcher;
  private toolsDir: string;

  constructor(private toolRegistry: ToolRegistry) {
    this.toolsDir = path.join(__dirname, '../../tools');
    // does the tools directory exist?
    if (!fs.existsSync(this.toolsDir)) {
      fs.mkdirSync(this.toolsDir);
    }
    this.watcher = chokidar.watch(this.toolsDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    this.setupWatcher();
  }

  public async initialize() {
    await this.loadExistingTools();
  }

  private setupWatcher() {
    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileRemoval(filePath));
  }

  private async handleNewFile(filePath: string) {
    loggingService.info(`New tool file detected: ${filePath}`, { service: 'ToolWatcher' });
    await this.loadTool(filePath);
  }

  private async handleFileChange(filePath: string) {
    loggingService.info(`Tool file changed: ${filePath}`, { service: 'ToolWatcher' });
    await this.loadTool(filePath);
  }

  private async handleFileRemoval(filePath: string) {
    loggingService.info(`Tool file removed: ${filePath}`, { service: 'ToolWatcher' });
    const toolName = path.basename(filePath, '.ts');
    await this.toolRegistry.removeTool(toolName);
  }


  private async loadTool(filePath: string) {
    try {
      const toolName = path.basename(filePath, '.ts');
      
      if (this.toolRegistry.hasTool(toolName)) {
        loggingService.info(`Tool '${toolName}' already loaded. Skipping.`, { service: 'ToolWatcher' });
        return;
      }
  
      const toolModule = await import(filePath);
      
      if (toolModule.default && typeof toolModule.default === 'object') {
        const tool = toolModule.default;
        await this.toolRegistry.addTool(toolName, tool.source, tool.schema, tool.tags || [], tool.execute, tool.metadata);
        loggingService.info(`Tool '${toolName}' loaded successfully`, { service: 'ToolWatcher' });
      } else {
        loggingService.error(`Invalid tool format in file: ${filePath}`, { service: 'ToolWatcher' } as any);
      }
    } catch (error) {
      loggingService.error(`Error loading tool from file ${filePath}: ${error.message}`, { service: 'ToolWatcher' } as any);
    }
  }

  public async loadExistingTools() {
    const files = await fs.promises.readdir(this.toolsDir);
    for (const file of files) {
      if (file.endsWith('.ts')) {
        await this.loadTool(path.join(this.toolsDir, file));
      }
    }
  }
}