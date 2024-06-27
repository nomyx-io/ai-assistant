// This is javascript code for a tool module
class utilities_formatEtherTool {

  async execute(params, api) {
    const { wei } = params;
    const { ethers, errorLogger_1 } = api;

    errorLogger_1.debugLog(`utilities_formatEther called with wei: ${wei}`);
    const etherValue = ethers.utils.formatEther(wei);
    errorLogger_1.debugLog(`Ether value: ${etherValue}`);
    return etherValue;
  }

}

module.exports = new utilities_formatEtherTool();