// sandboxedExecutionEnvironment.ts

import { NodeVM } from 'vm2';
import fs from 'fs-extra';
import path from 'path';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as v8 from 'v8';
import crypto from 'crypto';

class SandboxError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SandboxError';
  }
}

interface SandboxOptions {
  sandboxDir: string;
  maxFileSize?: number;
  maxTotalStorage?: number;
  allowedFileExtensions?: string[];
  maxConcurrentOperations?: number;
  maxMemoryUsage?: number;
  maxCpuTime?: number;
  allowedModules?: string[];
}

export class SandboxedExecutionEnvironment extends EventEmitter {
  private readonly sandboxDir: string;
  private readonly maxFileSize: number;
  private readonly maxTotalStorage: number;
  private readonly allowedFileExtensions: string[];
  private readonly maxConcurrentOperations: number;
  private readonly maxMemoryUsage: number;
  private readonly maxCpuTime: number;
  private readonly allowedModules: string[];
  private currentOperations: number = 0;

  constructor(options: SandboxOptions) {
    super();
    this.validateOptions(options);
    this.sandboxDir = options.sandboxDir;
    this.maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB default
    this.maxTotalStorage = options.maxTotalStorage || 10 * 1024 * 1024; // 10MB default
    this.allowedFileExtensions = options.allowedFileExtensions || ['.txt', '.json', '.csv'];
    this.maxConcurrentOperations = options.maxConcurrentOperations || 5;
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB default
    this.maxCpuTime = options.maxCpuTime || 1000; // 1 second default
    this.allowedModules = options.allowedModules || [];
    fs.ensureDirSync(this.sandboxDir);
  }

  private validateOptions(options: SandboxOptions): void {
    if (!options.sandboxDir) {
      throw new SandboxError('Sandbox directory must be specified', 'INVALID_CONFIG');
    }
    if (options.maxFileSize && options.maxFileSize <= 0) {
      throw new SandboxError('Max file size must be positive', 'INVALID_CONFIG');
    }
    if (options.maxTotalStorage && options.maxTotalStorage <= 0) {
      throw new SandboxError('Max total storage must be positive', 'INVALID_CONFIG');
    }
    if (options.maxConcurrentOperations && options.maxConcurrentOperations <= 0) {
      throw new SandboxError('Max concurrent operations must be positive', 'INVALID_CONFIG');
    }
    if (options.maxMemoryUsage && options.maxMemoryUsage <= 0) {
      throw new SandboxError('Max memory usage must be positive', 'INVALID_CONFIG');
    }
    if (options.maxCpuTime && options.maxCpuTime <= 0) {
      throw new SandboxError('Max CPU time must be positive', 'INVALID_CONFIG');
    }
  }

  

  async execute(code: string, context: any = {}, timeout: number = 5000): Promise<any> {
    const vm = new NodeVM({
      timeout,
      sandbox: {
        ...context,
        saveFile: this.wrapAsyncOperation(this.saveFile.bind(this)),
        readFile: this.wrapAsyncOperation(this.readFile.bind(this)),
        listFiles: this.wrapAsyncOperation(this.listFiles.bind(this)),
        deleteFile: this.wrapAsyncOperation(this.deleteFile.bind(this)),
        console: {
          log: (...args: any[]) => this.emit('log', 'info', ...args),
          error: (...args: any[]) => this.emit('log', 'error', ...args),
        },
      },
      require: {
        external: true,
        builtin: this.allowedModules,
        root: this.sandboxDir,
      },
      nesting: false,
      wrapper: 'none',
    });

    const wrappedCode = `
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > ${this.maxMemoryUsage}) {
        throw new Error('Memory limit exceeded');
      }
      ${code}
    `;

    const start = performance.now();
    try {
      const result = await vm.run(wrappedCode, this.sandboxDir);
      const end = performance.now();
      const executionTime = end - start;
      
      if (executionTime > this.maxCpuTime) {
        throw new SandboxError('CPU time limit exceeded', 'CPU_LIMIT_EXCEEDED');
      }

      this.emit('executionComplete', { success: true, executionTime });
      return result;
    } catch (error) {
      this.emit('executionComplete', { success: false, error: error.message });
      throw new SandboxError(`Sandbox execution failed: ${error.message}`, 'EXECUTION_FAILED');
    }
  }

  private wrapAsyncOperation<T>(operation: (...args: any[]) => Promise<T>): (...args: any[]) => Promise<T> {
    return async (...args: any[]) => {
      if (this.currentOperations >= this.maxConcurrentOperations) {
        throw new SandboxError('Too many concurrent file operations', 'CONCURRENT_OPERATIONS_LIMIT');
      }
      this.currentOperations++;
      try {
        return await operation(...args);
      } finally {
        this.currentOperations--;
      }
    };
  }

  private async saveFile(fileName: string, content: string): Promise<void> {
    this.validateFileName(fileName);
    const filePath = path.join(this.sandboxDir, fileName);
    
    if (Buffer.from(content).length > this.maxFileSize) {
      throw new SandboxError(`File size exceeds the maximum allowed size of ${this.maxFileSize} bytes`, 'FILE_SIZE_EXCEEDED');
    }

    const totalSize = await this.getTotalStorageSize();
    if (totalSize + Buffer.from(content).length > this.maxTotalStorage) {
      throw new SandboxError(`Saving this file would exceed the total storage limit of ${this.maxTotalStorage} bytes`, 'TOTAL_STORAGE_EXCEEDED');
    }

    await fs.writeFile(filePath, content, 'utf8');
    this.emit('fileSaved', fileName);
  }

