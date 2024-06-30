  import Conversation from '../conversation/conversation';
import { ScriptMetadata } from '../script/metadataManager';

  export class Tool {
    static conversation: any;
    execute: any;
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
        this.execute = _execute;
      } else {
        this.execute = (params: any): Promise<any> => {
          const func = new Function('params', this.source);
          return func(params, { conversation: Tool.conversation });
        }
      }
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