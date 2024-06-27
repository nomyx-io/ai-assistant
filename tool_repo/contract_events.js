// This is javascript code for a tool module
class contract_eventsTool {

  async execute(params, api) {
    const { contractAddress, abi, eventName, filters, provider } = params;
    const { ethers, validateAddress, validateABI, debugLog } = api;

    debugLog(`contract_events called with contractAddress: ${contractAddress}, abi: ${abi}, eventName: ${eventName}, filters: ${JSON.stringify(filters)}, provider: ${provider}`);
    
    if (!validateAddress(contractAddress)) {
      throw new Error('Invalid Ethereum address');
    }
    
    const parsedAbi = JSON.parse(abi);
    if (!validateABI(parsedAbi)) {
      throw new Error('Invalid ABI format');
    }
    
    debugLog(`Getting events for contract: ${contractAddress}, event: ${eventName}, filters: ${JSON.stringify(filters)} from provider: ${provider}`);
    
    const contract = new ethers.Contract(contractAddress, parsedAbi, new ethers.providers.JsonRpcProvider(provider));
    const events = await contract.queryFilter(contract.filters[eventName](), filters);
    
    debugLog(`Events: ${JSON.stringify(events)}`);
    
    return JSON.stringify(events.map((event) => event.args));
  }

}

module.exports = new contract_eventsTool();