  private async readFile(fileName: string): Promise<string> {
    this.validateFileName(fileName);
    const filePath = path.join(this.sandboxDir, fileName);
    if (!await fs.pathExists(filePath)) {
      throw new SandboxError(`File not found: ${fileName}`, 'FILE_NOT_FOUND');
    }
    const content = await fs.readFile(filePath, 'utf8');
    this.emit('fileRead', fileName);
    return content;
  }

  private async listFiles(): Promise<string[]> {
    const files = await fs.readdir(this.sandboxDir);
    this.emit('filesListed', files.length);
    return files;
  }

  private async deleteFile(fileName: string): Promise<void> {
    this.validateFileName(fileName);
    const filePath = path.join(this.sandboxDir, fileName);
    if (!await fs.pathExists(filePath)) {
      throw new SandboxError(`File not found: ${fileName}`, 'FILE_NOT_FOUND');
    }
    await fs.remove(filePath);
    this.emit('fileDeleted', fileName);
  }

  private validateFileName(fileName: string): void {
    const ext = path.extname(fileName);
    if (!this.allowedFileExtensions.includes(ext)) {
      throw new SandboxError(`File extension '${ext}' is not allowed. Allowed extensions are: ${this.allowedFileExtensions.join(', ')}`, 'INVALID_FILE_EXTENSION');
    }
    
    const sanitizedFileName = path.basename(fileName);
    if (sanitizedFileName !== fileName) {
      throw new SandboxError('Invalid file name. File names cannot contain path traversal characters.', 'INVALID_FILE_NAME');
    }
  }

  private async getTotalStorageSize(): Promise<number> {
    const files = await this.listFiles();
    let totalSize = 0;
    for (const file of files) {
      const stats = await fs.stat(path.join(this.sandboxDir, file));
      totalSize += stats.size;
    }
    return totalSize;
  }

  public async getResourceUsage(): Promise<{ memoryUsage: number, cpuUsage: number }> {
    const memoryUsage = v8.getHeapStatistics().used_heap_size;
    const cpuUsage = process.cpuUsage();
    return { memoryUsage, cpuUsage: cpuUsage.user + cpuUsage.system };
  }

  public async cleanup(): Promise<void> {
    await fs.emptyDir(this.sandboxDir);
    this.emit('sandboxCleaned');
  }

  // Utility method to generate a unique file name
  public generateUniqueFileName(extension: string): string {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    return `${uniqueId}${extension}`;
  }

  // Method to get the full path of a file in the sandbox
  public getFilePath(fileName: string): string {
    return path.join(this.sandboxDir, fileName);
  }

  // Method to check if a file exists in the sandbox
  public async fileExists(fileName: string): Promise<boolean> {
    const filePath = this.getFilePath(fileName);
    return fs.pathExists(filePath);
  }

  // Method to get file stats
  public async getFileStats(fileName: string): Promise<any> {
    const filePath = this.getFilePath(fileName);
    if (!await this.fileExists(fileName)) {
      throw new SandboxError(`File not found: ${fileName}`, 'FILE_NOT_FOUND');
    }
    return fs.stat(filePath);
  }

  // Method to rename a file in the sandbox
  public async renameFile(oldName: string, newName: string): Promise<void> {
    this.validateFileName(oldName);
    this.validateFileName(newName);
    const oldPath = this.getFilePath(oldName);
    const newPath = this.getFilePath(newName);
    if (!await this.fileExists(oldName)) {
      throw new SandboxError(`File not found: ${oldName}`, 'FILE_NOT_FOUND');
    }
    if (await this.fileExists(newName)) {
      throw new SandboxError(`File already exists: ${newName}`, 'FILE_ALREADY_EXISTS');
    }
    await fs.rename(oldPath, newPath);
    this.emit('fileRenamed', { oldName, newName });
  }

  // Method to copy a file in the sandbox
  public async copyFile(sourceName: string, targetName: string): Promise<void> {
    this.validateFileName(sourceName);
    this.validateFileName(targetName);
    const sourcePath = this.getFilePath(sourceName);
    const targetPath = this.getFilePath(targetName);
    if (!await this.fileExists(sourceName)) {
      throw new SandboxError(`Source file not found: ${sourceName}`, 'FILE_NOT_FOUND');
    }
    if (await this.fileExists(targetName)) {
      throw new SandboxError(`Target file already exists: ${targetName}`, 'FILE_ALREADY_EXISTS');
    }
    await fs.copy(sourcePath, targetPath);
    this.emit('fileCopied', { sourceName, targetName });
  }

  // Method to get the size of the sandbox directory
  public async getSandboxSize(): Promise<number> {
    const files = await this.listFiles();
    let totalSize = 0;
    for (const file of files) {
      const stats = await this.getFileStats(file);
      totalSize += stats.size;
    }
    return totalSize;
  }

  // Method to check if the sandbox is within size limits
  public async checkSandboxSize(): Promise<boolean> {
    const currentSize = await this.getSandboxSize();
    return currentSize <= this.maxTotalStorage;
  }

  // Method to get sandbox information
  public getSandboxInfo(): {
    sandboxDir: string;
    maxFileSize: number;
    maxTotalStorage: number;
    allowedFileExtensions: string[];
    maxConcurrentOperations: number;
    maxMemoryUsage: number;
    maxCpuTime: number;
    allowedModules: string[];
  } {
    return {
      sandboxDir: this.sandboxDir,
      maxFileSize: this.maxFileSize,
      maxTotalStorage: this.maxTotalStorage,
      allowedFileExtensions: this.allowedFileExtensions,
      maxConcurrentOperations: this.maxConcurrentOperations,
      maxMemoryUsage: this.maxMemoryUsage,
      maxCpuTime: this.maxCpuTime,
      allowedModules: this.allowedModules,
    };
  }
}