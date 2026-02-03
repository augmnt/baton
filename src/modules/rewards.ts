import type { Address } from 'viem'
import { decodeEventLog } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis } from '../lib/constants.js'
import type { RewardDistribution, TransactionResult } from '../lib/types.js'
import { validateAddress, validatePositiveAmount } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get claimable rewards for an account from a token contract
 * Note: Rewards are integrated directly into TIP-20 token contracts
 */
export async function getClaimableRewards(
  token: Address,
  account: Address
): Promise<bigint> {
  const client = getPublicClient()
  const validToken = validateAddress(token)
  const validAccount = validateAddress(account)

  try {
    const claimable = (await client.readContract({
      address: validToken,
      abi: Abis.tip20Rewards,
      functionName: 'getClaimableRewards',
      args: [validAccount],
    })) as bigint

    return claimable
  } catch (error) {
    // If the function doesn't exist, the token may not support rewards
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('execution reverted') || message.includes('not a function')) {
      // Token doesn't support rewards - return 0 (valid case, not an error)
      return 0n
    }
    // Propagate unexpected errors
    throw new Error(`Failed to get claimable rewards: ${message}`)
  }
}

// Result type for claimable rewards with query status
export interface ClaimableRewardsResult {
  amount: bigint
  queryStatus: 'success' | 'failed' | 'not_supported'
}

/**
 * Get claimable rewards for multiple tokens
 */
export async function getClaimableRewardsMulti(
  tokens: Address[],
  account: Address
): Promise<Map<Address, ClaimableRewardsResult>> {
  const client = getPublicClient()
  const validAccount = validateAddress(account)

  const results = await client.multicall({
    contracts: tokens.map((token) => ({
      address: validateAddress(token),
      abi: Abis.tip20Rewards,
      functionName: 'getClaimableRewards',
      args: [validAccount],
    })),
  })

  const claimables = new Map<Address, ClaimableRewardsResult>()
  for (let i = 0; i < tokens.length; i++) {
    const result = results[i]
    if (result.status === 'success') {
      claimables.set(validateAddress(tokens[i]), {
        amount: result.result as bigint,
        queryStatus: 'success',
      })
    } else {
      // Distinguish between "not supported" (revert) and actual failures
      const errorMsg = result.error?.message || ''
      const isNotSupported = errorMsg.includes('execution reverted') || errorMsg.includes('not a function')
      claimables.set(validateAddress(tokens[i]), {
        amount: 0n,
        queryStatus: isNotSupported ? 'not_supported' : 'failed',
      })
    }
  }

  return claimables
}

/**
 * Check if an account has any claimable rewards
 */
export async function hasClaimableRewards(
  token: Address,
  account: Address
): Promise<boolean> {
  const claimable = await getClaimableRewards(token, account)
  return claimable > 0n
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Set reward recipient (redirect rewards to another address)
 */
export async function setRewardRecipient(
  token: Address,
  recipient: Address
): Promise<TransactionResult> {
  const client = getWalletClient()
  const validToken = validateAddress(token)
  const validRecipient = validateAddress(recipient)

  const hash = await client.writeContract({
    address: validToken,
    abi: Abis.tip20Rewards,
    functionName: 'setRewardRecipient',
    args: [validRecipient],
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
 * Distribute rewards to multiple recipients
 * Note: This calls the token contract's distributeRewards method
 */
export async function distributeReward(
  params: RewardDistribution
): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, recipients, amounts } = params
  const validToken = validateAddress(token)

  // Validate inputs
  if (recipients.length !== amounts.length) {
    throw new Error('Recipients and amounts arrays must have the same length')
  }

  if (recipients.length === 0) {
    throw new Error('Must have at least one recipient')
  }

  // Validate all recipient addresses BEFORE any transactions
  const validRecipients = recipients.map((recipient, i) => {
    try {
      return validateAddress(recipient)
    } catch {
      throw new Error(`Invalid recipient address at index ${i}: ${recipient}`)
    }
  })

  // Validate amounts
  amounts.forEach((amount, i) => {
    validatePositiveAmount(amount, `amounts[${i}]`)
  })

  // Calculate total
  const total = amounts.reduce((sum, amount) => sum + amount, 0n)

  // Now that all validation passed, approve the token to spend from our account
  const approveHash = await client.writeContract({
    address: validToken,
    abi: Abis.tip20,
    functionName: 'approve',
    args: [validToken, total],
  })
  const approveReceipt = await client.waitForTransactionReceipt({ hash: approveHash })

  // Check if approve succeeded before proceeding
  if (approveReceipt.status !== 'success') {
    throw new Error('Approve transaction failed')
  }

  // Distribute rewards
  const hash = await client.writeContract({
    address: validToken,
    abi: Abis.tip20Rewards,
    functionName: 'distributeRewards',
    args: [validRecipients, amounts],
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
 * Claim rewards for a specific token
 */
export async function claimRewards(
  token: Address
): Promise<TransactionResult & { claimed?: bigint }> {
  const client = getWalletClient()
  const validToken = validateAddress(token)

  const hash = await client.writeContract({
    address: validToken,
    abi: Abis.tip20Rewards,
    functionName: 'claimRewards',
    args: [],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Parse claimed amount from logs
  let claimed: bigint | undefined
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: Abis.tip20Rewards,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'RewardsClaimed') {
        claimed = (decoded.args as { amount: bigint }).amount
        break
      }
    } catch {
      // Not a RewardsClaimed event, continue
    }
  }

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
    claimed,
  }
}

/**
 * Claim rewards for multiple tokens
 */
export async function claimRewardsMulti(
  tokens: Address[]
): Promise<TransactionResult[]> {
  const results: TransactionResult[] = []

  for (const token of tokens) {
    const result = await claimRewards(token)
    results.push(result)
  }

  return results
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate equal distribution amounts
 */
export function calculateEqualDistribution(
  total: bigint,
  recipientCount: number
): bigint[] {
  const base = total / BigInt(recipientCount)
  const remainder = total % BigInt(recipientCount)

  const amounts: bigint[] = []
  for (let i = 0; i < recipientCount; i++) {
    // Give remainder to first recipients
    amounts.push(base + (BigInt(i) < remainder ? 1n : 0n))
  }

  return amounts
}

/**
 * Calculate weighted distribution amounts
 */
export function calculateWeightedDistribution(
  total: bigint,
  weights: number[]
): bigint[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  if (totalWeight === 0) {
    throw new Error('Total weight must be greater than 0')
  }

  const amounts = weights.map((weight) =>
    (total * BigInt(Math.floor(weight * 1000000))) / BigInt(Math.floor(totalWeight * 1000000))
  )

  // Adjust for rounding errors
  const distributed = amounts.reduce((sum, a) => sum + a, 0n)
  if (distributed < total) {
    amounts[0] += total - distributed
  }

  return amounts
}
