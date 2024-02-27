import codemodModule from '../tools/codemod';


// [{
//     "type": "function",
//     "function": {
//         "name": `codemod`,
//         description: `Automates TypeScript/JavaScript code edits via AST.
// Operations: append, remove, replace, get_info, set_info.
// Usage: codemod <file> <operation> [selectors] [--options]
// Selectors: Target functions, classes, variables.
// Options: Code snippets, new names.
// Features: CLI-based, supports file and snippet manipulation, customizable through selectors and options, designed for efficient source code management.
// Execution: Node.js environment, leverages TypeScript Compiler API.`,
//         "parameters": {
//             "type": "object",
//             "properties": {
//                 "filePath": {
//                     "type": "string",
//                     "description": "The path to the TypeScript or JavaScript file to modify"
//                 },
//                 "operation": {
//                     "type": "string",
//                     "description": "The operation to perform (e.g., 'append', 'remove', 'replace')"
//                 },
//                 "selectors": {
//                     "type": "string",
//                     "description": "Selectors for identifying code parts (e.g., function names, class names)"
//                 },
//                 "options": {
//                     "type": "object",
//                     "properties": {
//                         "codeSnippet": {
//                             "type": "string",
//                             "description": "Code snippet for append/replace operations"
//                         },
//                         "newName": {
//                             "type": "string",
//                             "description": "New name for the set_info operation"
//                         }
//                     },
//                     "description": "Additional options specific to the operation"
//                 }
//             },
//             "required": ["filePath", "operation"]
//         }
//     }
// }]



const codemmod = codemodModule.tools.action

import fs from 'fs';
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

import ts from 'typescript';
jest.mock('typescript', () => ({
    createSourceFile: jest.fn(),
    createPrinter: jest.fn(() => ({ printNode: jest.fn(), })),
    isFunctionDeclaration: jest.fn(),
    factory: { createNodeArray: jest.fn(), },
}));

jest.mock("fs");
jest.mock("typescript", () => ({
    createSourceFile: jest.fn(),
    createPrinter: jest.fn(() => ({
        printNode: jest.fn(),
    })),
    isFunctionDeclaration: jest.fn(),
    factory: {
        createNodeArray: jest.fn(),
    },
}));

describe("appendCode function", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should append code snippet correctly at the end of the file", () => {
        const fakeSourceCode = "const x = 5;";
        const fakeSnippet = "\nconst y = 100;";
        const expectedOutput = "const x = 5;\nconst y = 100;";

        (fs.readFileSync as any).mockReturnValueOnce(fakeSourceCode);
        (ts.createSourceFile as any).mockReturnValueOnce({ statements: [] });
        (ts.createPrinter().printNode as any).mockReturnValueOnce(expectedOutput);

        codemmod.appendCode({ filePath: "fakePath.ts", codeSnippet: fakeSnippet });
    });
});
