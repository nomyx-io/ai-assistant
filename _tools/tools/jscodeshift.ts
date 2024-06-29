
// assistant/tools/jscodeshift.ts
import jscodeshift from 'jscodeshift';
import fs from 'fs';
import vm from 'vm';
import { debugLog } from '../errorLogger';

module.exports = {
  enabled: true,
  tools: {
    transform_file: {
      schema: {
        "name": "transform_file",
        "description": "Apply a custom transformation to a JavaScript or TypeScript file",
        "input_schema": {
          "type": "object",
          "properties": {
            "filePath": {
              "type": "string",
              "description": "The path to the source code file to transform"
            },
            "transformationFilePath": {
              "type": "string",
              "description": "The path to the file containing the transformation code"
            }
          }
        },
        "output_schema": {
          "type": "string",
          "description": "The transformed file content"
        }
      },
      action: async ({ filePath, transformationFilePath }: any, api: any) => {
        try {
          debugLog(`transform_file called with filePath: ${filePath}, transformationFilePath: ${transformationFilePath}`);

          // Display code for editing and get confirmation
          const confirmed = await displayCodeForEdit(api, 
            `Transform file ${filePath} using code from ${transformationFilePath}?`, 
            transformationFilePath
          );
          if (!confirmed) {
            return "Execution cancelled.";
          }

          debugLog('Reading source code...');
          const sourceCode = fs.readFileSync(filePath, 'utf8');
          debugLog('Reading transformation code...');
          const transformationCode = fs.readFileSync(transformationFilePath, 'utf8');

          debugLog('Parsing source code with jscodeshift...');
          const j = jscodeshift.withParser('babel'); // or 'tsx' for TypeScript
          const root = j(sourceCode);

          // Create a secure context for the transformation
          debugLog('Creating secure context for transformation...');
          const context = vm.createContext({
            j, // Provide jscodeshift instance
            root, // Provide the AST root
            console, // Optionally expose console for debugging
          });

          // Execute the transformation code in the sandboxed context
          debugLog('Executing transformation code...');
          vm.runInContext(transformationCode, context);

          // Write back to the file
          debugLog('Writing transformed code back to file...');
          fs.writeFileSync(filePath, root.toSource());

          return `Transformation applied successfully.`;
        } catch (err: any) {
          debugLog('Error applying transformation:', err);
          return JSON.stringify(err.message);
        }
      }
    },
    // Additional tools for specific file-based transformations can be defined here.
  }
};

export default module.exports;