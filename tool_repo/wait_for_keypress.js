const readline = require('readline');

class WaitForKeypress {
  async wait_for_keypress(resultVar) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question('Press any key to continue...', (key) => {
        rl.close();
        if (resultVar) {
          this.api.store[resultVar] = key;
        }
        resolve(key);
      });
    });
  }
}

module.exports = WaitForKeypress;