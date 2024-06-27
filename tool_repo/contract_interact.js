// This is javascript code for a tool module
class contract_interactTool {

  async execute(params, api) {
    const { privateKey, contractAddress, abi, methodName, args, provider } = params;
    const { ethers, errorLogger, validatePrivateKey, validateAddress, validateABI } = api;

    errorLogger.debugLog(`contract_interact called with privateKey: ${privateKey}, contractAddress: ${contractAddress}, abi: ${abi}, methodName: ${methodName}, args: ${JSON.stringify(args)}, provider: ${provider}`);

    if (!validatePrivateKey(privateKey)) {
      throw new Error('Invalid private key');
    }

    if (!validateAddress(contractAddress)) {
      throw new Error('Invalid Ethereum address');
    }

    const parsedAbi = JSON.parse(abi);
    if (!validateABI(parsedAbi)) {
      throw new Error('Invalid ABI format');
    }

    errorLogger.debugLog(`Interacting with contract at address: ${contractAddress} with method: ${methodName} and args: ${JSON.stringify(args)} on provider: ${provider}`);

    const wallet = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(provider));
    const contract = new ethers.Contract(contractAddress, parsedAbi, wallet);
    const result = await contract[methodName](...(args || []));

    errorLogger.debugLog(`Method call result: ${result.toString()}`);
    return result.toString();
  }

}

module.exports = new contract_interactTool();