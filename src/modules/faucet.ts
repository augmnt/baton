import type { Address } from 'viem'
import { getPublicClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import type { TransactionResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// Custom RPC method types for Tempo testnet faucet
interface FaucetFundResult {
  transactionHash: string
  blockNumber: string
}

interface FaucetInfoResult {
  amountPerRequest: string
  cooldownSeconds: number
  dailyLimit: string
}

interface FaucetStatusResult {
  canRequest: boolean
  cooldownRemaining: number
  lastRequestTime: string
}

// Type for custom RPC request with unknown method
interface CustomRpcRequest {
  method: string
  params?: unknown[]
}

/**
 * Fund an address via the testnet faucet
 * Uses the tempo_fundAddress RPC method
 */
export async function fundAddress(address: Address): Promise<TransactionResult> {
  const client = getPublicClient()
  const validAddress = validateAddress(address)

  try {
    // Call the custom RPC method for testnet faucet
    // Using type assertion to handle custom Tempo RPC methods
    const result = await (client.request as (req: CustomRpcRequest) => Promise<unknown>)({
      method: 'tempo_fundAddress',
      params: [validAddress],
    }) as FaucetFundResult

    return {
      success: true,
      transactionHash: result.transactionHash as `0x${string}`,
      blockNumber: BigInt(result.blockNumber),
      explorerUrl: buildExplorerTxUrl(result.transactionHash),
    }
  } catch (error) {
    // Handle specific faucet errors
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('rate limit') || message.includes('too many requests')) {
      throw new Error(
        'Faucet rate limit exceeded. Please wait before requesting again.'
      )
    }

    if (message.includes('not available') || message.includes('mainnet')) {
      throw new Error(
        'Faucet is only available on testnet. Please switch to testnet network.'
      )
    }

    throw new Error(`Faucet request failed: ${message}`)
  }
}

/**
 * Check if faucet is available
 */
export async function isFaucetAvailable(): Promise<boolean> {
  const client = getPublicClient()

  try {
    // Try to get faucet info
    await (client.request as (req: CustomRpcRequest) => Promise<unknown>)({
      method: 'tempo_faucetInfo',
      params: [],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get faucet status and limits
 */
export async function getFaucetInfo(): Promise<{
  available: boolean
  amountPerRequest: bigint
  cooldownSeconds: number
  dailyLimit: bigint
}> {
  const client = getPublicClient()

  try {
    const info = await (client.request as (req: CustomRpcRequest) => Promise<unknown>)({
      method: 'tempo_faucetInfo',
      params: [],
    }) as FaucetInfoResult

    return {
      available: true,
      amountPerRequest: BigInt(info.amountPerRequest),
      cooldownSeconds: info.cooldownSeconds,
      dailyLimit: BigInt(info.dailyLimit),
    }
  } catch {
    return {
      available: false,
      amountPerRequest: 0n,
      cooldownSeconds: 0,
      dailyLimit: 0n,
    }
  }
}

/**
 * Check faucet cooldown status for an address
 */
export async function getFaucetCooldown(address: Address): Promise<{
  canRequest: boolean
  cooldownRemaining: number
  lastRequestTime: bigint
}> {
  const client = getPublicClient()
  const validAddress = validateAddress(address)

  try {
    const status = await (client.request as (req: CustomRpcRequest) => Promise<unknown>)({
      method: 'tempo_faucetStatus',
      params: [validAddress],
    }) as FaucetStatusResult

    return {
      canRequest: status.canRequest,
      cooldownRemaining: status.cooldownRemaining,
      lastRequestTime: BigInt(status.lastRequestTime),
    }
  } catch {
    // Assume available if we can't check
    return {
      canRequest: true,
      cooldownRemaining: 0,
      lastRequestTime: 0n,
    }
  }
}

/**
 * Fund address if eligible (checks cooldown first)
 */
export async function fundAddressIfEligible(address: Address): Promise<{
  funded: boolean
  result?: TransactionResult
  reason?: string
}> {
  const validAddress = validateAddress(address)

  // Check if faucet is available
  const faucetAvailable = await isFaucetAvailable()
  if (!faucetAvailable) {
    return {
      funded: false,
      reason: 'Faucet is not available on this network',
    }
  }

  // Check cooldown
  const cooldown = await getFaucetCooldown(validAddress)
  if (!cooldown.canRequest) {
    return {
      funded: false,
      reason: `Please wait ${cooldown.cooldownRemaining} seconds before requesting again`,
    }
  }

  // Fund the address
  const result = await fundAddress(validAddress)
  return {
    funded: true,
    result,
  }
}
