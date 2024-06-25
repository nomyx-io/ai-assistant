// assistant/tools/evm.ts
const ethers = require('ethers');
import { debugLog } from '../errorLogger';

// Helper function to validate address
function validateAddress(address: string): boolean {
  debugLog(`Validating address: ${address}`);
  return ethers.utils.isAddress(address);
}

// Helper function to validate private key
function validatePrivateKey(privateKey: string): boolean {
  debugLog(`Validating private key: ${privateKey}`);
  return ethers.utils.isHexString(privateKey, 32);
}

// Helper function to validate ABI
function validateABI(abi: any): boolean {
  debugLog(`Validating ABI: ${JSON.stringify(abi)}`);
  return Array.isArray(abi);
}

// Helper function to validate transaction
function validateTransaction(transaction: any): boolean {
  debugLog(`Validating transaction: ${JSON.stringify(transaction)}`);
  return transaction.to && transaction.value && typeof transaction.to === 'string' && typeof transaction.value === 'string';
}

module.exports = {
  enabled: true,
  tools: {
    wallet_create: {
      schema: {
        "name": "wallet_create",
        "description": "Create a new Ethereum wallet.",
        "input_schema": {
          "type": "object",
          "properties": {
            "resultVar": {
              "type": "string",
              "description": "Optional. The variable to store the patched content in."
            }
          },
          "required": []
        },
        "output_schema": {
          "type": "string",
          "description": "The private key of the newly created wallet."
        }
      },
      action: async ({resultVar}: any, api: any) => {
        debugLog('wallet_create called');
        const wallet = ethers.Wallet.createRandom();
        debugLog(`Created new wallet with private key: ${wallet.privateKey}`);
        if (resultVar) {
          api.store[resultVar] = wallet.privateKey;
          debugLog(`Stored private key in variable: ${resultVar}`);
        }
        return wallet.privateKey;
      },
    },
    wallet_import: {
      schema: {
        "name": "wallet_import",
        "description": "Import an Ethereum wallet from a private key.",
        "input_schema": {
          "type": "object",
          "properties": {
            "privateKey": {
              "type": "string",
              "description": "The private key of the wallet."
            },
            "resultVar": {
              "type": "string",
              "description": "Optional. The variable to store the patched content in."
            }
          },
          "required": [
            "privateKey"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The private key of the imported wallet."
        }
      },
      action: async ({ privateKey, resultVar }:any, api: any) => {
        debugLog(`wallet_import called with privateKey: ${privateKey}`);
        if (!validatePrivateKey(privateKey)) {
          throw new Error('Invalid private key');
        }
        const wallet = new ethers.Wallet(privateKey);
        debugLog(`Imported wallet with private key: ${wallet.privateKey}`);
        if (resultVar) {
          api.store[resultVar] = wallet.privateKey;
          debugLog(`Stored private key in variable: ${resultVar}`);
        }
        return wallet.privateKey;
      },
    },
    wallet_balance: {
      schema: {
        "name": "wallet_balance",
        "description": "Get the balance of an Ethereum wallet.",
        "input_schema": {
          "type": "object",
          "properties": {
            "address": {
              "type": "string",
              "description": "The address of the wallet."
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            },
            "resultVar": {
              "type": "string",
              "description": "Optional. The variable to store the patched content in."
            }
          },
          "required": [
            "address",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The balance of the wallet in ether."
        }
      },
      action: async ({ address, provider, resultVar }: any, api: any) => {
        debugLog(`wallet_balance called with address: ${address}, provider: ${provider}`);
        if (!validateAddress(address)) {
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
      },
    },
    wallet_sendTransaction: {
      schema: {
        "name": "wallet_sendTransaction",
        "description": "Send a transaction from an Ethereum wallet.",
        "input_schema": {
          "type": "object",
          "properties": {
            "privateKey": {
              "type": "string",
              "description": "The private key of the wallet."
            },
            "transaction": {
              "type": "object",
              "properties": {
                "to": {
                  "type": "string",
                  "description": "The address of the recipient."
                },
                "value": {
                  "type": "string",
                  "description": "The amount to send in wei."
                },
                "gasLimit": {
                  "type": "string",
                  "description": "Optional. The gas limit for the transaction."
                },
                "nonce": {
                  "type": "number",
                  "description": "Optional. The nonce for the transaction."
                },
              },
              "required": [
                "to",
                "value"
              ]
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "privateKey",
            "transaction",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The transaction hash."
        }
      },
      action: async ({ privateKey, transaction, provider }: { privateKey: string, transaction: any, provider: string }) => {
        debugLog(`wallet_sendTransaction called with privateKey: ${privateKey}, transaction: ${JSON.stringify(transaction)}, provider: ${provider}`);
        if (!validatePrivateKey(privateKey)) {
          throw new Error('Invalid private key');
        }
        if (!validateTransaction(transaction)) {
          throw new Error('Invalid transaction object');
        }
        debugLog(`Sending transaction from wallet with private key: ${privateKey} to provider: ${provider}`);
        const wallet = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(provider));
        const tx = await wallet.sendTransaction(transaction);
        debugLog(`Transaction hash: ${tx.hash}`);
        return tx.hash;
      },
    },
    wallet_estimateGas: {
      schema: {
        "name": "wallet_estimateGas",
        "description": "Estimate the gas cost of an Ethereum transaction.",
        "input_schema": {
          "type": "object",
          "properties": {
            "transaction": {
              "type": "object",
              "properties": {
                "to": {
                  "type": "string",
                  "description": "The address of the recipient."
                },
                "value": {
                  "type": "string",
                  "description": "The amount to send in wei."
                },
                "data": {
                  "type": "string",
                  "description": "Optional. The data for the transaction."
                },
              },
              "required": [
                "to",
                "value"
              ]
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "transaction",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The estimated gas cost."
        }
      },
      action: async ({ transaction, provider }: { transaction: any, provider: string }) => {
        debugLog(`wallet_estimateGas called with transaction: ${JSON.stringify(transaction)}, provider: ${provider}`);
        if (!validateTransaction(transaction)) {
          throw new Error('Invalid transaction object');
        }
        debugLog(`Estimating gas for transaction: ${JSON.stringify(transaction)} on provider: ${provider}`);
        const gasEstimate = await new ethers.providers.JsonRpcProvider(provider).estimateGas(transaction);
        debugLog(`Gas estimate: ${gasEstimate.toString()}`);
        return gasEstimate.toString();
      },
    },
    contract_deploy: {
      schema: {
        "name": "contract_deploy",
        "description": "Deploy an Ethereum smart contract.",
        "input_schema": {
          "type": "object",
          "properties": {
            "privateKey": {
              "type": "string",
              "description": "The private key of the wallet."
            },
            "abi": {
              "type": "string",
              "description": "The ABI of the contract, as a JSON string."
            },
            "bytecode": {
              "type": "string",
              "description": "The bytecode of the contract."
            },
            "args": {
              "type": "array",
              "description": "The arguments for the contract constructor."
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "privateKey",
            "abi",
            "bytecode",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The address of the deployed contract."
        }
      },
      action: async ({ privateKey, abi, bytecode, args, provider }: { privateKey: string, abi: string, bytecode: string, args: any[], provider: string }) => {
        debugLog(`contract_deploy called with privateKey: ${privateKey}, abi: ${abi}, bytecode: ${bytecode}, args: ${JSON.stringify(args)}, provider: ${provider}`);
        if (!validatePrivateKey(privateKey)) {
          throw new Error('Invalid private key');
        }
        const parsedAbi = JSON.parse(abi);
        if (!validateABI(parsedAbi)) {
          throw new Error('Invalid ABI format');
        }
        debugLog(`Deploying contract with ABI: ${JSON.stringify(parsedAbi)} and bytecode: ${bytecode} to provider: ${provider}`);
        const wallet = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(provider));
        const factory = new ethers.ContractFactory(parsedAbi, bytecode, wallet);
        const contract = await factory.deploy(...(args || []));
        await contract.deployed();
        debugLog(`Contract deployed at address: ${contract.address}`);
        return contract.address;
      },
    },
    contract_interact: {
      schema: {
        "name": "contract_interact",
        "description": "Interact with an Ethereum smart contract.",
        "input_schema": {
          "type": "object",
          "properties": {
            "privateKey": {
              "type": "string",
              "description": "The private key of the wallet."
            },
            "contractAddress": {
              "type": "string",
              "description": "The address of the contract."
            },
            "abi": {
              "type": "string",
              "description": "The ABI of the contract, as a JSON string."
            },
            "methodName": {
              "type": "string",
              "description": "The name of the method to call."
            },
            "args": {
              "type": "array",
              "description": "The arguments for the method."
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "privateKey",
            "contractAddress",
            "abi",
            "methodName",
            "args",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The result of the method call."
        }
      },
      action: async ({ privateKey, contractAddress, abi, methodName, args, provider }: { privateKey: string, contractAddress: string, abi: string, methodName: string, args: any[], provider: string }) => {
        debugLog(`contract_interact called with privateKey: ${privateKey}, contractAddress: ${contractAddress}, abi: ${abi}, methodName: ${methodName}, args: ${JSON.stringify(args)}, provider: ${provider}`);
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
        debugLog(`Interacting with contract at address: ${contractAddress} with method: ${methodName} and args: ${JSON.stringify(args)} on provider: ${provider}`);
        const wallet = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(provider));
        const contract = new ethers.Contract(contractAddress, parsedAbi, wallet);
        const result = await contract[methodName](...(args || []));
        debugLog(`Method call result: ${result.toString()}`);
        return result.toString();
      },
    },
    contract_call: {
      schema: {
        "name": "contract_call",
        "description": "Call a method of an Ethereum smart contract.",
        "input_schema": {
          "type": "object",
          "properties": {
            "contractAddress": {
              "type": "string",
              "description": "The address of the contract."
            },
            "abi": {
              "type": "string",
              "description": "The ABI of the contract, as a JSON string."
            },
            "methodName": {
              "type": "string",
              "description": "The name of the method to call."
            },
            "args": {
              "type": "array",
              "description": "The arguments for the method."
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "contractAddress",
            "abi",
            "methodName",
            "args",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The result of the method call."
        }
      },
      action: async ({ contractAddress, abi, methodName, args, provider }: { contractAddress: string, abi: string, methodName: string, args: any[], provider: string }) => {
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
      },
    },
    contract_events: {
      schema: {
        "name": "contract_events",
        "description": "Get events emitted by an Ethereum smart contract.",
        "input_schema": {
          "type": "object",
          "properties": {
            "contractAddress": {
              "type": "string",
              "description": "The address of the contract."
            },
            "abi": {
              "type": "string",
              "description": "The ABI of the contract, as a JSON string."
            },
            "eventName": {
              "type": "string",
              "description": "The name of the event to listen for."
            },
            "filters": {
              "type": "object",
              "description": "The filters to apply to the event."
            },
            "provider": {
              "type": "string",
              "description": "The provider URL."
            }
          },
          "required": [
            "contractAddress",
            "abi",
            "eventName",
            "filters",
            "provider"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "A JSON stringified array of event data."
        }
      },
      action: async ({ contractAddress, abi, eventName, filters, provider }: { contractAddress: string, abi: string, eventName: string, filters: any, provider: string }) => {
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
        return JSON.stringify(events.map((event: any) => event.args));
      },
    },
    utilities_formatEther: {
      schema: {
        "name": "utilities_formatEther",
        "description": "Convert a value from wei to ether.",
        "input_schema": {
          "type": "object",
          "properties": {
            "wei": {
              "type": "string",
              "description": "The value in wei."
            }
          },
          "required": [
            "wei"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The value in ether."
        }
      },
      action: async ({ wei }: { wei: string }) => {
        debugLog(`utilities_formatEther called with wei: ${wei}`);
        const etherValue = ethers.utils.formatEther(wei);
        debugLog(`Ether value: ${etherValue}`);
        return etherValue;
      },
    },
    utilities_parseEther: {
      schema: {
        "name": "utilities_parseEther",
        "description": "Convert a value from ether to wei.",
        "input_schema": {
          "type": "object",
          "properties": {
            "ether": {
              "type": "string",
              "description": "The value in ether."
            }
          },
          "required": [
            "ether"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The value in wei."
        }
      },
      action: async ({ ether }: { ether: string }) => {
        debugLog(`utilities_parseEther called with ether: ${ether}`);
        const weiValue = ethers.utils.parseEther(ether).toString();
        debugLog(`Wei value: ${weiValue}`);
        return weiValue;
      },
    },
    utilities_hash: {
      schema: {
        "name": "utilities_hash",
        "description": "Compute the hash of a value.",
        "input_schema": {
          "type": "object",
          "properties": {
            "input": {
              "type": "string",
              "description": "The input value."
            }
          },
          "required": [
            "input"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The hash of the input value."
        }
      },
      action: async ({ input }: { input: string }) => {
        debugLog(`utilities_hash called with input: ${input}`);
        const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
        debugLog(`Hash: ${hash}`);
        return hash;
      },
    },
    utilities_computeAddress: {
      schema: {
        "name": "utilities_computeAddress",
        "description": "Compute the address of a public key.",
        "input_schema": {
          "type": "object",
          "properties": {
            "publicKey": {
              "type": "string",
              "description": "The public key."
            }
          },
          "required": [
            "publicKey"
          ]
        },
        "output_schema": {
          "type": "string",
          "description": "The address corresponding to the public key."
        }
      },
      action: async ({ publicKey }: { publicKey: string }) => {
        debugLog(`utilities_computeAddress called with publicKey: ${publicKey}`);
        const address = ethers.utils.computeAddress(publicKey);
        debugLog(`Address: ${address}`);
        return address;
      },
    },
  },
};
