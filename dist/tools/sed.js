"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const sed = require('sed-lite');
// ... Existing code ...
module.exports = {
    enabled: true,
    tools: {
        sed_string: {
            schema: {
                "type": "function",
                "function": {
                    "name": "sed_string",
                    "description": "Perform sed operations on a given string",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "inputString": {
                                "type": "string",
                                "description": "The input string to be transformed"
                            },
                            "pattern": {
                                "type": "string",
                                "description": "The sed pattern to apply"
                            }
                        },
                        "required": ["inputString", "pattern"]
                    }
                }
            },
            action: ({ inputString, pattern }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    return sed(inputString, pattern);
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        },
        sed_file: {
            schema: {
                "type": "function",
                "function": {
                    "name": "sed_file",
                    "description": "Perform sed operations on the contents of a file",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "filePath": {
                                "type": "string",
                                "description": "The path of the file to be transformed"
                            },
                            "pattern": {
                                "type": "string",
                                "description": "The sed pattern to apply"
                            }
                        },
                        "required": ["filePath", "pattern"]
                    }
                }
            },
            action: ({ filePath, pattern }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    if (!fs.existsSync(filePath)) {
                        return `File not found: ${filePath}`;
                    }
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    const transformedContent = sed(fileContent, pattern);
                    fs.writeFileSync(filePath, transformedContent);
                    return `File transformed successfully.`;
                }
                catch (err) {
                    return JSON.stringify(err.message);
                }
            })
        }
    }
};
exports.default = module.exports;
