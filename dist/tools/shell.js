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
const shell = require('shelljs');
module.exports = {
    enabled: true,
    tools: {
        run_command: {
            schema: {
                "type": "function",
                "function": {
                    "name": "run_command",
                    "description": "Execute a shell command or script",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "The command to be executed"
                            },
                            "options": {
                                "type": "object",
                                "description": "Optional parameters for command execution"
                            }
                        },
                        "required": ["command"]
                    }
                }
            },
            action: ({ command, options = {} }) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const execResult = shell.exec(command, options);
                    if (execResult.code !== 0) {
                        return `Error: ${execResult.stderr}`;
                    }
                    return execResult.stdout;
                }
                catch (err) {
                    return `Execution error: ${err.message}`;
                }
            })
        },
        // Additional tools leveraging different shelljs functionalities can be defined here.
    }
};
exports.default = module.exports;
