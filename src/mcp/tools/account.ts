import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as account from '../../modules/account.js'
import { getErrorMessage } from '../../lib/utils.js'

export function registerAccountTools(server: McpServer) {
  // Get balance of a specific token
  server.tool(
    'tempo_getBalance',
    'Get TIP-20 token balance for an address',
    {
      token: z.string().describe('Token contract address'),
      address: z.string().describe('Address to check balance for'),
    },
    async ({ token, address }) => {
      try {
        const result = await account.getFormattedBalance(
          token as Address,
          address as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token: result.token,
                symbol: result.symbol,
                balance: result.balance.toString(),
                formatted: result.formatted,
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

  // Get balances of all known tokens
  server.tool(
    'tempo_getBalances',
    'Get all known token balances for an address',
    {
      address: z.string().describe('Address to check balances for'),
    },
    async ({ address }) => {
      try {
        const balances = await account.getBalances(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                balances.map((b) => ({
                  token: b.token,
                  symbol: b.symbol,
                  balance: b.balance.toString(),
                  formatted: b.formatted,
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

  // Get balances for specific tokens
  server.tool(
    'tempo_getTokenBalances',
    'Get balances for specific tokens for an address',
    {
      address: z.string().describe('Address to check balances for'),
      tokens: z.array(z.string()).describe('Array of token contract addresses'),
    },
    async ({ address, tokens }) => {
      try {
        const balances = await account.getTokenBalances(
          address as Address,
          tokens as Address[]
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                balances.map((b) => ({
                  token: b.token,
                  symbol: b.symbol,
                  balance: b.balance.toString(),
                  formatted: b.formatted,
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

  // Get nonce
  server.tool(
    'tempo_getNonce',
    'Get the transaction nonce for an address',
    {
      address: z.string().describe('Address to get nonce for'),
    },
    async ({ address }) => {
      try {
        const nonce = await account.getNonce(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ nonce: nonce.toString() }),
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

  // Get user fee token
  server.tool(
    'tempo_getUserFeeToken',
    'Get the fee token configured for an account',
    {
      address: z.string().describe('Address to check fee token for'),
    },
    async ({ address }) => {
      try {
        const feeToken = await account.getUserFeeToken(address as Address)
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

  // Get account info
  server.tool(
    'tempo_getAccountInfo',
    'Get complete account information including nonce and fee token',
    {
      address: z.string().describe('Address to get info for'),
    },
    async ({ address }) => {
      try {
        const info = await account.getAccountInfo(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address: info.address,
                nonce: info.nonce.toString(),
                feeToken: info.feeToken,
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

  // Get non-zero balances
  server.tool(
    'tempo_getNonZeroBalances',
    'Get all non-zero token balances for an address',
    {
      address: z.string().describe('Address to check balances for'),
    },
    async ({ address }) => {
      try {
        const balances = await account.getNonZeroBalances(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                balances.map((b) => ({
                  token: b.token,
                  symbol: b.symbol,
                  balance: b.balance.toString(),
                  formatted: b.formatted,
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
}
