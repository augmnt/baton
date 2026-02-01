import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as history from '../../modules/history.js'
import { getErrorMessage, formatAmount, formatTimestamp } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'

export function registerHistoryTools(server: McpServer) {
  // Get transfer history
  server.tool(
    'tempo_getTransferHistory',
    'Get transfer history for a token and optional address',
    {
      token: z.string().describe('Token contract address'),
      address: z.string().optional().describe('Filter by address (sender or recipient)'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, address, fromBlock, toBlock, limit }) => {
      try {
        const transfers = await history.getTransferHistory({
          token: token as Address,
          address: address as Address | undefined,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                transfers.map((t) => ({
                  token: t.token,
                  from: t.from,
                  to: t.to,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  memo: t.memo,
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                }))
              ),
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

  // Get incoming transfers
  server.tool(
    'tempo_getIncomingTransfers',
    'Get incoming transfers for an address',
    {
      token: z.string().describe('Token contract address'),
      address: z.string().describe('Recipient address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, address, fromBlock, toBlock, limit }) => {
      try {
        const transfers = await history.getIncomingTransfers({
          token: token as Address,
          address: address as Address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                transfers.map((t) => ({
                  from: t.from,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                }))
              ),
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

  // Get outgoing transfers
  server.tool(
    'tempo_getOutgoingTransfers',
    'Get outgoing transfers for an address',
    {
      token: z.string().describe('Token contract address'),
      address: z.string().describe('Sender address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, address, fromBlock, toBlock, limit }) => {
      try {
        const transfers = await history.getOutgoingTransfers({
          token: token as Address,
          address: address as Address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                transfers.map((t) => ({
                  to: t.to,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                }))
              ),
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

  // Get raw logs
  server.tool(
    'tempo_getLogs',
    'Get raw event logs from a contract',
    {
      address: z.string().describe('Contract address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
    },
    async ({ address, fromBlock, toBlock }) => {
      try {
        const logs = await history.getLogs({
          address: address as Address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                logs.map((log) => ({
                  address: log.address,
                  topics: log.topics,
                  data: log.data,
                  blockNumber: log.blockNumber?.toString(),
                  transactionHash: log.transactionHash,
                  logIndex: log.logIndex,
                }))
              ),
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

  // Get transfer history for configured wallet
  server.tool(
    'tempo_getMyTransferHistory',
    'Get transfer history for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "show my transfer history" or similar.',
    {
      token: z.string().describe('Token contract address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, fromBlock, toBlock, limit }) => {
      try {
        const address = getConfiguredAddress()
        const transfers = await history.getTransferHistory({
          token: token as Address,
          address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                transfers: transfers.map((t) => ({
                  token: t.token,
                  from: t.from,
                  to: t.to,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  memo: t.memo,
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                })),
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

  // Get incoming transfers for configured wallet
  server.tool(
    'tempo_getMyIncomingTransfers',
    'Get incoming transfers for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "show transfers I received" or similar.',
    {
      token: z.string().describe('Token contract address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, fromBlock, toBlock, limit }) => {
      try {
        const address = getConfiguredAddress()
        const transfers = await history.getIncomingTransfers({
          token: token as Address,
          address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                transfers: transfers.map((t) => ({
                  from: t.from,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                })),
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

  // Get outgoing transfers for configured wallet
  server.tool(
    'tempo_getMyOutgoingTransfers',
    'Get outgoing transfers for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "show transfers I sent" or similar.',
    {
      token: z.string().describe('Token contract address'),
      fromBlock: z.string().optional().describe('Start block number'),
      toBlock: z.string().optional().describe('End block number'),
      limit: z.number().optional().describe('Maximum number of results (default 100)'),
    },
    async ({ token, fromBlock, toBlock, limit }) => {
      try {
        const address = getConfiguredAddress()
        const transfers = await history.getOutgoingTransfers({
          token: token as Address,
          address,
          fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
          toBlock: toBlock ? BigInt(toBlock) : undefined,
          limit,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                transfers: transfers.map((t) => ({
                  to: t.to,
                  amount: t.amount.toString(),
                  amountFormatted: formatAmount(t.amount),
                  transactionHash: t.transactionHash,
                  blockNumber: t.blockNumber.toString(),
                  timestamp: t.timestamp.toString(),
                  timestampFormatted: t.timestamp > 0n ? formatTimestamp(t.timestamp) : null,
                })),
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
}
