import type { Address, Hex } from 'viem'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts } from '../lib/constants.js'
import type { PolicyRule, PolicyRuleType, TransactionResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// ============================================================================
// Policy Rule Encoding
// ============================================================================

const RULE_TYPE_IDS: Record<PolicyRuleType, number> = {
  MAX_AMOUNT: 1,
  DAILY_LIMIT: 2,
  ALLOWED_RECIPIENTS: 3,
  BLOCKED_RECIPIENTS: 4,
  TIME_LOCK: 5,
}

/**
 * Encode policy rules to bytes
 */
export function encodePolicyRules(rules: PolicyRule[]): Hex {
  const encoded = rules.map((rule) => {
    const typeId = RULE_TYPE_IDS[rule.ruleType]
    const value =
      typeof rule.value === 'bigint'
        ? rule.value
        : BigInt(rule.value.toString().replace('0x', ''))

    return { typeId, value }
  })

  return encodeAbiParameters(
    parseAbiParameters('(uint8 typeId, uint256 value)[]'),
    [encoded.map((e) => ({ typeId: e.typeId, value: e.value }))]
  )
}

/**
 * Decode policy rules from bytes
 */
export function decodePolicyRules(_data: Hex): PolicyRule[] {
  // Would need proper decoding logic
  return []
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get policy by ID
 */
export async function getPolicy(policyId: bigint): Promise<{
  name: string
  owner: Address
  rules: Hex
} | null> {
  const client = getPublicClient()

  try {
    const result = (await client.readContract({
      address: Contracts.POLICY_REGISTRY,
      abi: Abis.policyRegistry,
      functionName: 'getPolicy',
      args: [policyId],
    })) as [string, Address, Hex]

    const [name, owner, rules] = result

    if (owner === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return { name, owner, rules }
  } catch {
    return null
  }
}

/**
 * Get transfer policy for a token
 */
export async function getTransferPolicy(token: Address): Promise<bigint> {
  const client = getPublicClient()

  try {
    const policyId = (await client.readContract({
      address: Contracts.POLICY_REGISTRY,
      abi: Abis.policyRegistry,
      functionName: 'getTransferPolicy',
      args: [validateAddress(token)],
    })) as bigint

    return policyId
  } catch {
    return 0n
  }
}

/**
 * Check if a token has a transfer policy
 */
export async function hasTransferPolicy(token: Address): Promise<boolean> {
  const policyId = await getTransferPolicy(token)
  return policyId > 0n
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Create a new policy
 */
export async function createPolicy(params: {
  name: string
  rules: PolicyRule[]
}): Promise<TransactionResult & { policyId?: bigint }> {
  const client = getWalletClient()
  const { name, rules } = params

  const encodedRules = encodePolicyRules(rules)

  const hash = await client.writeContract({
    address: Contracts.POLICY_REGISTRY,
    abi: Abis.policyRegistry,
    functionName: 'createPolicy',
    args: [name, encodedRules],
  })

  const receipt = await client.waitForTransactionReceipt({ hash })

  // Parse policy ID from logs
  let policyId: bigint | undefined

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
    policyId,
  }
}

/**
 * Set transfer policy for a token
 */
export async function setTransferPolicy(params: {
  token: Address
  policyId: bigint
}): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, policyId } = params

  const hash = await client.writeContract({
    address: Contracts.POLICY_REGISTRY,
    abi: Abis.policyRegistry,
    functionName: 'setTransferPolicy',
    args: [validateAddress(token), policyId],
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
 * Remove transfer policy from a token (set to 0)
 */
export async function removeTransferPolicy(token: Address): Promise<TransactionResult> {
  return setTransferPolicy({ token, policyId: 0n })
}

// ============================================================================
// Policy Builder Utilities
// ============================================================================

/**
 * Create a max amount rule
 */
export function maxAmountRule(amount: bigint): PolicyRule {
  return { ruleType: 'MAX_AMOUNT', value: amount }
}

/**
 * Create a daily limit rule
 */
export function dailyLimitRule(amount: bigint): PolicyRule {
  return { ruleType: 'DAILY_LIMIT', value: amount }
}

/**
 * Create a time lock rule (seconds)
 */
export function timeLockRule(seconds: bigint): PolicyRule {
  return { ruleType: 'TIME_LOCK', value: seconds }
}

/**
 * Create a standard transfer limit policy
 */
export async function createTransferLimitPolicy(
  name: string,
  maxAmount: bigint,
  dailyLimit?: bigint
): Promise<TransactionResult & { policyId?: bigint }> {
  const rules: PolicyRule[] = [maxAmountRule(maxAmount)]

  if (dailyLimit) {
    rules.push(dailyLimitRule(dailyLimit))
  }

  return createPolicy({ name, rules })
}

/**
 * Create a time-locked policy
 */
export async function createTimeLockPolicy(
  name: string,
  lockSeconds: bigint,
  maxAmount?: bigint
): Promise<TransactionResult & { policyId?: bigint }> {
  const rules: PolicyRule[] = [timeLockRule(lockSeconds)]

  if (maxAmount) {
    rules.push(maxAmountRule(maxAmount))
  }

  return createPolicy({ name, rules })
}
