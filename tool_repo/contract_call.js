// This is javascript code for a tool module
class contract_callTool {

  async execute(params, api) {
    const { contractAddress, abi, methodName, args, provider } = params;
    const { ethers, validateAddress, validateABI, debugLog } = api;

    debugLog(`contract_call called with contractAddress: ${contractAddress}, abi: ${abi}, methodName: ${methodName}, args: ${JSON.stringify(args)}, provider: ${provider}`);

    if (!validateAddress(contractAddress)) {
      throw new Error('Invalid Ethereum address');
    }

    const parsedAbi = JSON.parse(abi);
    if (!validateABI(parsedAbi)) {
      throw new Error('Invalid ABI format');
    }

    debugLog(`Calling contract method: ${methodName} with args: ${JSON.stringify(args)} on provider: ${provider}`);

    const contract = new ethers.Contract(contractAddress, parsedAbi, new ethers.providers.JsonRpcProvider(provider));
    const result = await contract[methodName](...(args || []));

    debugLog(`Method call result: ${result.toString()}`);
    return result.toString();
  }

}

module.exports = new contract_callTool();