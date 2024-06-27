// This is javascript code for a tool module
class wallet_balanceTool {

  async execute({ address, provider, resultVar }, api) {
    const { ethers } = require('ethers');
    const { debugLog } = require('./errorLogger');

    debugLog(`wallet_balance called with address: ${address}, provider: ${provider}`);
    if (!this.validateAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    debugLog(`Getting balance for address: ${address} from provider: ${provider}`);
    const balance = await new ethers.providers.JsonRpcProvider(provider).getBalance(address);
    debugLog(`Balance: ${balance}`);
    if (resultVar) {
      api.store[resultVar] = ethers.utils.formatEther(balance);
      debugLog(`Stored balance in variable: ${resultVar}`);
    }
    return ethers.utils.formatEther(balance);
  }

  validateAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

}

module.exports = new wallet_balanceTool();