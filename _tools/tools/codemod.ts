
// assistant/tools/codemod.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import { parse, tsquery } from '@phenomnomnominal/tsquery';
import { debugLog } from '../errorLogger';

import {confirmExecution} from '../confirmation';

// Define custom error types for better error handling
class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

class InvalidSelectorError extends Error {
  constructor(selector: string) {
    super(`Invalid selector: ${selector}`);
    this.name = 'InvalidSelectorError';
  }
}

class CodeSnippetError extends Error {
  constructor(message: string) {
    super(`Code snippet error: ${message}`);
    this.name = 'CodeSnippetError';
  }
}

// Interface for codemod options
interface CodemodOptions {
  codeSnippet?: string;
  newName?: string;
}

// Interface for codemod function parameters
interface CodemodParams {
  filePath: string;
  operation: string;
  selector?: string; // Use 'selector' instead of 'selectors'
  resultVar?: string;
  options?: CodemodOptions;
}

// Type guard for TypeScript nodes
const isNode = (node: any): node is ts.Node => !!node && !!node.kind;

// Function to validate and parse a code snippet
function parseCodeSnippet(codeSnippet: string, expectedNodeType?: string): ts.Statement[] {
  debugLog(`parseCodeSnippet called with codeSnippet: ${codeSnippet}, expectedNodeType: ${expectedNodeType}`);
  // Use a more descriptive temporary file name
  const snippetSourceFile = ts.createSourceFile(
    'temporarySnippet.ts',
    codeSnippet,
    ts.ScriptTarget.Latest,
    true,
  );

  const diagnostics = snippetSourceFile.statements.flatMap((statement) => {
    if (expectedNodeType && !ts[`is${expectedNodeType}`](statement)) {
      return [
        new CodeSnippetError(
          `Expected a ${expectedNodeType} but found a ${ts.SyntaxKind[statement.kind]}.`,
        ),
      ];
    }
    return [];
  });

  if (diagnostics.length > 0) {
    debugLog(`Code snippet error: ${diagnostics[0].message}`);
    throw diagnostics[0];
  }

  debugLog(`Parsed code snippet: ${JSON.stringify(snippetSourceFile.statements)}`);
  return snippetSourceFile.statements as any
}

// Function to safely update a source file with modified statements
function safelyUpdateSourceFile(
  sourceFile: ts.SourceFile,
  modifiedStatements: ts.Statement[],
): ts.SourceFile {
  debugLog(`safelyUpdateSourceFile called with modifiedStatements: ${JSON.stringify(modifiedStatements)}`);
  if (!modifiedStatements.every(isNode)) {
    throw new Error('Modified statements array contains invalid or undefined nodes.');
  }
  // function updateSourceFile(sourceFile: SourceFile, newText: string, textChangeRange: TextChangeRange, aggressiveChecks?: boolean): SourceFile;
  const updatedSourceFile = ts.factory.updateSourceFile(
    sourceFile,
    ts.factory.createNodeArray(modifiedStatements),
    sourceFile.isDeclarationFile
  );
  debugLog(`Updated source file: ${JSON.stringify(updatedSourceFile)}`);
  return updatedSourceFile;
}

// Function to append code to a source file
function appendCode(sourceFile: ts.SourceFile, codeSnippet: string): string {
  debugLog(`appendCode called with codeSnippet: ${codeSnippet}`);
  const newNodes = parseCodeSnippet(codeSnippet);
  const modifiedStatements = [...sourceFile.statements, ...newNodes];
  const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printFile(updatedSourceFile);
  debugLog(`Appended code to source file: ${result}`);
  return result;
}

// Function to remove a node from a source file based on a selector
function removeNode(sourceFile: ts.SourceFile, selector: string): string {
  debugLog(`removeNode called with selector: ${selector}`);
  const ast = parse(sourceFile.toString());
  const nodes = tsquery(ast as any, selector);

  if (nodes.length === 0) {
    throw new InvalidSelectorError(`No node found matching selector '${selector}' for removal.`);
  }

  const modifiedStatements = sourceFile.statements.filter(
    (statement) => !nodes.some((node) => node === statement),
  );

  const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printFile(updatedSourceFile);
  debugLog(`Removed node from source file: ${result}`);
  return result;
}

// Function to replace a node in a source file based on a selector
function replaceNode(sourceFile: ts.SourceFile, selector: string, codeSnippet: string): string {
  debugLog(`replaceNode called with selector: ${selector}, codeSnippet: ${codeSnippet}`);
  const parsedNodes = parseCodeSnippet(codeSnippet);
  if (parsedNodes.length !== 1) {
    throw new CodeSnippetError(
      'The code snippet must contain exactly one top-level statement for replacement.',
    );
  }

  const ast = parse(sourceFile.toString());
  const nodes = tsquery(ast as any, selector);

  if (nodes.length === 0) {
    throw new InvalidSelectorError(`No node found matching selector '${selector}' for replacement.`);
  }

  const replacementNode = parsedNodes[0];
  const modifiedStatements = sourceFile.statements.map((statement) =>
    nodes.some((node) => node === statement) ? replacementNode : statement,
  );

  const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printFile(updatedSourceFile);
  debugLog(`Replaced node in source file: ${result}`);
  return result;
}

// Function to find nodes in a source file based on a selector
function findNodesBySelector(sourceFile: ts.SourceFile, selector: string): ts.Node[] {
  debugLog(`findNodesBySelector called with selector: ${selector}`);
  const ast = parse(sourceFile.toString());
  const nodes = tsquery(ast as any, selector);
  debugLog(`Found nodes: ${JSON.stringify(nodes)}`);
  return nodes;
}

