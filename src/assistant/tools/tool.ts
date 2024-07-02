  import Conversation from '../conversation/conversation';
import { ScriptMetadata } from '../script/metadataManager';
import { StateObject } from '../state';
import { ToolRegistry } from './toolRegistry';

  export class Tool {
    static conversation: any;
    constructor(
      public name: string,
      public source: string,
      public schema: any,
      public tags: string[],
      public metadata: ScriptMetadata,
      public _execute: Function
    ) {
      Tool.conversation = new Conversation('claude');
      if(_execute) {
        (this as any).execute = _execute;
      } else {
        this.execute = async (params: any, state, registry): Promise<any> => {
          const func = new Function('params', this.source);
          const ret = await func(params, { conversation: Tool.conversation }, state, registry);
          return [ret, state];
        }
      }
    }

    // has been used recently
    isUsed(): boolean {
      return this.metadata.lastModifiedDate > new Date(new Date().setDate(new Date().getDate() - 30));
    }

    get description(): string {
      return this.schema.description;
    }

    async execute(params: any, state: StateObject, registry: ToolRegistry): Promise<[any, StateObject]> {
      // Existing execution logic
      const result = await this._execute(params, state, registry);
      
      // Update state
      state.progress.push(`Executed ${this.name}`);
      state.workProducts.push(JSON.stringify(result));
      
      return [result, state];
    }
  
    
    update(source: string, schema: any, tags: string[], metadata: Partial<ScriptMetadata>): void {
      this.source = source;
      this.schema = schema;
      this.tags = tags;
      this.metadata = {
        ...this.metadata,
        ...metadata,
        lastModifiedDate: new Date(),
        version: this.incrementVersion(this.metadata.version)
      };
    }
  
    private incrementVersion(version: string): string {
      const [major, minor, patch] = version.split('.').map(Number);
      return `${major}.${minor}.${patch + 1}`;
    }

    public needsImprovement(): boolean {
      return this.metadata.tags.includes('needs-improvement');
    }
}