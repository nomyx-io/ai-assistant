// include all required libraries and dependencies in the tool file here
module.exports = {
  state: {
  },
  schemas: [
    {type: 'function', function: {name: 'npm_call_npm_method', description: 'Calls a method from a npm library', parameters: {type: 'object', properties: {npmlib: {type: 'string', description: 'The name of the npm library'}, method: {type: 'string', description: 'The name of the method to be called'}, args: {type: 'string', description: 'The arguments to be passed to the method'}}, required: ['npmlib', 'method', 'args']}}},
    {type: 'function', function: {name: 'npm_list_npm_libraries', description: 'Lists all npm libraries installed in the current directory'}},
    {type: 'function', function: {name: 'npm_install_npm_library', description: 'Installs a new npm library', parameters: {type: 'object', properties: {library: {type: 'string', description: 'The name of the npm library to be installed'}}, required: ['library']}}},
  ],
  tools: {
    npm_list_npm_libraries: async function (_: any, run: any) {
      const fs = require('fs');
      const pathModule = require('path');
      const os = require('os');
      let cwd = process.cwd();
      return new Promise((resolve, reject) => {
        let packageJson = pathModule.join(cwd, 'package.json');
        if (!fs.existsSync(packageJson)) {
          resolve('No package.json found in the current directory');
        }
        let pkg: any = require(packageJson);
        let dependencies = pkg.dependencies || {};
        let devDependencies = pkg.devDependencies || {};
        let allDependencies = {...dependencies, ...devDependencies};
        let result = JSON.stringify( Object.keys(allDependencies) );
        resolve(result);
      });
    },
    npm_install_npm_library: async function ({library}: any, run: any) {
      return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`npm install ${library}`, (error: any, stdout: any, stderr: any) => { 
          if (error) { 
            console.error(`exec error: ${error}`); 
            resolve('error: ' + error + ' ' + stderr);
          } 
          resolve(stdout);
        }); 
      });
    },
    npm_call_npm_method: async function ({npmlib, method, args}: any, run: any) {
      let lib = require(npmlib);
      let result = lib[method](args);
      return JSON.stringify(result);
    }
  }
}
export default module.exports;