// Function to set information about a node based on a selector
function setNodeInfo(sourceFile: ts.SourceFile, selector: string, newName: string): string {
  debugLog(`setNodeInfo called with selector: ${selector}, newName: ${newName}`);
  const nodes = findNodesBySelector(sourceFile, selector);

  if (nodes.length === 0) {
    throw new InvalidSelectorError(`No nodes found for selector '${selector}'`);
  }
  if (nodes.length > 1) {
    throw new InvalidSelectorError(`Multiple nodes found for selector '${selector}'`);
  }

  const node = nodes[0];
  const modifiedStatements = sourceFile.statements.map((statement) => {
    if (statement === node) {
      // Use ts.factory to create a new node with the updated name
      if (ts.isFunctionDeclaration(node)) {
        return ts.factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          ts.factory.createIdentifier(newName),
          node.typeParameters,
          node.parameters,
          node.type,
          node.body,
        );
      } else if (ts.isClassDeclaration(node)) {
        return ts.factory.updateClassDeclaration(
          node,
          node.modifiers,
          ts.factory.createIdentifier(newName),
          node.typeParameters,
          node.heritageClauses,
          node.members,
        );
      } else if (ts.isVariableDeclaration(node)) {
        return ts.factory.updateVariableDeclaration(
          node,
          ts.factory.createIdentifier(newName),
          node.exclamationToken,
          node.type,
          node.initializer,
        );
      } else {
        throw new InvalidSelectorError(`Unsupported node type for selector '${selector}'`);
      }
    }
    return statement;
  });

  const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements as any);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printFile(updatedSourceFile);
  debugLog(`Set node info in source file: ${result}`);
  return result;
}

// Main codemod function
const codemod = async function ({
  filePath,
  operation,
  selector,
  resultVar,
  options = {},
}: CodemodParams,
api: any): Promise<string> {
  debugLog(`codemod called with filePath: ${filePath}, operation: ${operation}, selector: ${selector}, resultVar: ${resultVar}, options: ${JSON.stringify(options)}`);
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new FileNotFoundError(filePath);
      }

      debugLog(`Reading file content from: ${filePath}`);
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
      const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

      let result: string;

      // Display confirmation message based on the operation
      let confirmationMessage = "";
      switch (operation) {
        case 'append':
          confirmationMessage = `Append code to ${filePath}?`;
          break;
        case 'remove':
          confirmationMessage = `Remove code matching selector '${selector}' from ${filePath}?`;
          break;
        case 'replace':
          confirmationMessage = `Replace code matching selector '${selector}' in ${filePath} with the provided snippet?`;
          break;
        case 'get_info':
          confirmationMessage = `Get information about nodes matching selector '${selector}' in ${filePath}?`;
          break;
        case 'set_info':
          confirmationMessage = `Set information for nodes matching selector '${selector}' in ${filePath}?`;
          break;
        default:
          throw new Error(`Operation '${operation}' is not supported.`);
      }
      // Display confirmation before execution
      const confirmed = await confirmExecution(api, confirmationMessage);
      if (!confirmed) {
        return "Execution cancelled.";
      }
      if (resultVar) {
        api.store[resultVar] = fileContent;
        debugLog(`Stored result in variable: ${resultVar}`);
      }
      debugLog(`Writing result to file: ${filePath}`);
      fs.writeFileSync(filePath, fileContent, { encoding: 'utf8' });
      resolve(`Operation '${operation}' completed successfully on ${filePath}.`);
    } catch (error: any) {
      debugLog(`Error performing codemod operation: ${error.message}`);
      resolve(`Error performing operation '${operation}' on ${filePath}: ${error.message}`);
    }
  });
};

// Export the codemod function and its schema
export default {
  tools: {
    codemod: {
      schema: {
        "name": "codemod",
        "description": "Automates TypeScript/JavaScript code edits via AST.\nOperations: append, remove, replace, get_info, set_info.\nUsage: codemod <file> <operation> [selector] [--options]\nSelectors: Target functions, classes, variables using tsquery syntax (https://tsquery.github.io/).\nOptions: Code snippets, new names. \nFeatures: CLI-based, supports file and snippet manipulation, customizable through selectors and options, designed for efficient source code management.\nExecution: Node.js environment, leverages TypeScript Compiler API and tsquery.",
        "input_schema": {
          "type": "object",
          "properties": {
            "filePath": {
              "type": "string",
              "description": "The path to the TypeScript or JavaScript file to modify"
            },
            "operation": {
              "type": "string",
              "description": "The operation to perform (e.g., 'append', 'remove', 'replace', 'get_info', 'set_info')"
            },
            "selector": {
              "type": "string",
              "description": "Selector for identifying code parts using tsquery syntax (https://tsquery.github.io/)"
            },
            "resultVar": {
              "type": "string",
              "description": "Optional. The variable to store the patched content in."
            },
            "options": {
              "type": "object",
              "properties": {
                "codeSnippet": {
                  "type": "string",
                  "description": "Code snippet for append/replace operations"
                },
                "newName": {
                  "type": "string",
                  "description": "New name for the set_info operation"
                }
              },
              "description": "Additional options specific to the operation"
            }
          },
          "required": [
            "filePath",
            "operation"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The output of the codemod operation."  
        }
      },
      action: codemod,
    },
  },
};