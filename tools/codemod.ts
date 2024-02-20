
const codemod = async function ({ filePath, operation, selectors, options = {} }: any, state: any) {
    const ts = require('typescript');
    const fs = require('fs');

    return new Promise((resolve) => {
        try {
            // Assume fs and ts have been imported and are available
            const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
            const sourceFile = ts.createSourceFile(
                filePath,
                fileContent,
                ts.ScriptTarget.Latest,
                true
            );
            let result
            if(operation === 'get_info'){ result = getSelectorNodes(sourceFile, selectors); }
            else if(operation === 'set_info'){ result = setInfo(sourceFile, selectors, options.newName); }
            else if(operation === 'append'){ result = appendCode(sourceFile, options.codeSnippet); }
            else if(operation === 'remove'){ result = removeNode(sourceFile, selectors); }
            else if(operation === 'replace'){ result = replaceNode(sourceFile, selectors, options.codeSnippet); }
            else { resolve(`Operation '${operation}' is not supported.`); return; }

            // Assuming the modification functions return the modified source code as a string
            fs.writeFileSync(filePath, result);
            resolve(`Operation '${operation}' completed successfully on ${filePath}.`);
        } catch (error: any) {
            // Convert any caught errors into a string message
            resolve(`Error performing operation '${operation}' on ${filePath}: ${error.message}`);
        }
    });
};


function parseCodeSnippetToASTNodes(codeSnippet: any, expectedNodeType = null) {
    const ts = require('typescript');
    const fs = require('fs');
    // Parse the code snippet into a temporary source file
    const snippetSourceFile = ts.createSourceFile(
        "snippet.ts", // Temporary file name
        codeSnippet,
        ts.ScriptTarget.Latest,
        true // Set parent nodes
    );

    // Ensure the source file has statements
    if (snippetSourceFile.statements.length === 0) {
        throw new Error("No TypeScript statements found in the code snippet.");
    }

    const parsedNodes = [];

    // Iterate over all statements in the snippet
    for (const statement of snippetSourceFile.statements) {
        // If an expected node type is specified, validate each statement
        if (expectedNodeType && !ts["is" + expectedNodeType](statement)) {
            throw new Error(`Expected a ${expectedNodeType} but found a different type.`);
        }
        parsedNodes.push(statement);
    }

    return parsedNodes;
}

function safelyUpdateSourceFile(sourceFile:any, modifiedStatements: any) {
    const ts = require('typescript');
    if (!modifiedStatements.every(ts.isNode)) {
        throw new Error("Modified statements array contains invalid or undefined nodes.");
    }
    return ts.updateSourceFile(sourceFile, ts.factory.createNodeArray(modifiedStatements));
}

// Example implementations of the placeholder functions, to be expanded as needed
function appendCode(sourceFile: any, codeSnippet: any) {
    const ts = require('typescript');
    // Parse the code snippet into AST nodes
    const newNodes = parseCodeSnippetToASTNodes(codeSnippet);

    // Create a new array of statements for the modified source file
    const modifiedStatements = ts.factory.createNodeArray([...sourceFile.statements, ...newNodes]);

    // Use a printer to convert the modified AST back to a string
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printNode(ts.EmitHint.Unspecified, safelyUpdateSourceFile(sourceFile, modifiedStatements), sourceFile);
}

function removeNode(sourceFile: any, selector: any) {
    const ts = require('typescript');
    // Filter out the node based on the selector
    const modifiedStatements = sourceFile.statements.filter((statement: any) => {
        // Add more robust selector logic if needed
        return !(ts.isFunctionDeclaration(statement) && statement.name?.text === selector);
    });

    // Ensure all nodes are valid
    if (!modifiedStatements.every((node: any) => node !== undefined)) {
        throw new Error("Attempted to remove a node that does not exist.");
    }

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
    return printer.printFile(updatedSourceFile);
}



function replaceNode(sourceFile: any, selector: any, codeSnippet: any) {
    const parsedNodes = parseCodeSnippetToASTNodes(codeSnippet);
    // Ensure there's exactly one node for simplicit
    const ts = require('typescript');
    if (parsedNodes.length !== 1) {
        throw new Error("The code snippet must contain exactly one top-level statement for replacement.");
    }
    const replacementNode = parsedNodes[0]; // Use the first node as the replacement

    let replacementMade = false;
    const modifiedStatements = sourceFile.statements.map((statement: any) => {
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === selector) {
            replacementMade = true;
            return replacementNode; // Here is where the actual replacement happens
        }
        return statement;
    });

    if (!replacementMade) {
        throw new Error(`No node found matching selector '${selector}' for replacement.`);
    }

    // Use a temporary variable to hold the new source file structure
    let updatedSourceFile;
    updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(updatedSourceFile);
}



