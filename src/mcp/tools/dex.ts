import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as dex from '../../modules/dex.js'
import { getErrorMessage, parseAmount, formatAmount } from '../../lib/utils.js'

export function registerDexTools(server: McpServer) {
  // Get swap quote
  server.tool(
    'tempo_getSwapQuote',
    'Get a quote for swapping tokens on the DEX',
    {
      tokenIn: z.string().describe('Input token address'),
      tokenOut: z.string().describe('Output token address'),
      amountIn: z.string().describe('Amount of input token (human readable)'),
    },
    async ({ tokenIn, tokenOut, amountIn }) => {
      try {
        const parsedAmount = parseAmount(amountIn)
        const quote = await dex.getSwapQuote({
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: parsedAmount,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tokenIn: quote.tokenIn,
                tokenOut: quote.tokenOut,
                amountIn: quote.amountIn.toString(),
                amountInFormatted: formatAmount(quote.amountIn),
                amountOut: quote.amountOut.toString(),
                amountOutFormatted: formatAmount(quote.amountOut),
                priceImpact: quote.priceImpact,
                route: quote.route,
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

  // Get order info
  server.tool(
    'tempo_getOrder',
    'Get information about a DEX order',
    {
      orderId: z.string().describe('Order ID'),
    },
    async ({ orderId }) => {
      try {
        const order = await dex.getOrder(BigInt(orderId))
        if (!order) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ found: false }) }],
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                orderId: order.orderId.toString(),
                owner: order.owner,
                token: order.token,
                amount: order.amount.toString(),
                amountFormatted: formatAmount(order.amount),
                tick: order.tick,
                price: dex.getPrice(order.tick),
                isBuy: order.isBuy,
                filled: order.filled.toString(),
                filledFormatted: formatAmount(order.filled),
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

  // Get price from tick
  server.tool(
    'tempo_getPrice',
    'Convert a tick value to a price',
    {
      tick: z.number().describe('Tick value'),
    },
    async ({ tick }) => {
      try {
        const price = dex.getPrice(tick)
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

  // Get tick from price
  server.tool(
    'tempo_getTick',
    'Convert a price to a tick value',
    {
      price: z.number().describe('Price value'),
    },
    async ({ price }) => {
      try {
        const tick = dex.getTick(price)
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

  // Execute swap
  server.tool(
    'tempo_swap',
    'Execute a token swap on the DEX',
    {
      tokenIn: z.string().describe('Input token address'),
      tokenOut: z.string().describe('Output token address'),
      amountIn: z.string().describe('Amount of input token (human readable)'),
      minAmountOut: z
        .string()
        .optional()
        .describe('Minimum output amount (optional, uses default slippage if not provided)'),
      recipient: z.string().optional().describe('Recipient address (optional, defaults to sender)'),
    },
    async ({ tokenIn, tokenOut, amountIn, minAmountOut, recipient }) => {
      try {
        const parsedAmountIn = parseAmount(amountIn)
        const parsedMinOut = minAmountOut ? parseAmount(minAmountOut) : undefined

        const result = await dex.swap({
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: parsedAmountIn,
          minAmountOut: parsedMinOut,
          recipient: recipient as Address | undefined,
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

  // Place limit order
  server.tool(
    'tempo_placeOrder',
    'Place a limit order on the DEX',
    {
      token: z.string().describe('Token address'),
      amount: z.string().describe('Order amount (human readable)'),
      tick: z.number().describe('Tick (price point) for the order'),
      isBuy: z.boolean().describe('True for buy order, false for sell order'),
    },
    async ({ token, amount, tick, isBuy }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await dex.placeOrder({
          token: token as Address,
          amount: parsedAmount,
          tick,
          isBuy,
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
                orderId: result.orderId?.toString() || null,
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

  // Place flip order
  server.tool(
    'tempo_placeFlip',
    'Place a flip order (immediately executable limit order)',
    {
      token: z.string().describe('Token address'),
      amount: z.string().describe('Order amount (human readable)'),
      tick: z.number().describe('Tick (price point) for the order'),
      isBuy: z.boolean().describe('True for buy order, false for sell order'),
    },
    async ({ token, amount, tick, isBuy }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await dex.placeFlip({
          token: token as Address,
          amount: parsedAmount,
          tick,
          isBuy,
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

  // Cancel order
  server.tool(
    'tempo_cancelOrder',
    'Cancel an existing DEX order',
    {
      orderId: z.string().describe('Order ID to cancel'),
    },
    async ({ orderId }) => {
      try {
        const result = await dex.cancelOrder(BigInt(orderId))
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

  // Withdraw from order
  server.tool(
    'tempo_withdrawOrder',
    'Withdraw proceeds from a filled order',
    {
      orderId: z.string().describe('Order ID to withdraw from'),
    },
    async ({ orderId }) => {
      try {
        const result = await dex.withdrawOrder(BigInt(orderId))
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

  // Calculate swap with slippage
  server.tool(
    'tempo_calculateSwapWithSlippage',
    'Calculate expected output and minimum output for a swap',
    {
      tokenIn: z.string().describe('Input token address'),
      tokenOut: z.string().describe('Output token address'),
      amountIn: z.string().describe('Amount of input token'),
      slippageBps: z
        .number()
        .optional()
        .describe('Slippage in basis points (100 = 1%, default 50)'),
    },
    async ({ tokenIn, tokenOut, amountIn, slippageBps }) => {
      try {
        const parsedAmount = parseAmount(amountIn)
        const result = await dex.calculateSwapWithSlippage({
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: parsedAmount,
          slippageBps,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                amountOut: result.amountOut.toString(),
                amountOutFormatted: formatAmount(result.amountOut),
                minAmountOut: result.minAmountOut.toString(),
                minAmountOutFormatted: formatAmount(result.minAmountOut),
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
