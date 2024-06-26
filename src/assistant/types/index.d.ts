import { EventEmitter } from "eventemitter3";

export interface Tool {
  active?: boolean = true;
  name: string;
  version: string;
  description?: string;
  source?: string;
  tags?: string[];
  schema: any;
  testHarness?: string;
  lastTestResult?: {
    success: boolean;
    message: string
  }
  execute: any;
}

export interface ToolMetrics {
  versions: string[];
  totalUpdates: number;
  lastUpdated: string;
  testResults: {
    totalRuns: number;
    passed: number;
    failed: number;
    lastRun: string | null;
  };
  executionStats: {
    totalExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime: number | null;
    fastestExecutionTime: number;
    slowestExecutionTime: number;
  };
  errorRate: number;
  usageCount: number;
}

export interface Assistant extends EventEmitter {
  apiKey: string;
  vscode: any;
  tools: { [key: string]: Tool }; // Use Tool interface
  store: any;
  callAgent(input: string, onUpdate: (update: any) => void): Promise<any>;
  extractJson(content: string): any[];
  getSchemas(): {
    name: string;
    schema: any;
  }[];
  callTool: (toolName: string, params: any) => Promise<any>;
}

// Define the structure of the tool repository
export interface ToolRepo {
  [toolName: string]: {
    versions: {
      [version: string]: string; // source code for the version
    };
  };
}

export interface RegistryData {
  tools: Tool[];
}