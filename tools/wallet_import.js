module.exports = {
    wallet_import: {
        schema: {
            "name": "wallet_import",
            "description": "Import an Ethereum wallet from a private key.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "privateKey": {
                        "type": "string",
                        "description": "The private key of the wallet."
                    },
                    "resultVar": {
                        "type": "string",
                        "description": "Optional. The variable to store the patched content in."
                    }
                },
                "required": [
                    "privateKey"
                ]
            },
            "output_schema": {
                "type": "string",
                "description": "The private key of the imported wallet."
            }
        },
        execute: async ({ privateKey, resultVar }: any, api: any) => {
            const ethers = require('ethers');
            const debugLog = api.log;
            // Helper function to validate private key
            function validatePrivateKey(privateKey: string): boolean {
                console.log(`Validating private key: ${privateKey}`);
                return ethers.utils.isHexString(privateKey, 32);
            }
            debugLog(`wallet_import called with privateKey: ${privateKey}`);
            if (!validatePrivateKey(privateKey)) {
                throw new Error('Invalid private key');
            }
            const wallet = new ethers.Wallet(privateKey);
            debugLog(`Imported wallet with private key: ${wallet.privateKey}`);
            if (resultVar) {
                api.store[resultVar] = wallet.privateKey;
                debugLog(`Stored private key in variable: ${resultVar}`);
            }
            return wallet.privateKey;
        },
    }
}