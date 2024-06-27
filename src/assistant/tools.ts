
// tools.ts
// tools.ts
import 'dotenv/config';
import shell from 'shelljs';
import Conversation from './conversation';
import validator from 'validator';
import * as fs from 'fs/promises'; // Use fs.promises for async/await
import ajv from 'ajv';
import { text } from 'blessed';

const ethers = require('ethers');
import { debugLog } from './errorLogger';

// Helper function to validate address
function validateAddress(address: string): boolean {
  console.log(`Validating address: ${address}`);
  return ethers.utils.isAddress(address);
}

// Helper function to validate private key
function validatePrivateKey(privateKey: string): boolean {
  console.log(`Validating private key: ${privateKey}`);
  return ethers.utils.isHexString(privateKey, 32);
}

// Helper function to validate ABI
function validateABI(abi: any): boolean {
  console.log(`Validating ABI: ${JSON.stringify(abi)}`);
  return Array.isArray(abi);
}

// Helper function to validate transaction
function validateTransaction(transaction: any): boolean {
  console.log(`Validating transaction: ${JSON.stringify(transaction)}`);
  return transaction.to && transaction.value && typeof transaction.to === 'string' && typeof transaction.value === 'string';
}


const jsonSchemaValidator = new ajv();

async function jsonValidator(
  jsonSchema: string,
  jsonData: string,
): Promise<boolean> {
  try {
    const schema = JSON.parse(jsonSchema);
    const data = JSON.parse(jsonData);
    const validate = jsonSchemaValidator.compile(schema);
    const valid = validate(data);
    return valid;
  } catch (error) {
    return false;
  }
}


// Generic error handling function for file system operations
async function handleFileError(context: any, api: any) {
  const logError = (message: string, level: string = 'error') => {
    api.emit('error', `[${level.toUpperCase()}] ${message} `);
  };

  logError(`File operation error: ${JSON.stringify(context)} `);

  let llmResponse = await api.conversation.chat([
    {
      role: 'system',
      content: 'Analyze the file operation error and suggest a fix.',
    },
    {
      role: 'user',
      content: JSON.stringify(context),
    },
  ]);
  llmResponse = llmResponse.content[0].text.trim();

  if (llmResponse.fix) {
    logError(`Attempting LLM fix: ${llmResponse.fix} `, 'debug');
    try {
      // Attempt to apply the LLM's fix (make sure it's safe!)
      // ... (Implement safe fix application logic here)
    } catch (fixError: any) {
      logError(`LLM fix attempt failed: ${fixError.message} `, 'error');
    }
  }

  // Safe Fallback:
  if (context.errorCode === 'ENOENT') {
    logError('File not found. Suggest creating the file or checking the path.', 'info');
    // ... (Implement logic to suggest file creation or path correction)
  } else {
    logError(`Unhandled file error code: ${context.errorCode} `, 'error');
    // ... (Handle other error codes with appropriate fallbacks)
  }
}

