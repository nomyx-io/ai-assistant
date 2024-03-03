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
module.exports = {
    enabled: true,
    tools: {
        "npm-list-npm-libraries": {
            schema: { type: 'function', function: { name: 'npm-list-npm-libraries', description: 'List all npm libraries in the current workspace', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to list the npm libraries from' } } } } },
            action: function (_, run) {
                return __awaiter(this, void 0, void 0, function* () {
                    const fs = require('fs');
                    const pathModule = require('path');
                    let cwd = process.cwd();
                    return new Promise((resolve, reject) => {
                        let packageJson = pathModule.join(cwd, 'package.json');
                        if (!fs.existsSync(packageJson)) {
                            resolve('No package.json found in the current directory');
                        }
                        let pkg = require(packageJson);
                        let dependencies = pkg.dependencies || {};
                        let devDependencies = pkg.devDependencies || {};
                        let allDependencies = Object.assign(Object.assign({}, dependencies), devDependencies);
                        let result = JSON.stringify(Object.keys(allDependencies));
                        resolve(result);
                    });
                });
            },
            nextState: null
        },
        "npm-install-npm-library": {
            schema: { type: 'function', function: { name: 'npm-install-npm-library', description: 'Install an npm library in the current workspace', parameters: { type: 'object', properties: { library: { type: 'string', description: 'The name of the npm library to install' } } } } },
            action: function ({ library }, run) {
                return __awaiter(this, void 0, void 0, function* () {
                    const { exec } = require('child_process');
                    const fs = require('fs');
                    const pathModule = require('path');
                    let cwd = process.cwd();
                    return new Promise((resolve, reject) => {
                        let packageJson = pathModule.join(cwd, 'package.json');
                        if (!fs.existsSync(packageJson)) {
                            resolve('No package.json found in the current directory');
                        }
                        exec(`npm install ${library}`, (error, stdout, stderr) => {
                            if (error) {
                                resolve(`Error: ${error.message}`);
                            }
                            if (stderr) {
                                resolve(`Error: ${stderr}`);
                            }
                            resolve(stdout);
                        });
                    });
                });
            },
            nextState: null
        },
        "npm-call-npm-method": {
            //   schema: { type: 'function', function: { name: 'npm-call-npm-method', description: 'Call an npm method in the current workspace', parameters: { type: 'object', properties: { method: { type: 'string', description: 'The name of the npm method to call' }, args: { type: 'array', description: 'The arguments to pass to the npm method' } } } } },
            action: function ({ method, args }, run) {
                return __awaiter(this, void 0, void 0, function* () {
                    const { exec } = require('child_process');
                    const fs = require('fs');
                    const pathModule = require('path');
                    let cwd = process.cwd();
                    return new Promise((resolve, reject) => {
                        let packageJson = pathModule.join(cwd, 'package.json');
                        if (!fs.existsSync(packageJson)) {
                            resolve('No package.json found in the current directory');
                        }
                        exec(`npm ${method} ${args.join(' ')}`, (error, stdout, stderr) => {
                            if (error) {
                                resolve(`Error: ${error.message}`);
                            }
                            if (stderr) {
                                resolve(`Error: ${stderr}`);
                            }
                            resolve(stdout);
                        });
                    });
                });
            },
        },
    }
};
exports.default = module.exports;
