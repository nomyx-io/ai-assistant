// This is javascript code for a tool module
class wallet_estimateGasTool {

  async execute(params, api) {
    const { transaction, provider } = params;
    const { debugLog } = api.errorLogger;

    debugLog(`wallet_estimateGas called with transaction: ${JSON.stringify(transaction)}, provider: ${provider}`);
    
    if (!this.validateTransaction(transaction)) {
      throw new Error('Invalid transaction object');
    }

    debugLog(`Estimating gas for transaction: ${JSON.stringify(transaction)} on provider: ${provider}`);
    
    const ethers = api.ethers;
    const gasEstimate = await new ethers.providers.JsonRpcProvider(provider).estimateGas(transaction);
    
    debugLog(`Gas estimate: ${gasEstimate.toString()}`);
    
    return gasEstimate.toString();
  }

  validateTransaction(transaction) {
    return transaction && transaction.to && transaction.value;
  }

}

module.exports = new wallet_estimateGasTool();