export const tools: { [key: string]: any } = {
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
    execute: async ({ resultVar }: any, api: any) => {
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
    execute: async ({ privateKey, resultVar }: any, api: any) => {
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
    execute: async ({ address, provider, resultVar }: any, api: any) => {
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
    execute: async ({ privateKey, transaction, provider }: { privateKey: string, transaction: any, provider: string }) => {
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
    execute: async ({ transaction, provider }: { transaction: any, provider: string }) => {
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
    execute: async ({ privateKey, abi, bytecode, args, provider }: { privateKey: string, abi: string, bytecode: string, args: any[], provider: string }) => {
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
    execute: async ({ privateKey, contractAddress, abi, methodName, args, provider }: { privateKey: string, contractAddress: string, abi: string, methodName: string, args: any[], provider: string }) => {
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
    execute: async ({ contractAddress, abi, methodName, args, provider }: { contractAddress: string, abi: string, methodName: string, args: any[], provider: string }) => {
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
    execute: async ({ contractAddress, abi, eventName, filters, provider }: { contractAddress: string, abi: string, eventName: string, filters: any, provider: string }) => {
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
    execute: async ({ wei }: { wei: string }) => {
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
    execute: async ({ ether }: { ether: string }) => {
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
    execute: async ({ input }: { input: string }) => {
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
    execute: async ({ publicKey }: { publicKey: string }) => {
      debugLog(`utilities_computeAddress called with publicKey: ${publicKey}`);
      const address = ethers.utils.computeAddress(publicKey);
      debugLog(`Address: ${address}`);
      return address;
    },
  },
  // 'files': {
  //    'name': 'files',
  //    'version': '1.0.0',
  //    'description': 'Performs batch file operations.',
  //    'schema': {
  //     'name': 'files',
  //     'description': 'Performs batch file operations.',
  //     'input_schema': {
  //      'type': 'object',
  //      'properties': {
  //       'operations': {
  //        'type': 'array',
  //        'description': 'An array of file operations to perform.',
  //        'items': {
  //         'type': 'object',
  //         'properties': {
  //          'operation': {
  //           'type': 'string',
  //           'description': 'The operation to perform on the file.',
  //           'enum': ['read', 'append', 'prepend', 'replace', 'insert_at', 'remove', 'delete', 'copy', 'attach', 'list_attached', 'detach'],
  //          },
  //          'path': {
  //           'type': 'string',
  //           'description': "The path to the file. Required for all operations except 'list_attached'.",
  //          },
  //          'match': {
  //           'type': 'string',
  //           'description': "The string or regex pattern to match. Required for 'replace' and 'remove' operations.",
  //          },
  //          'data': {
  //           'type': 'string',
  //           'description': "The data to write, append, prepend, replace, or insert. Required for 'write', 'append', 'prepend', 'replace', and 'insert_at' operations.",
  //          },
  //          'position': {
  //           'type': 'number',
  //           'description': "The position to insert the data at. Required for 'insert_at' operation.",
  //          },
  //          'target': {
  //           'type': 'string',
  //           'description': "The target path for the 'copy' operation.",
  //          },
  //         },
  //         'required': ['operation'],
  //        },
  //       },
  //      },
  //      'required': ['operations'],
  //     },
  //     'output_schema': {
  //      'type': 'string',
  //      'description': 'A message indicating the result of the batch file operations.',
  //     },
  //    },
  //    execute: async function ({ operations }: any, run: any) {
  //     try {
  //      const fs = require('fs');
  //      const pathModule = require('path');
  //      const cwd = process.cwd();
  //      for (const { operation, path, match, data, position, target } of operations) {
  //       const p = pathModule.join(cwd, path || '');
  //       const t = pathModule.join(cwd, target || '');
  //       if (!fs.existsSync(p || t)) {
  //        return `Error: File not found at path ${p || t} `;
  //       }
  //       let text = fs.readFileSync(p, 'utf8');
  //       switch (operation) {
  //        case 'read':
  //         return text;
  //        case 'append':
  //         text += data;
  //         break;
  //        case 'prepend':
  //         text = data + text;
  //         break;
  //        case 'replace':
  //         text = text.replace(match, data);
  //         break;
  //        case 'insert_at':
  //         text = text.slice(0, position) + data + text.slice(position);
  //         break;
  //        case 'remove':
  //         text = text.replace(match, '');
  //         break;
  //        case 'delete':
  //         fs.unlinkSync(p);
  //         break;
  //        case 'copy':
  //         fs.copyFileSync(p, t);
  //         break;
  //        default:
  //         return `Error: Unsupported operation ${operation} `;
  //       }
  //       fs.writeFileSync(p, text);
  //      }
  //      return `Successfully executed batch operations on files`;
  //     } catch (error: any) {
  //      const context = {
  //       errorCode: error.code,
  //       operations: operations,
  //       // ... other details
  //      };
  //      await handleFileError(context, run);
  //      return `File operation '${operations}' failed. Check logs for details.`;
  //     }
  //    },
  //   }, 
  //   'get_file_tree': {
  //     'name': 'get_file_tree',
  //     'version': '1.0.0',
  //     'description': 'Retrieves the file tree structure from the given path.',
  //     'schema': {
  //       'name': 'get_file_tree',
  //       'description': 'Retrieves the file tree structure from the given path.',
  //       'methodSignature': 'get_file_tree(value: string, n: number): object',
  //     },
  //     execute: async ({ value, n }: any, state: any) => {
  //       const fs = require('fs');
  //       const pathModule = require('path');
  //       const cwd = process.cwd();
  //       const explore = (dir: any, depth: any) => {
  //         dir = pathModule.join(cwd, dir || '');
  //         if (depth < 0) return null;
  //         const directoryTree: any = { path: dir, children: [] };
  //         try {
  //           const fsd = fs.readdirSync(dir, { withFileTypes: true });
  //           fsd.forEach((dirent: any) => {
  //             const fullPath = pathModule.join(dir, dirent.name); // Use pathModule instead of path
  //             // ignore node_modules and .git directories
  //             if (dirent.isDirectory() && (dirent.name === 'node_modules' || dirent.name === '.git')) return;
  //             if (dirent.isDirectory()) {
  //               directoryTree.children.push(explore(fullPath, depth - 1));
  //             } else {
  //               directoryTree.children.push({ path: fullPath });
  //             }
  //           });
  //         } catch (e: any) {
  //           return e.message;
  //         }
  //         return directoryTree;
  //       };
  //       return explore(value, n);
  //     },
  //   },
  'say_aloud': {
    'name': 'say_aloud',
    'version': '1.0.0',
    'description': 'Speaks the given text aloud using PlayHT. PASS IN A text and voice PARAMETERS TO SPEAK ALOUD.',
    'schema': {
      'name': 'say_aloud',
      'description': 'Speaks the given text aloud using PlayHT. PASS IN A text and voice PARAMETERS TO SPEAK ALOUD. voice can be either \'male\' or \'female\'.',
      'methodSignature': 'say_aloud({text, voice}:{string, string}): string',
    },
    execute: async (params: any, api: any) => {
      const PlayHT = require('playht');
      const fs = require('fs');
      var player = require('play-sound')({});

      const apiKey = process.env.PLAYHT_AUTHORIZATION;
      const userId = process.env.PLAYHT_USER_ID;
      const maleVoice = process.env.PLAYHT_MALE_VOICE;
      const femaleVoice = process.env.PLAYHT_FEMALE_VOICE;

      // Initialize PlayHT API
      PlayHT.init({
        apiKey: apiKey,
        userId: userId,
      });
      function getNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      async function speakSentence(sentence: string, voice: string) {
        if (!sentence) return;
        const stream = await PlayHT.stream(sentence, {
          voiceEngine: 'PlayHT2.0-turbo',
          voiceId: voice === 'male' ? maleVoice : femaleVoice,
        });
        const chunks: any = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));

        return new Promise((resolve, reject) => {
          stream.on('end', () => {
            const buf = Buffer.concat(chunks);
            // save the audio to a file
            const filename = `${getNonce()}.mp3`;
            fs.writeFileSync(filename, buf);
            player.play(
              filename,
              function (err: any) {
                fs.unlinkSync(filename);
                resolve('done');
              },
            );
          });
        });
      }

      if (!Array.isArray(params)) params = [params];
      for (const param of params) {
        // if params is a string, convert it to an object
        let { text, voice } = param;
        voice = voice || 'female';
        if (!text) throw new Error('Text is required to speak aloud');
        if (!voice) throw new Error('Voice is required to speak aloud');

        let sentences = await api.conversation.chat([
          {
            role: 'system',
            content: 'Convert the given text into a number of sentences meant to be spoken aloud. This means breaking the text into sentences that are easy to read and understand as well as phonetically pronouncing any difficult words, urls, or acronyms.*** Return your response as a RAW JSON ARRAY of strings. ***',
          },
          {
            role: 'user',
            content: text + '\n\n*** Return your response as a RAW JSON ARRAY of strings. ***',
          },
        ]);
        sentences = sentences.content[0].text;
        sentences = sentences instanceof Array ? sentences : JSON.parse(sentences);
        const consumeSentence = async () => {
          return new Promise((resolve, reject) => {
            const loop: any = async () => {
              const sentence = sentences.shift();
              if (!sentence) return resolve('done');
              await speakSentence(sentence, voice);
              return await loop();
            };
            return loop();
          });
        };
        await consumeSentence();

      }

      return '(aloud) ' + text;
    },
  },
  pause: {
    'name': 'pause',
    'version': '1.0.0',
    'description': 'Pause execution for the specified duration.',
    'schema': {
      'name': 'pause',
      'description': 'Pause execution for the specified duration.',
      "methodSignature": "pause(duration: number): void",
    },
    execute: async ({ duration }: any) => {
      return await new Promise((resolve) => setTimeout(resolve, duration));
    },
  },
  echo: {
    'name': 'echo',
    'version': '1.0.0',
    'description': 'Print the given text to the console',
    'schema': {
      'name': 'echo',
      'description': 'Print the given text to the console',
      'input_schema': {
        'type': 'object',
        'properties': {
          'text': {
            'type': 'string',
            'description': 'The text to print',
          },
        },
        'required': ['text'],
      },
    },
    execute: async ({ text }: any, api: any) => {
      api.emit('text', text);
      return text;
    },
  },
  'busybox': {
    'name': 'busybox',
    'version': '1.0.0',
    'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy..',
    'schema': {
      'name': 'busybox',
      'description': 'Performs file operations. Supported operations include read, append, prepend, replace, insert_at, remove, delete, copy..',
      "methodSignature": "files(operations: { operation: string, path?: string, match?: string, data?: string, position?: number, target?: string }[]): string",
    },
    execute: async function ({ operations }: any, run: any) {
      try {
        const fs = require('fs');
        const pathModule = require('path');
        const cwd = process.cwd();
        for (const { operation, path, match, data, position, target } of operations) {
          const p = pathModule.join(cwd, path || '');
          const t = pathModule.join(cwd, target || '');
          if (!fs.existsSync(p || t)) {
            return `Error: File not found at path ${p || t} `;
          }
          let text = fs.readFileSync(p, 'utf8');
          switch (operation) {
            case 'read':
              return text;
            case 'append':
              text += data;
              break;
            case 'prepend':
              text = data + text;
              break;
            case 'replace':
              text = text.replace(match, data);
              break;
            case 'insert_at':
              text = text.slice(0, position) + data + text.slice(position);
              break;
            case 'remove':
              text = text.replace(match, '');
              break;
            case 'delete':
              fs.unlinkSync(p);
              break;
            case 'copy':
              fs.copyFileSync(p, t);
              break;
            default:
              return `Error: Unsupported operation ${operation} `;
          }
          fs.writeFileSync(p, text);
        }
        return `Successfully executed batch operations on files`;
      } catch (error: any) {
        const context = {
          errorCode: error.code,
          operations: operations,
        };
        await handleFileError(context, run);
        return `File operation '${operations}' failed. Check logs for details.`;
      }
    },
  },
  callLLM: {
    'name': 'callLLM',
    'version': '1.0.0',
    'description': 'Call the LLM with the given system prompt and prompt, optionally specifying the model and response format and setting a result variable.',
    'schema': {
      'name': 'callLLM',
      "methodSignature": "callLLM(params: { prompt: string, system_prompt?: string, model?: string, responseFormat?: string, resultVar?: string }[]): any",
      'description': 'Call the LLM with the given system prompt and prompt, optionally specifying the model and response format and setting a result variable.',
    },
    execute: async (params: any, api: any) => {
      if (!Array.isArray(params)) params = [params];
      for (const param of params) {
        let { prompt, system_prompt, model, responseFormat, resultVar } = param;
        try {
          if (!prompt) {
            throw new Error("Both 'prompt' and 'system_prompt' are required parameters for the 'callLLM' tool.");
          }
          if (!system_prompt) system_prompt = prompt;
          model = model || 'claude';
          if (model !== 'claude' && model !== 'gemini') {
            throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
          }
          if (responseFormat) {
            system_prompt = `${system_prompt}. Response Format: You MUST respond with a JSON - encoded string in the following format: \n\`\`\`typescript\n${responseFormat}\n\`\`\`\n`;
          }
          const convo = new Conversation(model);
          const response = await convo.chat([
            {
              role: 'system',
              content: system_prompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ]);

          const data = response.content[0].text.trim();

          // Validate JSON structure before parsing
          if (responseFormat) {
            try {
              const isValidJson = jsonValidator(responseFormat, data);
              if (!isValidJson) {
                throw new Error('Invalid JSON structure in LLM response. Actual response: ' + data) + ' Expected response format: ' + responseFormat;
              }

              const rr = JSON.parse(data);
              if (resultVar) {
                api.store[resultVar] = rr;
              }
              return rr;
            } catch (error: any) {
              api.emit('error', `JSON parsing failed for LLM response: ${data}`);
              if (resultVar) {
                api.store[resultVar] = data;
              }
              return data;
            }
          } else {
            if (resultVar) {
              api.store[resultVar] = data;
            }
            return data;
          }
        } catch (error: any) {
          let llmResponse = await api.conversation.chat([
            {
              role: 'system',
              content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                error: error.message,
                stackTrace: error.stack,
                context: { prompt, system_prompt, model, responseFormat, resultVar },
              }),
            },
          ]);
          llmResponse = llmResponse.content[0].text.trim();
          throw error;
        }
      }
    },
  },
  'call_agent': {
    'name': 'call_agent',
    'version': '1.0.0',
    'description': 'Call the agent with the given task to perform.',
    'schema': {
      'name': 'call_agent',
      "methodSignature": "call_agent(params: { prompt: string, model?: string, resultVar?: string }): any",
      'description': 'Call the agent with the given task to perform.'
    },
    execute: async ({ prompt, model = 'claude', resultVar }: any, api: any) => {
      try {
        if (!prompt) {
          throw new Error("The 'prompt' parameter is required for the 'call_agent' tool.");
        }
        if (model !== 'claude' && model !== 'gemini') {
          throw new Error("Invalid model specified. Choose either 'claude' or 'gemini'.");
        }
        const compactRepresentation = () => {
          return JSON.stringify(api.getSchemas());
        };
        const convo = new Conversation(model);
        const jsonPrompt = `Transform the given task into a sequence of subtasks, each with a JavaScript script that uses the provided tools to achieve the subtask objective.

Available Tools:

${compactRepresentation()}

Additional tools can be explored using 'list_all_tools', 'get_tool_details', and 'load_tool'.

Process:

1. Analyze the task and identify necessary steps
2. Decompose into subtasks with clear objectives and input/output
3. For each subtask, write a JavaScript script using the tools
  a. Access previous subtask results with taskResults.<taskName>_results: \`const lastResult = taskResults.firstTask_results; ...\`
  b. Store subtask results in a variable for future use: \`const result = { key: 'value' }; taskResults.subtask_results = result; ...\`
  b. End the script with a return statement for the subtask deliverable: \`return result;\`
4. Test each script and verify the output
5. Provide a concise explanation of the subtask's purpose and approach

Data Management:

- Store subtask results in resultVar (JSON/array format): \`taskResults.subtask_results = result;\`
Access previous subtask data with taskResults.<resultVar>: \`const lastResult = taskResults.subtask_results; ...\`
Include only resultVar instructions in responses, not the actual data.

Output Format:
\`\`\`json
[
  {
  "task": "<taskName>:<description>",
  "script": "<JavaScript script>",
  "chat": "<subtask explanation>",
  "resultVar": "<optional result variable>"
  },
  // ... additional subtasks
]
\`\`\`

CRITICAL: Verify the JSON output for accuracy and completeness before submission. *** OUTPUT ONLY JSON ***`;
        const response = await convo.chat([
          {
            role: 'system',
            content: jsonPrompt,
          },
          {
            role: 'user',
            content: JSON.stringify({
              task: 'First off: OUTPUTTING ONLY *VALID*, RAW JSON IS CRITICAL! Now read and handle this: ' + prompt,
            }),
          },
        ]);
        let tasks = response.content[0].text;

        // crop anything outside the ````json and ``` to get only the json response
        tasks = tasks.replace(/.*```json/g, '');
        tasks = tasks.replace(/.*```/g, '');
        tasks = tasks.replace(/[\r\n]+/g, '');
        let message = '';
        try {
          tasks = JSON.parse(tasks);
        } catch (error: any) {
          tasks = api.extractJson(response.content[0].text);
          message = error.message;
        }
        if (!Array.isArray(tasks) || tasks.length === 0) {
          api.emit('error', message);
          throw new Error('The task must be an array of subtasks. Check the format and try again. RETURN ONLY JSON RESPONSES' + message);
        }

        const results = [];

        api.store[prompt] = tasks;

        if (resultVar) {
          api.store[resultVar] = results;
        }

        for (const task of tasks) {
          let { task: taskName, script, chat } = task;
          const splitTask = taskName.split(':');
          let taskId = taskName;
          if (splitTask.length > 1) {
            taskId = splitTask[0];
            taskName = splitTask[1];
          }
          api.store['currentTaskId'] = taskId;
          api.emit('taskId', taskId);

          api.store[`${taskId}_task`] = task;
          api.emit(`${taskId}_task`, task);

          api.store[`${taskId}_chat`] = chat;
          api.emit(`${taskId}_chat`, chat);

          api.store[`${taskId}_script`] = script;
          api.emit(`${taskId}_script`, script);

          const sr = await api.callScript(script);
          task.scriptResult = sr;

          api.store[`${taskId}_result`] = sr;
          api.store[`${taskId}_results`] = sr;
          const rout = { id: taskId, task: taskName, script, result: sr };
          api.emit(`${taskId}_results`, rout);

          results.push(rout);
        }

        if (resultVar) {
          api.store[resultVar] = results;
        }

        return results;
      } catch (error: any) {
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { prompt, model, resultVar },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
      }
    },
  },
  'call_agents': {
    'name': 'call_agents',
    'version': '1.0.0',
    'description': 'Call multiple agents with the given tasks to perform.',
    'schema': {
      'name': 'call_agents',
      "methodSignature": "call_agents(params: { prompts: string[], resultVar?: string }): any",
      'description': 'Call multiple agents with the given tasks to perform.',
    },
    execute: async ({ prompts, resultVar }: any, api: any) => {
      try {
        if (!prompts || !Array.isArray(prompts)) {
          throw new Error("The 'prompts' parameter must be an array for the 'call_agents' tool.");
        }
        const results = await Promise.all(
          prompts.map(async (prompt: string) => {
            return await api.callTool('call_agent', { prompt, model: 'claude' });
          }),
        );
        if (resultVar) {
          api.store[resultVar] = results;
        }
        return results;
      } catch (error: any) {
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { prompts, resultVar },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    },
  },
  callLLMs: {
    'name': 'callLLMs',
    'version': '1.0.0',
    'description': 'Call the LLM with the given system prompt and prompts concurrently.',
    'schema': {
      'name': 'callLLMs',
      "methodSignature": "callLLMs(params: { prompts: string[], system_prompt: string, resultVar?: string }): any",
      'description': 'Call the LLM with the given system prompt and prompts concurrently.',
    },
    execute: async ({ prompts, system_prompt, resultVar }: any, api: any) => {
      try {
        if (!prompts || !Array.isArray(prompts) || !system_prompt) {
          throw new Error("The 'prompts' parameter must be an array and 'system_prompt' is required for the 'callLLMs' tool.");
        }
        const results = await Promise.all(
          prompts.map(async (prompt: string) => {
            return await api.conversation.chat([
              {
                role: 'system',
                content: system_prompt,
              },
              {
                role: 'user',
                content: prompt,
              },
            ]);
          }),
        );
        if (resultVar) {
          api.store[resultVar] = results;
        }
        return results;
      } catch (error: any) {
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { prompts, system_prompt, resultVar },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw error;
      }
    },
  },
  // apply a universal patch to a file
  'apply_patch': {
    'name': 'apply_patch',
    'version': '1.0.0',
    'description': 'Apply a universal patch to a file. Pass a file path, a patch string, and an optional resultVar to save the patched file contents.',
    'schema': {
      'name': 'apply_patch',
      "methodSignature": "apply_patch({ file: string, patch: string, resultVar?: string }): string",
      'description': 'Apply a universal patch to a file. Pass a file path, a patch string, and an optional resultVar to save the patched file contents.',
      "required": ["file", "patch"],
    },
    execute: async (params: any, api: any) => {
      if (!Array.isArray(params)) params = [params];
      for (const { file, patch, resultVar } of params) {
        try {
          if (!file || !patch) {
            throw new Error("Both 'file' and 'patch' are required parameters for the 'apply_patch' tool.");
          }
          const existsSync = require('fs').existsSync;
          const filePath = require('path').resolve(file);
          if (!(await existsSync(filePath))) {
            throw new Error(`The file '${file}' does not exist.`);
          }
          try {
            const result = await api.callTool('busybox', {
              command: 'patch',
              args: [file],
              options: { input: patch },
              resultVar,
            });
            if (resultVar) {
              api.store[resultVar] = result;
            }
            return result;
          } catch (error: any) {
            try {
              const fileContent = await fs.readFile(file, 'utf8');
              const results = await api.conversation.chat([
                {
                  role: 'system',
                  content: 'Given one or more universal patches and file content, analyze the patches and the file content to determine the best way to apply the patch to the content, then apply the patch to the file. Return ONLY the patched file contents IN ITS ENTIRETY.',
                },
                {
                  role: 'user',
                  content: `File content: ${fileContent}\n\nPatch: ${patch}`,
                },
              ]);
              return results.content[0].text;
            } catch (error: any) {
              throw new Error(`Failed to apply patch: ${error.message} Tool source: ${error.stack}`);
            }
          }
        } catch (error: any) {
          let llmResponse = await api.conversation.chat([
            {
              role: 'system',
              content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                error: error.message,
                stackTrace: error.stack,
                context: { file, patch, resultVar },
              }),
            },
          ]);
          llmResponse = llmResponse.content[0].text.trim();
          throw new Error(llmResponse);
        }
      }
    },
  },
  'generate_patches': {
    'name': 'generate_patches',
    'version': '1.0.0',
    'description':
      'Generate a number of patches for a number of files given a list of file paths and instructions for what to generate. Use this tool to make changes to one or more files given a set of instructions.',
    'schema': {
      'name': 'generate_patches',
      "methodSignature": "generate_patches(params: { files: string[], instructions: string, resultVar?: string }): string",
      'description':
        'Generate a number of patches for a number of files given a list of file paths and instructions for what to generate. Use this tool to make changes to one or more files given a set of instructions.',
    },
    execute: async ({ files, instructions, resultVar }: any, api: any) => {
      try {
        const content = files
          .map((file: string) => {
            return [file, api.fs.readFileSync(file).toString()].join('\n');
          })
          .join('\n\n');
        const prompt = `INSTRUCTIONS: ${instructions}\n\nFILES:\n\n${content}\n\nRemember to provide a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }].`;
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided files, then analyse the instructions. Then, generate one or more patches for the files based on the given instructions. Return your patches as a JSON array of objects with the following format: [{ file: <file>, patch: <patch> }]. OUTPUT ONLY RAW JSON!',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        if (resultVar) {
          api.store[resultVar] = llmResponse;
        }
        return llmResponse;
      } catch (error: any) {
        let llmResponse = await api.conversation.chat([
          {
            role: 'system',
            content: 'Analyze the provided error details and generate a fix or provide guidance on resolving the issue.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              error: error.message,
              stackTrace: error.stack,
              context: { files, instructions },
            }),
          },
        ]);
        llmResponse = llmResponse.content[0].text.trim();
        if (llmResponse.fix) {
          return llmResponse.fix;
        }
        throw new Error(llmResponse);
      }
    },
  },
  'get_tools_home': {
    'name': 'get_tools_home',
    'version': '1.0.0',
    'description': 'Get the path to the tools home directory.',
    'schema': {
      'name': 'get_tools_home',
      "methodSignature": "get_tools_home(): string",
      'description': 'Get the path to the tools home directory.',
    },
    execute: async (params: any, api: any) => {
      const thisFolder = __dirname;
      const toolsHome = thisFolder + '/tools';
      return toolsHome;
    },
  },
  'list_all_tools': {
    'name': 'list_all_tools',
    'version': '1.0.0',
    'description': 'List all the tools available in the tools home directory.',
    'schema': {
      'name': 'list_all_tools',
      "methodSignature": "list_all_tools(): { type: 'array', items: { name: 'string' } }",
      'description': 'List all the tools available in the tools home directory.',
    },
    execute: async (params: any, api: any) => {
      const toolsHome = await api.callTool('get_tools_home', {});
      //const tools = fs.readdirSync(toolsHome).filter((file: string) => file.endsWith('.ts')).map((file: string) => file.replace('.ts', ''));
      const tools = await fs.readdir(toolsHome);
      return tools;
    },
  },
  'get_tool_details': {
    'name': 'get_tool_details',
    'version': '1.0.0',
    'description': 'Get the details of a tool.',
    'schema': {
      'name': 'get_tool_details',
      "methodSignature": "get_tool_details(tool: string): { name: 'string', description: 'string', input_schema: 'object', output_schema: 'object' }",
      'description': 'Get the details of a tool.',
    },
    execute: async ({ tool }: any, api: any) => {
      const toolsHome = await api.callTool('get_tools_home', {});
      const toolPath = `${toolsHome}/${tool}.ts`;
      const existsSync = require('fs').existsSync;
      if (!existsSync(toolPath)) {
        throw new Error(`The tool '${tool}' does not exist.`);
      }
      const toolModule = require(toolPath);
      return toolModule.schema;
    },
  },
  'get_tools_details': {
    'name': 'get_tools_details',
    'version': '1.0.0',
    'description': 'Get the details of the specified tools.',
    'schema': {
      'name': 'get_tools_details',
      "methodSignature": "get_tools_details(tools: string[]): { name: 'string', description: 'string', input_schema: 'object', output_schema: 'object' }[]",
      'description': 'Get the details of the specified tools.',
    },
    execute: async (params: any, api: any) => {
      const { tools } = params;
      const toolsDetails = await Promise.all(
        tools.map(async (tool: string) => {
          return await api.callTool('get_tool_details', { tool });
        }),
      );
      return toolsDetails;
    },
  },
  'list_active_tools': {
    'name': 'list_active_tools',
    'version': '1.0.0',
    'description': 'List all the active tools in the current session.',
    'schema': {
      'name': 'list_active_tools',
      "methodSignature": "list_active_tools(): string[]",
      'description': 'List all the active tools in the current session.',
    },
    execute: async (params: any, api: any) => {
      return Object.keys(api.tools);
    },
  },
  'load_tool': {
    'name': 'load_tool',
    'version': '1.0.0',
    'description': 'Load a tool from a file path.',
    'schema': {
      name: 'load_tool',
      "methodSignature": "load_tool(path: string): string",
      description: 'Load a tool from a file path.',
    },
    execute: async ({ path }: any, api: any) => {
      try {
        const toolModule = require(path);
        const toolName = toolModule.name; // Assuming the tool module exports its name
        api.toolRegistry.addTool(toolName, toolModule.source, toolModule.schema, toolModule.tags || []);
        return toolName;
      } catch (error: any) {
        throw new Error(`Failed to load tool: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  'load_tool_source': {
    'name': 'load_tool_source',
    'version': '1.0.0',
    'description': 'Load a tool from a file path and return the source code.',
    'schema': {
      'name': 'load_tool_source',
      "methodSignature": "load_tool_source(path: string): string",
      'description': 'Load a tool from a file path and return the source code.',
    },
    execute: async ({ path }: any, api: any) => {
      try {
        const tool = await fs.readFile(path, 'utf8');
        return tool;
      } catch (error: any) {
        throw new Error(`Failed to load tool source: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  'save_tool': {
    'name': 'save_tool',
    'version': '1.0.0',
    'description': 'Save a tool to a file path.',
    'schema': {
      name: 'save_tool',
      'methodSignature': 'save_tool(params: { tool: object, path: string }): string',
      description: 'Save a tool to a file path.',
    },
    execute: async ({ tool, path }: any, api: any) => {
      try {
        const name = Object.keys(tool)[0];
        await fs.writeFile(path, `module.exports = ${JSON.stringify(tool, null, 2)};`);
        return name;
      } catch (error: any) {
        throw new Error(`Failed to save tool: ${error.message} Tool source: ${error.stack}`);
      }
    },
  },
  search_news_api: {
    'name': 'search_news_api',
    'version': '1.0.0',
    'description': 'Performs a news search using the given query.',
    'schema': {
      'name': 'search_news_api',
      "methodSignature": "search_news_api(params: { q: string, from?: string, to?: string, language?: string, country?: string, domains?: string, sources?: string, sortBy?: string, num?: number }): string",
      'description': 'Performs a news search using the given query.',
    },
    execute: async (values: any) => {
      const axios = require('axios');
      const trunc = (str: any, len: any) => {
        return str.length > len ? str.substring(0, len - 3) + '...' : str;
      }
      try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${values.q}&apiKey=${process.env.NEWS_API_KEY}`);
        const results = response.data.articles.map((item: any) => ({
          content: trunc(item.content, 100),
          title: item.title,
          url: item.url,
        }));
        // keep only the first num results
        let num = values.num ? values.num : 10;
        const res = results.slice(0, num);
        return JSON.stringify(res);
      } catch (error: any) {
        return `Error calling News API: ${error.message}`
      }
    }
  },
  search_google: {
    'name': 'search_google',
    'version': '1.0.0',
    'description': 'perform a google search using the given query',
    'schema': {
      "name": "search_google",
      "methodSignature": "search_google(params: { query: string }): string",
      "description": "perform a google search using the given query",
    },
    execute: async ({ query }: any) => {
      const config = {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        GOOGLE_CX_ID: process.env.GOOGLE_CX_ID
      }
      try {
        const axios = require('axios');
        const response = await
          axios.get(`https://www.googleapis.com/customsearch/v1?key=${config.GOOGLE_API_KEY}&cx=${config.GOOGLE_CX_ID}&q=${query}`);
        const results = response.data.items.map((item: any) => ({
          title: item.title,
          link: item.link
        }));
        const res = JSON.stringify(results);
        return res;
      } catch (error: any) {
        return error.message;
      }
    }
  },
  fixJson: {
    // given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array
    // given some text content without any JSON within it, it will attempt to structure the text content into a JSON object
    'name': 'fixJson',
    'version': '1.0.0',
    'description': 'given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array, given some text content without any JSON within it, it will attempt to structure the text content into a JSON object',
    'schema': {
      'name': 'fixJson',
      'methodSignature': 'fixJson(params: { json: string, resultVar?: string }): any',
      'description': 'given some text content with some JSON within it, it will extract the JSON and return a syntactically correct JSON object/array, given some text content without any JSON within it, it will attempt to structure the text content into a JSON object',
    },
    execute: async ({ json, resultVar }: any, api: any) => {
      const convo = new Conversation('gemini');
      const sp = `Given some content that contains a JSON object or array, you ignore EVERYTHING BEFORE OR AFTER what is obviously JSON data, ignoring funky keys and weird data, and you output a syntactically-valid version of the JSON, with other quoting characters properly escaped, on a single line. If the content contains no JSON data, you output a JSON object containing the input data, structured in the most appropriate manner for the data.`;
      const tasks = await convo.chat([
        {
          role: 'system',
          content: sp
        },
        {
          role: 'user',
          content: json,
        },
      ], {} as any, 'gemini-1.5-flash-001');
      let task = tasks.content[0].text;
      try {
        task = JSON.parse(task);
      } catch (error: any) {
        task = api.extractJson(task);
      }
      if (resultVar) {
        api.store[resultVar] = task;
      }
      return task;
    }
  }

};
