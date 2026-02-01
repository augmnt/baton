import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as fees from '../../modules/fees.js'
import { getErrorMessage, formatAmount } from '../../lib/utils.js'

export function registerFeesTools(server: McpServer) {
  // Get fee token for account
  server.tool(
    'tempo_getFeeToken',
    'Get the fee token configured for an account',
    {
      account: z.string().describe('Account address'),
    },
    async ({ account }) => {
      try {
        const feeToken = await fees.getFeeToken(account as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ feeToken }),
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

  // Get supported fee tokens
  server.tool(
    'tempo_getSupportedFeeTokens',
    'Get list of all supported fee tokens',
    {},
    async () => {
      try {
        const tokens = await fees.getSupportedFeeTokens()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tokens }),
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

  // Get fee rate for token
  server.tool(
    'tempo_getFeeRate',
    'Get the fee rate for a specific token',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const rate = await fees.getFeeRate(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                rate: rate.toString(),
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

  // Get fee token info
  server.tool(
    'tempo_getFeeTokenInfo',
    'Get detailed fee token info including symbol and rate',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const info = await fees.getFeeTokenInfo(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token: info.token,
                symbol: info.symbol,
                rate: info.rate.toString(),
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

  // Get all fee tokens info
  server.tool(
    'tempo_getAllFeeTokensInfo',
    'Get info for all supported fee tokens',
    {},
    async () => {
      try {
        const infos = await fees.getAllFeeTokensInfo()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                infos.map((info) => ({
                  token: info.token,
                  symbol: info.symbol,
                  rate: info.rate.toString(),
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

  // Set fee token
  server.tool(
    'tempo_setFeeToken',
    'Set the fee token for your account',
    {
      token: z.string().describe('Token address to use for fees'),
    },
    async ({ token }) => {
      try {
        const result = await fees.setFeeToken(token as Address)
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

  // Check if token is supported
  server.tool(
    'tempo_isSupportedFeeToken',
    'Check if a token is supported as a fee token',
    {
      token: z.string().describe('Token address to check'),
    },
    async ({ token }) => {
      try {
        const supported = await fees.isSupportedFeeToken(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ token, supported }),
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

  // Estimate fee
  server.tool(
    'tempo_estimateFee',
    'Estimate transaction fee in a specific token',
    {
      token: z.string().describe('Fee token address'),
      gasUnits: z.string().describe('Estimated gas units for the transaction'),
    },
    async ({ token, gasUnits }) => {
      try {
        const result = await fees.estimateFee(token as Address, BigInt(gasUnits))
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                fee: result.fee.toString(),
                feeFormatted: formatAmount(result.fee),
                token: result.token,
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