function getSelectorNodes(sourceFile: any, selector: any) {
    const ts = require('typescript');
    const nodes: any = [];
    ts.forEachChild((sourceFile: any, node: any) => {
        if (ts.isFunctionDeclaration(node) && node.name?.text === selector) {
            nodes.push(node);
        }
        else if (ts.isClassDeclaration(node) && node.name?.text === selector) {
            nodes.push(node);
        }
        else if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((declaration: any) => {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === selector) {
                    nodes.push(declaration);
                }
            });
        }
        else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === selector) {
            nodes.push(node);
        }

    });
    return nodes;
}

function setInfo(sourceFile: any, selector: any, newName: any) {
    const ts = require('typescript');
    const nodes = getSelectorNodes(sourceFile, selector);
    if (nodes.length === 0) {
        throw new Error(`No nodes found for selector '${selector}'`);
    }
    if (nodes.length > 1) {
        throw new Error(`Multiple nodes found for selector '${selector}'`);
    }

    const node = nodes[0];
    if (ts.isFunctionDeclaration(node)) {
        return replaceFunctionName(sourceFile, node, newName);
    }
    else if (ts.isClassDeclaration(node)) {
        return replaceClassName(sourceFile, node, newName);
    }
    else if (ts.isVariableDeclaration(node)) {
        return replaceVariableName(sourceFile, node, newName);
    }
    else {
        throw new Error(`Unsupported node type for selector '${selector}'`);
    }
}

function replaceFunctionName(sourceFile: any, node: any, newName: any) {
    const ts = require('typescript');
    const modifiedNode = ts.factory.createFunctionDeclaration(
        node.decorators,
        node.modifiers,
        node.asteriskToken,
        ts.factory.createIdentifier(newName),
        node.typeParameters,
        node.parameters,
        node.type,
        node.body
    );
    const modifiedStatements = sourceFile.statements.map((statement: any) => {
        if (statement === node) {
            return modifiedNode;
        }
        return statement;
    });
    const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(updatedSourceFile);
}

function replaceClassName(sourceFile: any, node: any, newName: any) {
    const ts = require('typescript');
    const modifiedNode = ts.factory.createClassDeclaration(
        node.decorators,
        node.modifiers,
        ts.factory.createIdentifier(newName),
        node.typeParameters,
        node.heritageClauses,
        node.members
    );
    const modifiedStatements = sourceFile.statements.map((statement: any) => {
        if (statement === node) {
            return modifiedNode;
        }
        return statement;
    });
    const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(updatedSourceFile);
}

function replaceVariableName(sourceFile: any, node: any, newName: any) {
    const ts = require('typescript');
    const modifiedNode = ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier(newName),
        node.exclamationToken,
        node.type,
        node.initializer
    );
    const modifiedStatements = sourceFile.statements.map((statement: any) => {
        if (statement === node) {
            return modifiedNode;
        }
        return statement;
    });
    const updatedSourceFile = safelyUpdateSourceFile(sourceFile, modifiedStatements);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printFile(updatedSourceFile);
}



module.exports = {
    schemas: [{
        "type": "function",
        "function": {
            "name": `codemod`,
            description: `Automates TypeScript/JavaScript code edits via AST.
Operations: append, remove, replace, get_info, set_info.
Usage: codemod <file> <operation> [selectors] [--options]
Selectors: Target functions, classes, variables.
Options: Code snippets, new names.
Features: CLI-based, supports file and snippet manipulation, customizable through selectors and options, designed for efficient source code management.
Execution: Node.js environment, leverages TypeScript Compiler API.`,
            "parameters": {
                "type": "object",
                "properties": {
                    "filePath": {
                        "type": "string",
                        "description": "The path to the TypeScript or JavaScript file to modify"
                    },
                    "operation": {
                        "type": "string",
                        "description": "The operation to perform (e.g., 'append', 'remove', 'replace')"
                    },
                    "selectors": {
                        "type": "string",
                        "description": "Selectors for identifying code parts (e.g., function names, class names)"
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
                "required": ["filePath", "operation"]
            }
        }
    }],
    tools: {
        codemod
    }
}
