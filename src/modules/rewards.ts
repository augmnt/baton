import type { Address } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts } from '../lib/constants.js'
import type { RewardDistribution, TransactionResult } from '../lib/types.js'
import { validateAddress, validatePositiveAmount } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get claimable rewards for an account
 */
export async function getClaimableRewards(
  token: Address,
  account: Address
): Promise<bigint> {
  const client = getPublicClient()

  try {
    const claimable = (await client.readContract({
      address: Contracts.REWARDS_DISTRIBUTOR,
      abi: Abis.rewardsDistributor,
      functionName: 'getClaimable',
      args: [validateAddress(token), validateAddress(account)],
    })) as bigint

    return claimable
  } catch {
    return 0n
  }
}

/**
 * Get claimable rewards for multiple tokens
 */
export async function getClaimableRewardsMulti(
  tokens: Address[],
  account: Address
): Promise<Map<Address, bigint>> {
  const client = getPublicClient()
  const validAccount = validateAddress(account)

  const results = await client.multicall({
    contracts: tokens.map((token) => ({
      address: Contracts.REWARDS_DISTRIBUTOR,
      abi: Abis.rewardsDistributor,
      functionName: 'getClaimable',
      args: [validateAddress(token), validAccount],
    })),
  })

  const claimables = new Map<Address, bigint>()
  for (let i = 0; i < tokens.length; i++) {
    const result = results[i]
    const amount = result.status === 'success' ? (result.result as bigint) : 0n
    claimables.set(validateAddress(tokens[i]), amount)
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
export async function setRewardRecipient(recipient: Address): Promise<TransactionResult> {
  const client = getWalletClient()

  const hash = await client.writeContract({
    address: Contracts.REWARDS_DISTRIBUTOR,
    abi: Abis.rewardsDistributor,
    functionName: 'setRewardRecipient',
    args: [validateAddress(recipient)],
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
 */
export async function distributeReward(
  params: RewardDistribution
): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, recipients, amounts } = params

  // Validate inputs
  if (recipients.length !== amounts.length) {
    throw new Error('Recipients and amounts arrays must have the same length')
  }

  if (recipients.length === 0) {
    throw new Error('Must have at least one recipient')
  }

  // Validate amounts
  amounts.forEach((amount, i) => {
    validatePositiveAmount(amount, `amounts[${i}]`)
  })

  // Calculate total and approve
  const total = amounts.reduce((sum, amount) => sum + amount, 0n)

  // Approve rewards distributor
  const approveHash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'approve',
    args: [Contracts.REWARDS_DISTRIBUTOR, total],
  })
  await client.waitForTransactionReceipt({ hash: approveHash })

  // Distribute
  const hash = await client.writeContract({
    address: Contracts.REWARDS_DISTRIBUTOR,
    abi: Abis.rewardsDistributor,
    functionName: 'distributeReward',
    args: [validateAddress(token), recipients.map(validateAddress), amounts],
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

  const hash = await client.writeContract({
    address: Contracts.REWARDS_DISTRIBUTOR,
    abi: Abis.rewardsDistributor,
    functionName: 'claimRewards',
    args: [validateAddress(token)],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Parse claimed amount from logs
  let claimed: bigint | undefined

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
