import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  parseAmount,
  formatAmount,
  encodeMemo,
  validateAddress,
  isValidAddress,
  truncateAddress,
  priceToTick,
  tickToPrice,
  applySlippage,
  getErrorMessage,
} from '../../lib/utils.js'
import { KnownTokens, Contracts } from '../../lib/constants.js'

export function registerUtilsTools(server: McpServer) {
  // Parse amount
  server.tool(
    'tempo_parseAmount',
    'Parse a human-readable amount to smallest unit (6 decimals)',
    {
      amount: z.string().describe('Human readable amount (e.g., "100.5")'),
      decimals: z.number().optional().describe('Decimal places (default 6)'),
    },
    async ({ amount, decimals }) => {
      try {
        const parsed = parseAmount(amount, decimals)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                input: amount,
                parsed: parsed.toString(),
                decimals: decimals ?? 6,
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

  // Format amount
  server.tool(
    'tempo_formatAmount',
    'Format a bigint amount to human-readable string',
    {
      amount: z.string().describe('Amount in smallest unit'),
      decimals: z.number().optional().describe('Decimal places (default 6)'),
    },
    async ({ amount, decimals }) => {
      try {
        const formatted = formatAmount(BigInt(amount), decimals)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                input: amount,
                formatted,
                decimals: decimals ?? 6,
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

  // Encode memo
  server.tool(
    'tempo_encodeMemo',
    'Encode a string memo to bytes32',
    {
      memo: z.string().describe('Memo string (max 31 characters)'),
    },
    async ({ memo }) => {
      try {
        const encoded = encodeMemo(memo)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ memo, encoded }),
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

  // Validate address
  server.tool(
    'tempo_validateAddress',
    'Validate and checksum an address',
    {
      address: z.string().describe('Address to validate'),
    },
    async ({ address }) => {
      try {
        const valid = isValidAddress(address)
        const checksummed = valid ? validateAddress(address) : null
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                input: address,
                valid,
                checksummed,
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

  // Truncate address
  server.tool(
    'tempo_truncateAddress',
    'Truncate an address for display',
    {
      address: z.string().describe('Address to truncate'),
      startChars: z.number().optional().describe('Characters at start (default 6)'),
      endChars: z.number().optional().describe('Characters at end (default 4)'),
    },
    async ({ address, startChars, endChars }) => {
      try {
        const truncated = truncateAddress(address, startChars, endChars)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address, truncated }),
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

  // Price to tick
  server.tool(
    'tempo_priceToTick',
    'Convert a price to a tick value',
    {
      price: z.number().describe('Price value'),
    },
    async ({ price }) => {
      try {
        const tick = priceToTick(price)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ price, tick }),
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

  // Tick to price
  server.tool(
    'tempo_tickToPrice',
    'Convert a tick value to a price',
    {
      tick: z.number().describe('Tick value'),
    },
    async ({ tick }) => {
      try {
        const price = tickToPrice(tick)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tick, price }),
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

  // Apply slippage
  server.tool(
    'tempo_applySlippage',
    'Calculate minimum output amount with slippage',
    {
      amount: z.string().describe('Expected output amount'),
      slippageBps: z.number().describe('Slippage in basis points (100 = 1%)'),
    },
    async ({ amount, slippageBps }) => {
      try {
        const min = applySlippage(BigInt(amount), slippageBps)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                amount,
                slippageBps,
                slippagePercent: slippageBps / 100,
                minAmount: min.toString(),
                minAmountFormatted: formatAmount(min),
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

  // Get known tokens
  server.tool(
    'tempo_getKnownTokens',
    'Get list of known token addresses',
    {},
    async () => {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(KnownTokens),
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

  // Get contract addresses
  server.tool(
    'tempo_getContractAddresses',
    'Get known contract addresses',
    {},
    async () => {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(Contracts),
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
