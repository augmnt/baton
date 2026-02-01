import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as feeAmm from '../../modules/fee-amm.js'
import { getErrorMessage, parseAmount, formatAmount } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'

export function registerFeeAmmTools(server: McpServer) {
  // Get liquidity position
  server.tool(
    'tempo_getFeeLiquidity',
    'Get fee AMM liquidity position for a provider',
    {
      token: z.string().describe('Token address'),
      provider: z.string().describe('Liquidity provider address'),
    },
    async ({ token, provider }) => {
      try {
        const liquidity = await feeAmm.getLiquidity(token as Address, provider as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                provider,
                liquidity: liquidity.toString(),
                liquidityFormatted: formatAmount(liquidity),
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

  // Get total liquidity
  server.tool(
    'tempo_getTotalFeeLiquidity',
    'Get total fee AMM liquidity for a token',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const liquidity = await feeAmm.getTotalLiquidity(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                totalLiquidity: liquidity.toString(),
                totalLiquidityFormatted: formatAmount(liquidity),
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

  // Get liquidity share
  server.tool(
    'tempo_getLiquidityShare',
    'Get liquidity share percentage for a provider',
    {
      token: z.string().describe('Token address'),
      provider: z.string().describe('Liquidity provider address'),
    },
    async ({ token, provider }) => {
      try {
        const share = await feeAmm.getLiquidityShare(token as Address, provider as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                provider,
                sharePercent: share,
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

  // Mint fee liquidity
  server.tool(
    'tempo_mintFeeLiquidity',
    'Add liquidity to the fee AMM',
    {
      token: z.string().describe('Token address'),
      amount: z.string().describe('Amount to add as liquidity (human readable)'),
    },
    async ({ token, amount }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await feeAmm.mintFeeLiquidity({
          token: token as Address,
          amount: parsedAmount,
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
                liquidity: result.liquidity?.toString() || null,
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

  // Burn fee liquidity
  server.tool(
    'tempo_burnFeeLiquidity',
    'Remove liquidity from the fee AMM',
    {
      token: z.string().describe('Token address'),
      liquidity: z.string().describe('Liquidity tokens to burn'),
    },
    async ({ token, liquidity }) => {
      try {
        const result = await feeAmm.burnFeeLiquidity({
          token: token as Address,
          liquidity: BigInt(liquidity),
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
                amount: result.amount?.toString() || null,
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

  // Get fee liquidity for configured wallet
  server.tool(
    'tempo_getMyFeeLiquidity',
    'Get fee AMM liquidity position for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "what is my liquidity position?" or similar.',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const provider = getConfiguredAddress()
        const liquidity = await feeAmm.getLiquidity(token as Address, provider)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                provider,
                token,
                liquidity: liquidity.toString(),
                liquidityFormatted: formatAmount(liquidity),
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

  // Get liquidity share for configured wallet
  server.tool(
    'tempo_getMyLiquidityShare',
    'Get liquidity share percentage for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "what is my liquidity share?" or similar.',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const provider = getConfiguredAddress()
        const share = await feeAmm.getLiquidityShare(token as Address, provider)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                provider,
                token,
                sharePercent: share,
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
