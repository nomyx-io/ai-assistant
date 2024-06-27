// This is javascript code for a tool module
class bashTool {

  async execute({ command }, api) {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        resolve(stdout);
      });
    });
  }

}

module.exports = new bashTool();