import type { Address } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts } from '../lib/constants.js'
import type { FeeTokenInfo, TransactionResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get the current fee token for an account
 */
export async function getFeeToken(account: Address): Promise<Address | null> {
  const client = getPublicClient()

  try {
    const feeToken = (await client.readContract({
      address: Contracts.FEE_MANAGER,
      abi: Abis.feeManager,
      functionName: 'getFeeToken',
      args: [validateAddress(account)],
    })) as Address

    if (feeToken === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return feeToken
  } catch {
    return null
  }
}

/**
 * Get list of supported fee tokens
 */
export async function getSupportedFeeTokens(): Promise<Address[]> {
  const client = getPublicClient()

  try {
    const tokens = (await client.readContract({
      address: Contracts.FEE_MANAGER,
      abi: Abis.feeManager,
      functionName: 'getSupportedTokens',
    })) as Address[]

    return tokens
  } catch {
    return []
  }
}

/**
 * Get fee rate for a specific token
 */
export async function getFeeRate(token: Address): Promise<bigint> {
  const client = getPublicClient()

  try {
    const rate = (await client.readContract({
      address: Contracts.FEE_MANAGER,
      abi: Abis.feeManager,
      functionName: 'getFeeRate',
      args: [validateAddress(token)],
    })) as bigint

    return rate
  } catch {
    return 0n
  }
}

/**
 * Get fee token info with rate
 */
export async function getFeeTokenInfo(token: Address): Promise<FeeTokenInfo> {
  const client = getPublicClient()
  const validToken = validateAddress(token)

  const [symbol, rate] = await Promise.all([
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'symbol',
    }) as Promise<string>,
    getFeeRate(validToken),
  ])

  return {
    token: validToken,
    symbol,
    rate,
  }
}

/**
 * Get all supported fee tokens with their rates
 */
export async function getAllFeeTokensInfo(): Promise<FeeTokenInfo[]> {
  const tokens = await getSupportedFeeTokens()

  const infos: FeeTokenInfo[] = []
  for (const token of tokens) {
    const info = await getFeeTokenInfo(token)
    infos.push(info)
  }

  return infos
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Set the fee token for the current account
 */
export async function setFeeToken(token: Address): Promise<TransactionResult> {
  const client = getWalletClient()

  const hash = await client.writeContract({
    address: Contracts.FEE_MANAGER,
    abi: Abis.feeManager,
    functionName: 'setFeeToken',
    args: [validateAddress(token)],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a token is a supported fee token
 */
export async function isSupportedFeeToken(token: Address): Promise<boolean> {
  const supported = await getSupportedFeeTokens()
  const validToken = validateAddress(token).toLowerCase()
  return supported.some((t) => t.toLowerCase() === validToken)
}

/**
 * Estimate fee for a transaction in a specific token
 */
export async function estimateFee(
  token: Address,
  gasUnits: bigint
): Promise<{ fee: bigint; token: Address }> {
  const rate = await getFeeRate(token)
  const fee = (gasUnits * rate) / 1000000n // Assuming rate is per million gas units

  return {
    fee,
    token: validateAddress(token),
  }
}
