import type { Address } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts, Defaults } from '../lib/constants.js'
import type { OrderInfo, SwapParams, SwapQuote, TransactionResult } from '../lib/types.js'
import {
  applySlippage,
  priceToTick,
  tickToPrice,
  validateAddress,
  validatePositiveAmount,
} from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get a quote for a swap
 */
export async function getSwapQuote(params: {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
}): Promise<SwapQuote> {
  const client = getPublicClient()
  const { tokenIn, tokenOut, amountIn } = params

  validatePositiveAmount(amountIn)

  const amountOut = (await client.readContract({
    address: Contracts.STABLECOIN_DEX,
    abi: Abis.stablecoinDex,
    functionName: 'getQuote',
    args: [validateAddress(tokenIn), validateAddress(tokenOut), amountIn],
  })) as bigint

  // Calculate price impact (simplified - would need pool data for accurate calculation)
  const priceImpact = amountOut > 0n ? Number((amountIn * 10000n) / amountOut - 10000n) / 100 : 0

  return {
    tokenIn: validateAddress(tokenIn),
    tokenOut: validateAddress(tokenOut),
    amountIn,
    amountOut,
    priceImpact,
    route: [validateAddress(tokenIn), validateAddress(tokenOut)],
  }
}

/**
 * Get order information by ID
 */
export async function getOrder(orderId: bigint): Promise<OrderInfo | null> {
  const client = getPublicClient()

  try {
    const result = (await client.readContract({
      address: Contracts.STABLECOIN_DEX,
      abi: Abis.stablecoinDex,
      functionName: 'getOrder',
      args: [orderId],
    })) as [Address, Address, bigint, number, boolean, bigint]

    const [owner, token, amount, tick, isBuy, filled] = result

    // Check if order exists (owner would be zero address if not)
    if (owner === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return {
      orderId,
      owner,
      token,
      amount,
      tick,
      isBuy,
      filled,
    }
  } catch {
    return null
  }
}

/**
 * Get current price from tick
 */
export function getPrice(tick: number): number {
  return tickToPrice(tick)
}

/**
 * Get tick from price
 */
export function getTick(price: number): number {
  return priceToTick(price)
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Execute a swap
 */
export async function swap(params: SwapParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { tokenIn, tokenOut, amountIn, minAmountOut, recipient } = params

  validatePositiveAmount(amountIn)

  // Get quote if minAmountOut not provided
  let minOut = minAmountOut
  if (!minOut) {
    const quote = await getSwapQuote({ tokenIn, tokenOut, amountIn })
    minOut = applySlippage(quote.amountOut, Defaults.SLIPPAGE_BPS)
  }

  // First approve the DEX to spend tokens
  const approveHash = await client.writeContract({
    address: validateAddress(tokenIn),
    abi: Abis.tip20,
    functionName: 'approve',
    args: [Contracts.STABLECOIN_DEX, amountIn],
  })
  await client.waitForTransactionReceipt({ hash: approveHash })

  // Execute the swap
  const swapRecipient = recipient || client.account.address
  const hash = await client.writeContract({
    address: Contracts.STABLECOIN_DEX,
    abi: Abis.stablecoinDex,
    functionName: 'swap',
    args: [
      validateAddress(tokenIn),
      validateAddress(tokenOut),
      amountIn,
      minOut,
      validateAddress(swapRecipient),
    ],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
  }
}

/**
 * Place a limit order
 */
export async function placeOrder(params: {
  token: Address
  amount: bigint
  tick: number
  isBuy: boolean
}): Promise<TransactionResult & { orderId?: bigint }> {
  const client = getWalletClient()
  const { token, amount, tick, isBuy } = params

  validatePositiveAmount(amount)

  // Approve DEX if selling
  if (!isBuy) {
    const approveHash = await client.writeContract({
      address: validateAddress(token),
      abi: Abis.tip20,
      functionName: 'approve',
      args: [Contracts.STABLECOIN_DEX, amount],
    })
    await client.waitForTransactionReceipt({ hash: approveHash })
  }

  const hash = await client.writeContract({
    address: Contracts.STABLECOIN_DEX,
    abi: Abis.stablecoinDex,
    functionName: 'placeOrder',
    args: [validateAddress(token), amount, tick, isBuy],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Try to extract order ID from logs
  let orderId: bigint | undefined
  // Would need to parse logs for the order ID

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
    orderId,
  }
}

/**
 * Place a flip order (immediately executable limit order)
 */
export async function placeFlip(params: {
  token: Address
  amount: bigint
  tick: number
  isBuy: boolean
}): Promise<TransactionResult> {
  // Flip orders use the same interface but with specific tick positioning
  return placeOrder(params)
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: bigint): Promise<TransactionResult> {
  const client = getWalletClient()

  const hash = await client.writeContract({
    address: Contracts.STABLECOIN_DEX,
    abi: Abis.stablecoinDex,
    functionName: 'cancelOrder',
    args: [orderId],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
  }
}

/**
 * Withdraw filled order proceeds
 */
export async function withdrawOrder(orderId: bigint): Promise<TransactionResult> {
  // This would depend on the specific DEX implementation
  // Assuming cancel also withdraws
  return cancelOrder(orderId)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate swap output with slippage
 */
export async function calculateSwapWithSlippage(params: {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  slippageBps?: number
}): Promise<{ amountOut: bigint; minAmountOut: bigint }> {
  const { tokenIn, tokenOut, amountIn, slippageBps = Defaults.SLIPPAGE_BPS } = params

  const quote = await getSwapQuote({ tokenIn, tokenOut, amountIn })
  const minAmountOut = applySlippage(quote.amountOut, slippageBps)

  return {
    amountOut: quote.amountOut,
    minAmountOut,
  }
}

/**
 * Get best swap route (for future multi-hop support)
 */
export async function getBestRoute(params: {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
}): Promise<{ route: Address[]; amountOut: bigint }> {
  // For now, direct route only
  const quote = await getSwapQuote(params)
  return {
    route: quote.route,
    amountOut: quote.amountOut,
  }
}
