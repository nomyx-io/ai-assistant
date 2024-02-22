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
// include all required libraries and dependencies in the tool file here
module.exports = {
    state: {},
    schemas: [
        { type: 'function', function: { name: 'npm_call_npm_method', description: 'Calls a method from a npm library', parameters: { type: 'object', properties: { npmlib: { type: 'string', description: 'The name of the npm library' }, method: { type: 'string', description: 'The name of the method to be called' }, args: { type: 'string', description: 'The arguments to be passed to the method' } }, required: ['npmlib', 'method', 'args'] } } },
        { type: 'function', function: { name: 'npm_list_npm_libraries', description: 'Lists all npm libraries installed in the current directory' } },
        { type: 'function', function: { name: 'npm_install_npm_library', description: 'Installs a new npm library', parameters: { type: 'object', properties: { library: { type: 'string', description: 'The name of the npm library to be installed' } }, required: ['library'] } } },
    ],
    tools: {
        npm_list_npm_libraries: function (_, run) {
            return __awaiter(this, void 0, void 0, function* () {
                const fs = require('fs');
                const pathModule = require('path');
                const os = require('os');
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
        npm_install_npm_library: function ({ library }, run) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    const { exec } = require('child_process');
                    exec(`npm install ${library}`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            resolve('error: ' + error + ' ' + stderr);
                        }
                        resolve(stdout);
                    });
                });
            });
        },
        npm_call_npm_method: function ({ npmlib, method, args }, run) {
            return __awaiter(this, void 0, void 0, function* () {
                let lib = require(npmlib);
                let result = lib[method](args);
                return JSON.stringify(result);
            });
        }
    }
};
//# sourceMappingURL=npm.js.map