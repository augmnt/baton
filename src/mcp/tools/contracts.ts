import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address, Hex } from 'viem'
import * as contracts from '../../modules/contracts.js'
import { getErrorMessage } from '../../lib/utils.js'

export function registerContractsTools(server: McpServer) {
  // Read from contract
  server.tool(
    'tempo_readContract',
    'Read data from a smart contract',
    {
      address: z.string().describe('Contract address'),
      abi: z.string().describe('Contract ABI (JSON string)'),
      functionName: z.string().describe('Function name to call'),
      args: z.array(z.any()).optional().describe('Function arguments'),
    },
    async ({ address, abi, functionName, args }) => {
      try {
        const parsedAbi = JSON.parse(abi)
        const result = await contracts.readContract({
          address: address as Address,
          abi: parsedAbi,
          functionName,
          args,
        })

        // Convert BigInt values for JSON serialization
        const serialized = JSON.stringify(result, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )

        return {
          content: [
            {
              type: 'text',
              text: serialized,
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Write to contract
  server.tool(
    'tempo_writeContract',
    'Write data to a smart contract (execute a transaction)',
    {
      address: z.string().describe('Contract address'),
      abi: z.string().describe('Contract ABI (JSON string)'),
      functionName: z.string().describe('Function name to call'),
      args: z.array(z.any()).optional().describe('Function arguments'),
      value: z.string().optional().describe('Value to send (in wei)'),
    },
    async ({ address, abi, functionName, args, value }) => {
      try {
        const parsedAbi = JSON.parse(abi)
        const result = await contracts.writeContract({
          address: address as Address,
          abi: parsedAbi,
          functionName,
          args,
          value: value ? BigInt(value) : undefined,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result.success,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber.toString(),
                explorerUrl: result.explorerUrl,
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Simulate contract call
  server.tool(
    'tempo_simulateContract',
    'Simulate a contract call without executing',
    {
      address: z.string().describe('Contract address'),
      abi: z.string().describe('Contract ABI (JSON string)'),
      functionName: z.string().describe('Function name to call'),
      args: z.array(z.any()).optional().describe('Function arguments'),
      value: z.string().optional().describe('Value to send (in wei)'),
    },
    async ({ address, abi, functionName, args, value }) => {
      try {
        const parsedAbi = JSON.parse(abi)
        const result = await contracts.simulateContract({
          address: address as Address,
          abi: parsedAbi,
          functionName,
          args,
          value: value ? BigInt(value) : undefined,
        })

        const serialized = JSON.stringify(result, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )

        return {
          content: [
            {
              type: 'text',
              text: serialized,
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Check if address is contract
  server.tool(
    'tempo_isContract',
    'Check if an address is a smart contract',
    {
      address: z.string().describe('Address to check'),
    },
    async ({ address }) => {
      try {
        const isContract = await contracts.isContract(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address, isContract }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Get contract code
  server.tool(
    'tempo_getContractCode',
    'Get bytecode at a contract address',
    {
      address: z.string().describe('Contract address'),
    },
    async ({ address }) => {
      try {
        const code = await contracts.getContractCode(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                hasCode: code !== undefined && code !== '0x',
                codeLength: code ? (code.length - 2) / 2 : 0, // bytes
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Estimate gas for contract call
  server.tool(
    'tempo_estimateContractGas',
    'Estimate gas for a contract call',
    {
      address: z.string().describe('Contract address'),
      abi: z.string().describe('Contract ABI (JSON string)'),
      functionName: z.string().describe('Function name to call'),
      args: z.array(z.any()).optional().describe('Function arguments'),
      value: z.string().optional().describe('Value to send (in wei)'),
    },
    async ({ address, abi, functionName, args, value }) => {
      try {
        const parsedAbi = JSON.parse(abi)
        const gas = await contracts.estimateContractGas({
          address: address as Address,
          abi: parsedAbi,
          functionName,
          args,
          value: value ? BigInt(value) : undefined,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ estimatedGas: gas.toString() }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Encode function data
  server.tool(
    'tempo_encodeFunctionData',
    'Encode function call data',
    {
      abi: z.string().describe('Contract ABI (JSON string)'),
      functionName: z.string().describe('Function name'),
      args: z.array(z.any()).optional().describe('Function arguments'),
    },
    async ({ abi, functionName, args }) => {
      try {
        const parsedAbi = JSON.parse(abi)
        const data = contracts.encodeContractData({
          abi: parsedAbi,
          functionName,
          args,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ data }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Get storage at slot
  server.tool(
    'tempo_getStorageAt',
    'Get storage value at a specific slot',
    {
      address: z.string().describe('Contract address'),
      slot: z.string().describe('Storage slot (hex)'),
    },
    async ({ address, slot }) => {
      try {
        const value = await contracts.getStorageAt(address as Address, slot as Hex)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ slot, value }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )
}
