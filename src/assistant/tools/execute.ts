
// assistant/tools/execute.ts
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
import { debugLog } from '../errorLogger';

// Function to execute a command and handle output/errors consistently
const executeCommand = async (command) => {
  debugLog(`Executing command: ${command}`);
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        debugLog(`Error executing command: ${error}`);
        reject(error); // Reject with the error object
      } else {
        debugLog(`Command output (stdout): ${stdout}`);
        debugLog(`Command output (stderr): ${stderr}`);
        // Resolve with an object containing stdout and stderr
        resolve({ stdout, stderr });
      }
    });
  });
};

// Function to create a temporary file, execute code, and clean up
const executeCodeInTempFile = async (language, code, extension) => {
  try {
    const fileName = path.join(__dirname, `${Date.now()}.${extension}`);
    const shebang = language === 'python' ? '#!/usr/bin/env python3\n' : ''; // Add shebang for Python
    debugLog(`Creating temporary file: ${fileName}`);
    await fs.writeFile(fileName, shebang + code);

    try {
      debugLog(`Executing code in temporary file: ${fileName}`);
      const { stdout, stderr }: any = await executeCommand(`${language} ${fileName}`);
      return { stdout, stderr };
    } finally {
      debugLog(`Deleting temporary file: ${fileName}`);
      await fs.unlink(fileName); // Ensure file deletion
    }
  } catch (err) {
    debugLog(`Error executing code in temporary file: ${err}`);
    throw err; // Re-throw errors for consistent handling
  }
};

export const execute_bash = async ({ command }, api) => {
  debugLog(`execute_bash called with command: ${command}`);
  // Display confirmation before execution
  const confirmed = await confirmExecution(api, `Execute Bash command: ${command}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }

  try {
    const { stdout, stderr }: any = await executeCommand(command);
    if (stderr) {
      // Log stderr for debugging but don't treat it as an error
      console.error('Bash command stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`Bash command execution failed: ${error.message}`);
  }
};

export const execute_nodejs_code = async ({ js }, api: any) => {
  debugLog(`execute_nodejs_code called with js: ${js}`);
  // Display confirmation before execution
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const { stdout, stderr } = await executeCodeInTempFile('node', js, 'js');
    if (stderr) {
      console.error('Node.js code stderr:', stderr);
    }
    return stdout;  
  } catch (error) {
    throw new Error(`Node.js code execution failed: ${error.message}`);
  }
};

export const execute_tsnodejs_code = async ({ js }, api: any) => {
  debugLog(`execute_tsnodejs_code called with js: ${js}`);
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const { stdout, stderr } = await executeCodeInTempFile('ts-node', js, 'ts');
    if (stderr) {
      console.error('TypeScript code stderr:', stderr);
    }
    return stdout;  
  } catch (error) {
    throw new Error(`TypeScript code execution failed: ${error.message}`);
  }
};

export const execute_python_code = async ({ python }, api: any) => {
  debugLog(`execute_python_code called with python: ${python}`);
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const { stdout, stderr } = await executeCodeInTempFile('python', python, 'py');
    if (stderr) {
      console.error('Python code stderr:', stderr);
    }
    return stdout;  
  } catch (error) {
    throw new Error(`Python code execution failed: ${error.message}`);
  }
};

export const execute_nodejs_file = async ({ file }, api: any) => {
  debugLog(`execute_nodejs_file called with file: ${file}`);
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
    const { stdout, stderr }: any = await executeCommand(`node ${filePath}`);
    if (stderr) {
      console.error('Node.js file stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`Node.js file execution failed: ${error.message}`);
  }
};

export const execute_tsnodejs_file = async ({ file }, api: any) => {
  debugLog(`execute_tsnodejs_file called with file: ${file}`);
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
    const { stdout, stderr }: any = await executeCommand(`ts-node ${filePath}`);
    if (stderr) {
    console.error('TypeScript file stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`TypeScript file execution failed: ${error.message}`);
  }
}

export const execute_python_file = async ({ file }, api: any) => {
  debugLog(`execute_python_file called with file: ${file}`);
  const confirmed = await confirmExecution(api, `Execute Bash command: ${js}?`);
  if (!confirmed) {
    return "Execution cancelled.";
  }
  try {
    const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
    const { stdout, stderr }: any= await executeCommand(`python ${filePath}`);
    if (stderr) {
      console.error('Python file stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    throw new Error(`Python file execution failed: ${error.message}`);
  }
};

module.exports = {
  enabled: true,
  tools: {
    execute_bash: {
      // Updated Schema
      "name": "execute_bash",
      "description": "Execute an arbitrary Bash command.",
      "input_schema": {
        "type": "object",
        "properties": {
          "command": {
            "type": "string",
            "description": "The Bash command to execute."
          }
        },
        "required": ["command"]
      },
      "output_schema": {
        "type": "string",
        "description": "The standard output of the executed Bash command."
      },
      action: execute_bash,
    },
    execute_file: {
      // Updated Schema
      "name": "execute_file",
      "description": "Execute a file containing TypeScript, JavaScript, or Python code.",
      "input_schema": {
        "type": "object",
        "properties": {
          "file": {
            "type": "string",
            "description": "The path to the source code file to execute."
          }
        },
        "required": ["file"]
      },
      "output_schema": {
        "type": "string",
        "description": "The standard output of the executed code."
      },
      action: async ({ file }: any, api: any) => {
        const ext = path.extname(file).toLowerCase(); // Use path.extname for reliability
        if (['.js', '.cjs', '.mjs'].includes(ext)) {
          return execute_nodejs_file({ file }, api);
        } else if (ext === '.ts') {
          return execute_tsnodejs_file({ file }, api);
        } else if (ext === '.py') {
          return execute_python_file({ file }, api);
        } else {
          throw new Error('Unsupported file type');  
        }
      },
    },
    execute_code: {
      // Updated Schema
      "name": "execute_code",
      "description": "Execute a code snippet in a specific language.",
      "input_schema": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "The code snippet to execute."
          },
          "language": {
            "type": "string",
            "description": "The language of the code snippet (bash, python, javascript, or typescript)."
          }
        },
        "required": ["code", "language"]
      },
      "output_schema": {
        "type": "string",
        "description": "The standard output of the executed code snippet."
      },
      action: async ({ code, language }: any, api: any) => {
        const lowerCaseLanguage = language.toLowerCase();  
        if (lowerCaseLanguage === 'bash') {
          return execute_bash({ command: code }, api);
        } else if (lowerCaseLanguage === 'python') {
          return execute_python_code({ python: code }, api);
        } else if (lowerCaseLanguage === 'javascript') {
          return execute_nodejs_code({ js: code }, api);
        } else if (lowerCaseLanguage === 'typescript') {
          return execute_tsnodejs_code({ js: code }, api);
        } else {
          throw new Error('Unsupported language');  
        }
      },
    }
  }
};

export default module.exports;
