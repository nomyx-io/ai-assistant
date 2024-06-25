

// assistant/tools/fixJson.ts
import { confirmExecution } from '../confirmation';
import { debugLog } from '../errorLogger';

export default {
  tools: {
    codemod: {
      // given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array
      // given some text content without any JSON within it, it will attempt to structure the text content into a JSON object
      schema: {
          
      },
      action: async (text: string, api: any) => {
        debugLog(`fixJson called with text: ${text}`);

         async function extractJSON(text: string): Promise<any> {
         const schema = await this.api.callTool('callLLM', {
            system_prompt: `Given some content that contains a JSON object or array, you ignore EVERYTHING BEFORE OR AFTER what is obviously JSON data, ignoring funky keys and weird data, and you output a syntactically-valid version of the JSON on a single line. If the content contains no JSON data, you output a JSON object containing the input data, structured in the most appropriate manner for the data.`,
            prompt: JSON.stringify(text),
            model: 'gemini-1.5-flash-001'
          });
          return schema;
        }
        return extractJSON(text);
      }
    }
  }
};