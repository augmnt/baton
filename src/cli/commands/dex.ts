import { Command } from 'commander'
import type { Address } from 'viem'
import * as dex from '../../modules/dex.js'
import { parseAmount, formatAmount } from '../../lib/utils.js'
import {
  formatKeyValue,
  formatTransactionResult,
  formatError,
  formatOutput,
  formatHeader,
} from '../formatters.js'

export function createDexCommand(): Command {
  const cmd = new Command('dex')
    .description('DEX operations')

  // Get swap quote
  cmd
    .command('quote')
    .description('Get a quote for a token swap')
    .argument('<tokenIn>', 'Input token address')
    .argument('<tokenOut>', 'Output token address')
    .argument('<amountIn>', 'Amount of input token')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenIn: string, tokenOut: string, amountIn: string, options) => {
      try {
        const parsedAmount = parseAmount(amountIn)
        const quote = await dex.getSwapQuote({
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: parsedAmount,
        })

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                tokenIn: quote.tokenIn,
                tokenOut: quote.tokenOut,
                amountIn: quote.amountIn.toString(),
                amountOut: quote.amountOut.toString(),
                priceImpact: quote.priceImpact,
                route: quote.route,
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader('Swap Quote'))
          console.log('')
          console.log(formatKeyValue('Input', `${formatAmount(quote.amountIn)} (${tokenIn})`))
          console.log(formatKeyValue('Output', `${formatAmount(quote.amountOut)} (${tokenOut})`))
          console.log(formatKeyValue('Price Impact', `${quote.priceImpact.toFixed(2)}%`))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Execute swap
  cmd
    .command('swap')
    .description('Execute a token swap')
    .argument('<tokenIn>', 'Input token address')
    .argument('<tokenOut>', 'Output token address')
    .argument('<amountIn>', 'Amount of input token')
    .option('--min-out <amount>', 'Minimum output amount')
    .option('--recipient <address>', 'Recipient address')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenIn: string, tokenOut: string, amountIn: string, options) => {
      try {
        const parsedAmountIn = parseAmount(amountIn)
        const minOut = options.minOut ? parseAmount(options.minOut) : undefined

        const result = await dex.swap({
          tokenIn: tokenIn as Address,
          tokenOut: tokenOut as Address,
          amountIn: parsedAmountIn,
          minAmountOut: minOut,
          recipient: options.recipient as Address | undefined,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Place order
  cmd
    .command('order')
    .description('Place a limit order')
    .argument('<token>', 'Token address')
    .argument('<amount>', 'Order amount')
    .argument('<tick>', 'Tick (price point)')
    .option('--buy', 'Place a buy order')
    .option('--sell', 'Place a sell order')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, amount: string, tick: string, options) => {
      try {
        if (!options.buy && !options.sell) {
          console.error(formatError('Must specify --buy or --sell'))
          process.exit(1)
        }

        const parsedAmount = parseAmount(amount)
        const result = await dex.placeOrder({
          token: tokenAddress as Address,
          amount: parsedAmount,
          tick: parseInt(tick, 10),
          isBuy: options.buy,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Cancel order
  cmd
    .command('cancel')
    .description('Cancel an order')
    .argument('<orderId>', 'Order ID')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (orderId: string, options) => {
      try {
        const result = await dex.cancelOrder(BigInt(orderId))
        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get order info
  cmd
    .command('order-info')
    .description('Get order information')
    .argument('<orderId>', 'Order ID')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (orderId: string, options) => {
      try {
        const order = await dex.getOrder(BigInt(orderId))

        if (!order) {
          console.log('Order not found')
          return
        }

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                orderId: order.orderId.toString(),
                owner: order.owner,
                token: order.token,
                amount: order.amount.toString(),
                tick: order.tick,
                price: dex.getPrice(order.tick),
                isBuy: order.isBuy,
                filled: order.filled.toString(),
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader(`Order #${order.orderId}`))
          console.log('')
          console.log(formatKeyValue('Owner', order.owner))
          console.log(formatKeyValue('Token', order.token))
          console.log(formatKeyValue('Type', order.isBuy ? 'Buy' : 'Sell'))
          console.log(formatKeyValue('Amount', formatAmount(order.amount)))
          console.log(formatKeyValue('Tick', order.tick))
          console.log(formatKeyValue('Price', dex.getPrice(order.tick).toFixed(6)))
          console.log(formatKeyValue('Filled', formatAmount(order.filled)))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Price utilities
  cmd
    .command('price')
    .description('Convert between price and tick')
    .option('--tick <tick>', 'Convert tick to price')
    .option('--price <price>', 'Convert price to tick')
    .action(async (options) => {
      try {
        if (options.tick) {
          const price = dex.getPrice(parseInt(options.tick, 10))
          console.log(formatKeyValue('Price', price.toFixed(6)))
        } else if (options.price) {
          const tick = dex.getTick(parseFloat(options.price))
          console.log(formatKeyValue('Tick', tick))
        } else {
          console.error(formatError('Must specify --tick or --price'))
          process.exit(1)
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
