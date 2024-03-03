module.exports = {
    enabled: true,
    tools: {
        "npm-list-npm-libraries": {
            schema: { type: 'function', function: { name: 'npm-list-npm-libraries', description: 'List all npm libraries in the current workspace', parameters: { type: 'object', properties: { path: { type: 'string', description: 'The path of the directory to list the npm libraries from' } } } } },
            action: async function (_: any, run: any) {
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
                    let allDependencies = {...dependencies, ...devDependencies};
                    let result = JSON.stringify( Object.keys(allDependencies) );
                    resolve(result);
                });
            },
            nextState: null
        },
        "npm-install-npm-library": {
            schema: { type: 'function', function: { name: 'npm-install-npm-library', description: 'Install an npm library in the current workspace', parameters: { type: 'object', properties: { library: { type: 'string', description: 'The name of the npm library to install' } } } } },
            action: async function ({ library }: any, run: any) {
                const { exec } = require('child_process');
                const fs = require('fs');
                const pathModule = require('path');
                let cwd = process.cwd();
                return new Promise((resolve, reject) => {
                    let packageJson = pathModule.join(cwd, 'package.json');
                    if (!fs.existsSync(packageJson)) {
                        resolve('No package.json found in the current directory');
                    }
                    exec(`npm install ${library}`, (error: any, stdout: any, stderr: any) => {
                        if (error) {
                            resolve(`Error: ${error.message}`);
                        }
                        if (stderr) {
                            resolve(`Error: ${stderr}`);
                        }
                        resolve(stdout);
                    });
                });
            },
            nextState: null
        },
        "npm-call-npm-method": {
         //   schema: { type: 'function', function: { name: 'npm-call-npm-method', description: 'Call an npm method in the current workspace', parameters: { type: 'object', properties: { method: { type: 'string', description: 'The name of the npm method to call' }, args: { type: 'array', description: 'The arguments to pass to the npm method' } } } } },
            action: async function ({ method, args }: any, run: any) {
                const { exec } = require('child_process');
                const fs = require('fs');
                const pathModule = require('path');
                let cwd = process.cwd();
                return new Promise((resolve, reject) => {
                    let packageJson = pathModule.join(cwd, 'package.json');
                    if (!fs.existsSync(packageJson)) {
                        resolve('No package.json found in the current directory');
                    }
                    exec(`npm ${method} ${args.join(' ')}`, (error: any, stdout: any, stderr: any) => {
                        if (error) {
                            resolve(`Error: ${error.message}`);
                        }
                        if (stderr) {
                            resolve(`Error: ${stderr}`);
                        }
                        resolve(stdout);
                    });
                });
            },
        },
    }
};

export default module.exports;
