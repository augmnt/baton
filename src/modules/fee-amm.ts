import type { Address } from 'viem'
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
  } catch {
    return 0n
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
  } catch {
    return 0n
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

  // Parse liquidity amount from receipt logs
  let liquidity: bigint | undefined
  // Would need to parse event logs for the exact liquidity minted

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

  // Parse amount returned from receipt logs
  let amount: bigint | undefined
  // Would need to parse event logs for the exact amount returned

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
 */
export async function calculateLiquidityMint(
  token: Address,
  amount: bigint
): Promise<bigint> {
  // Simplified calculation - actual implementation would depend on AMM formula
  const totalLiquidity = await getTotalLiquidity(token)

  if (totalLiquidity === 0n) {
    // First deposit - liquidity equals amount
    return amount
  }

  // Pro-rata calculation
  return (amount * totalLiquidity) / totalLiquidity
}

/**
 * Calculate expected token amount for a liquidity burn
 */
export async function calculateLiquidityBurn(
  token: Address,
  liquidity: bigint
): Promise<bigint> {
  const totalLiquidity = await getTotalLiquidity(token)

  if (totalLiquidity === 0n) {
    return 0n
  }

  // Pro-rata calculation
  return (liquidity * totalLiquidity) / totalLiquidity
}
