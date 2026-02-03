import type { Address } from 'viem'
import { decodeEventLog } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts } from '../lib/constants.js'
import type { FeeLiquidityParams, TransactionResult } from '../lib/types.js'
import { validateAddress, validatePositiveAmount } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get liquidity position for a provider
 */
export async function getLiquidity(token: Address, provider: Address): Promise<bigint> {
  const client = getPublicClient()

  try {
    const liquidity = (await client.readContract({
      address: Contracts.FEE_AMM,
      abi: Abis.feeAmm,
      functionName: 'getLiquidity',
      args: [validateAddress(token), validateAddress(provider)],
    })) as bigint

    return liquidity
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Token not in pool is a valid case - return 0
    if (message.includes('execution reverted')) {
      return 0n
    }
    throw new Error(`Failed to get liquidity: ${message}`)
  }
}

/**
 * Get total liquidity for a token
 */
export async function getTotalLiquidity(token: Address): Promise<bigint> {
  const client = getPublicClient()

  try {
    const liquidity = (await client.readContract({
      address: Contracts.FEE_AMM,
      abi: Abis.feeAmm,
      functionName: 'getTotalLiquidity',
      args: [validateAddress(token)],
    })) as bigint

    return liquidity
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Token not in pool is a valid case - return 0
    if (message.includes('execution reverted')) {
      return 0n
    }
    throw new Error(`Failed to get total liquidity: ${message}`)
  }
}

/**
 * Get total deposits for a token (used for calculating liquidity share value)
 */
export async function getTotalDeposits(token: Address): Promise<bigint> {
  const client = getPublicClient()

  try {
    const deposits = (await client.readContract({
      address: Contracts.FEE_AMM,
      abi: Abis.feeAmm,
      functionName: 'getTotalDeposits',
      args: [validateAddress(token)],
    })) as bigint

    return deposits
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('execution reverted')) {
      return 0n
    }
    throw new Error(`Failed to get total deposits: ${message}`)
  }
}

/**
 * Get liquidity share percentage for a provider
 */
export async function getLiquidityShare(token: Address, provider: Address): Promise<number> {
  const [providerLiquidity, totalLiquidity] = await Promise.all([
    getLiquidity(token, provider),
    getTotalLiquidity(token),
  ])

  if (totalLiquidity === 0n) {
    return 0
  }

  return Number((providerLiquidity * 10000n) / totalLiquidity) / 100
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Mint fee liquidity tokens
 */
export async function mintFeeLiquidity(
  params: FeeLiquidityParams
): Promise<TransactionResult & { liquidity?: bigint }> {
  const client = getWalletClient()
  const { token, amount } = params

  validatePositiveAmount(amount)

  // First approve the Fee AMM to spend tokens
  const approveHash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'approve',
    args: [Contracts.FEE_AMM, amount],
  })
  await client.waitForTransactionReceipt({ hash: approveHash })

  // Mint liquidity
  const hash = await client.writeContract({
    address: Contracts.FEE_AMM,
    abi: Abis.feeAmm,
    functionName: 'mintLiquidity',
    args: [validateAddress(token), amount],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Parse liquidity amount from LiquidityMinted event logs
  let liquidity: bigint | undefined
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: Abis.feeAmm,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'LiquidityMinted') {
        liquidity = (decoded.args as { liquidity: bigint }).liquidity
        break
      }
    } catch {
      // Not a LiquidityMinted event, continue
    }
  }

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
    liquidity,
  }
}

/**
 * Burn fee liquidity tokens
 */
export async function burnFeeLiquidity(params: {
  token: Address
  liquidity: bigint
}): Promise<TransactionResult & { amount?: bigint }> {
  const client = getWalletClient()
  const { token, liquidity } = params

  validatePositiveAmount(liquidity)

  const hash = await client.writeContract({
    address: Contracts.FEE_AMM,
    abi: Abis.feeAmm,
    functionName: 'burnLiquidity',
    args: [validateAddress(token), liquidity],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Parse amount returned from LiquidityBurned event logs
  let amount: bigint | undefined
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: Abis.feeAmm,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'LiquidityBurned') {
        amount = (decoded.args as { amount: bigint }).amount
        break
      }
    } catch {
      // Not a LiquidityBurned event, continue
    }
  }

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
    amount,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate expected liquidity tokens for a deposit
 * Uses the standard AMM formula: liquidity = (amount * totalLiquidity) / totalDeposits
 * For first deposit, liquidity equals amount (1:1 ratio)
 */
export async function calculateLiquidityMint(
  token: Address,
  amount: bigint
): Promise<bigint> {
  const [totalLiquidity, totalDeposits] = await Promise.all([
    getTotalLiquidity(token),
    getTotalDeposits(token),
  ])

  if (totalLiquidity === 0n || totalDeposits === 0n) {
    // First deposit - liquidity equals amount
    return amount
  }

  // Pro-rata calculation based on deposit share
  return (amount * totalLiquidity) / totalDeposits
}

/**
 * Calculate expected token amount for a liquidity burn
 * Uses the standard AMM formula: amount = (liquidity * totalDeposits) / totalLiquidity
 */
export async function calculateLiquidityBurn(
  token: Address,
  liquidity: bigint
): Promise<bigint> {
  const [totalLiquidity, totalDeposits] = await Promise.all([
    getTotalLiquidity(token),
    getTotalDeposits(token),
  ])

  if (totalLiquidity === 0n) {
    return 0n
  }

  // Pro-rata calculation based on liquidity share
  return (liquidity * totalDeposits) / totalLiquidity
}
