// This is javascript code for a tool module
class wallet_createTool {

  async execute({ resultVar }, api) {
    const { ethers } = require('ethers');
    const { debugLog } = require('./errorLogger');

    debugLog('wallet_create called');
    const wallet = ethers.Wallet.createRandom();
    debugLog(`Created new wallet with private key: ${wallet.privateKey}`);
    if (resultVar) {
      api.store[resultVar] = wallet.privateKey;
      debugLog(`Stored private key in variable: ${resultVar}`);
    }
    return wallet.privateKey;
  }

}

module.exports = new wallet_createTool();