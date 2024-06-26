({ resultVar }, api) => __awaiter(this, void 0, void 0, function* () {
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
                })