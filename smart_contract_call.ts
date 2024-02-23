const { ethers } = require('ethers');

module.exports = (config: any) => ({
  schemas: [{
    type: 'function',
    function: {
      name: 'smart_contract_call',
      description: 'Connects to a configured network, calls a smart contract function, and returns the transaction details.',
      parameters: {
        type: 'object',
        properties: {
          rpcNode: {
            type: 'string',
            description: 'RPC node to connect to.'
          },
          contractAbi: {
            type: 'string',
            description: 'The ABI of the smart contract.'
          },
          contractAddress: {
            type: 'string',
            description: 'The address of the smart contract on the network.'
          },
          functionName: {
            type: 'string',
            description: 'The name of the function to call on the smart contract.'
          },
          functionParams: {
            type: 'string',
            description: 'A comma-delimited list of values to be passed as parameters to the smart contract function.'
          },
          privateKey: {
            type: 'string',
            description: 'The private key for the wallet, if needed for a transactional function call.',
            optional: true
          }
        },
        required: ['rpcNode', 'contractAbi', 'contractAddress', 'functionName', 'functionParams']
      }
    },
  }],
  tools: {
    smart_contract_call: async ({ rpcNode, contractAbi, contractAddress, functionName, functionParams, privateKey }: any) => {
      const provider = new ethers.providers.JsonRpcProvider(rpcNode);
      const contract = new ethers.Contract(contractAddress, contractAbi, provider);

      let wallet;
      if (privateKey) {
        wallet = new ethers.Wallet(privateKey, provider);
      }

      const contractWithSigner = wallet ? contract.connect(wallet) : contract;

      const response = await contractWithSigner[functionName](...functionParams.split(','));
      return response;
    }
  },
  state: {
    modules: [{
      name: 'smart_contract_call',
      description: 'Connects to a configured network, calls a smart contract function, and returns the transaction details.',
      version: '0.0.1',
    }],
  }
})