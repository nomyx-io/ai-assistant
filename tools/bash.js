module.exports = {
    'bash': {
        'name': 'bash',
        'version': '1.0.0',
        'description': 'Performs bash operations. Supported operations include execute.',
        'schema': {
            'name': 'bash',
            'description': 'Performs bash operations. Supported operations include execute.',
            "methodSignature": "bash({ operations: { operation: string, command: string }[] }): string",
        },
        execute: async function ({ operations }, run) {
            try {
                const { execSync } = require('child_process');
                for (const { operation, command } of operations) {
                    switch (operation) {
                        case 'execute':
                            execSync(command);
                            break;
                    }
                }
                return 'Success';
            }
            catch (error) {
                return error.message;
            }
        },
    }
}