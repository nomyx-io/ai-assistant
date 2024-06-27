// This is javascript code for a tool module
class wait_for_keypressTool {

  async execute({ resultVar }, api) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question('Press any key to continue...', (key) => {
        rl.close();
        if (resultVar) {
          api.store[resultVar] = key;
        }
        resolve(key);
      });
    });
  }

}

module.exports = new wait_for_keypressTool();