// This is javascript code for a tool module
class utilities_computeAddressTool {

  async execute(params, api) {
    const { publicKey } = params;
    api.debugLog(`utilities_computeAddress called with publicKey: ${publicKey}`);
    const address = api.ethers.utils.computeAddress(publicKey);
    api.debugLog(`Address: ${address}`);
    return address;
  }

}

module.exports = new utilities_computeAddressTool();