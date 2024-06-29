// toolWatcher.ts
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import ToolRegistry from './toolRegistry';
import { log } from './logger';

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

  private setupWatcher() {
    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileRemoval(filePath));
  }

  private async handleNewFile(filePath: string) {
    log('info', `New tool file detected: ${filePath}`, 'ToolWatcher');
    await this.loadTool(filePath);
  }

  private async handleFileChange(filePath: string) {
    log('info', `Tool file changed: ${filePath}`, 'ToolWatcher');
    await this.loadTool(filePath);
  }

  private async handleFileRemoval(filePath: string) {
    log('info', `Tool file removed: ${filePath}`, 'ToolWatcher');
    const toolName = path.basename(filePath, '.ts');
    await this.toolRegistry.removeTool(toolName);
  }

  private async loadTool(filePath: string) {
    try {
      const toolName = path.basename(filePath, '.ts');
      
      if (this.toolRegistry.hasTool(toolName)) {
        log('info', `Tool '${toolName}' already loaded. Skipping.`, 'ToolWatcher');
        return;
      }
  
      const toolModule = await import(filePath);
      
      if (toolModule.default && typeof toolModule.default === 'object') {
        const tool = toolModule.default;
        await this.toolRegistry.addTool(toolName, tool.execute, tool.schema, tool.tags || []);
        log('info', `Tool '${toolName}' loaded successfully`, 'ToolWatcher');
      } else {
        log('error', `Invalid tool format in file: ${filePath}`, 'ToolWatcher');
      }
    } catch (error) {
      log('error', `Error loading tool from file ${filePath}: ${error.message}`, 'ToolWatcher');
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