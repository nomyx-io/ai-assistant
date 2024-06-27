// This is javascript code for a tool module
class utilities_parseEtherTool {

  async execute(params, api) {
    const { ether } = params;
    api.debugLog(`utilities_parseEther called with ether: ${ether}`);
    const weiValue = ethers.utils.parseEther(ether).toString();
    api.debugLog(`Wei value: ${weiValue}`);
    return weiValue;
  }

}

module.exports = new utilities_parseEtherTool();