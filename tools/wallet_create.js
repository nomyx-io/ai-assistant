module.exports = {
    wallet_create: {
        schema: {
            "name": "wallet_create",
            "description": "Create a new Ethereum wallet.",
            "input_schema": {
                "methodSignature": "wallet_create({ resultVar?: string })",
                "required": []
            },
            "output_schema": {
                "type": "string",
                "description": "The private key of the newly created wallet."
            }
        },
        execute: async ({ resultVar }: any, api: any) => {
            const ethers = require('ethers');
            const debugLog = api.log;
            debugLog('wallet_create called');
            const wallet = ethers.Wallet.createRandom();
            debugLog(`Created new wallet with private key: ${wallet.privateKey}`);
            if (resultVar) {
                api.store[resultVar] = wallet.privateKey;
                debugLog(`Stored private key in variable: ${resultVar}`);
            }
            return wallet.privateKey;
        },
    }
}