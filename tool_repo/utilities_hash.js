// This is javascript code for a tool module
class utilities_hashTool {

  async execute(params, api) {
    const { input } = params;
    api.debugLog(`utilities_hash called with input: ${input}`);
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
    api.debugLog(`Hash: ${hash}`);
    return hash;
  }

}

module.exports = new utilities_hashTool();