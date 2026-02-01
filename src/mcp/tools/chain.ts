import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import * as chain from '../../modules/chain.js'
import { formatTimestamp, getErrorMessage } from '../../lib/utils.js'

export function registerChainTools(server: McpServer) {
  // Get current block number
  server.tool(
    'tempo_getBlockNumber',
    'Get the current block number on the Tempo blockchain',
    {},
    async () => {
      try {
        const blockNumber = await chain.getBlockNumber()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ blockNumber: blockNumber.toString() }),
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

  // Get block by number or hash
  server.tool(
    'tempo_getBlock',
    'Get block information by block number or hash',
    {
      blockIdentifier: z
        .string()
        .optional()
        .describe(
          'Block number, block hash, or tag (latest, pending, earliest). Defaults to latest.'
        ),
    },
    async ({ blockIdentifier }) => {
      try {
        let identifier: bigint | `0x${string}` | 'latest' | 'pending' | 'earliest' = 'latest'

        if (blockIdentifier) {
          if (blockIdentifier.startsWith('0x')) {
            identifier = blockIdentifier as `0x${string}`
          } else if (['latest', 'pending', 'earliest'].includes(blockIdentifier)) {
            identifier = blockIdentifier as 'latest' | 'pending' | 'earliest'
          } else {
            identifier = BigInt(blockIdentifier)
          }
        }

        const block = await chain.getBlock(identifier)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                number: block.number.toString(),
                hash: block.hash,
                timestamp: block.timestamp.toString(),
                timestampFormatted: formatTimestamp(block.timestamp),
                transactionCount: block.transactionCount,
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

  // Get transaction by hash
  server.tool(
    'tempo_getTransaction',
    'Get transaction information by transaction hash',
    {
      txHash: z.string().describe('Transaction hash (0x...)'),
    },
    async ({ txHash }) => {
      try {
        const tx = await chain.getTransaction(txHash as `0x${string}`)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: tx.blockNumber.toString(),
                timestamp: tx.timestamp.toString(),
                timestampFormatted: tx.timestamp > 0n ? formatTimestamp(tx.timestamp) : null,
                status: tx.status,
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

  // Get chain info
  server.tool(
    'tempo_getChainInfo',
    'Get general information about the Tempo blockchain',
    {},
    async () => {
      try {
        const info = await chain.getChainInfo()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                chainId: info.chainId,
                name: info.name,
                blockNumber: info.blockNumber.toString(),
                gasPrice: info.gasPrice.toString(),
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

  // Get gas price
  server.tool(
    'tempo_getGasPrice',
    'Get the current gas price on the Tempo blockchain',
    {},
    async () => {
      try {
        const gasPrice = await chain.getGasPrice()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ gasPrice: gasPrice.toString() }),
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
