import { config as dotenvConfig } from 'dotenv'
import type { Address, Hex } from 'viem'
import { Networks } from './constants.js'
import type { BatonConfig } from './types.js'
import { deriveAddress } from '../modules/wallet.js'

// Load environment variables from .env file
dotenvConfig()

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

/**
 * Validates that a string is a valid hex private key
 */
function isValidPrivateKey(key: string): key is Hex {
  // Remove 0x prefix for length check
  const cleanKey = key.startsWith('0x') ? key.slice(2) : key
  // Private key should be 64 hex characters (32 bytes)
  return /^[0-9a-fA-F]{64}$/.test(cleanKey)
}

/**
 * Get private key from environment, throwing if required but missing
 */
export function getPrivateKey(required: true): Hex
export function getPrivateKey(required?: false): Hex | undefined
export function getPrivateKey(required = false): Hex | undefined {
  const key = process.env.TEMPO_PRIVATE_KEY

  if (!key) {
    if (required) {
      throw new ConfigError(
        'TEMPO_PRIVATE_KEY is required for this operation. ' +
          'Set it in your environment or .env file.'
      )
    }
    return undefined
  }

  // Normalize the key to have 0x prefix
  const normalizedKey = key.startsWith('0x') ? key : `0x${key}`

  if (!isValidPrivateKey(normalizedKey)) {
    throw new ConfigError(
      'TEMPO_PRIVATE_KEY is invalid. ' +
        'It should be a 64-character hex string (32 bytes).'
    )
  }

  return normalizedKey as Hex
}

/**
 * Get the network configuration
 */
export function getNetwork(): 'mainnet' | 'testnet' {
  const network = process.env.TEMPO_NETWORK?.toLowerCase()
  if (network === 'testnet') {
    return 'testnet'
  }
  return 'mainnet'
}

/**
 * Get the RPC URL from environment or use default
 */
export function getRpcUrl(): string {
  const envUrl = process.env.TEMPO_RPC_URL
  if (envUrl) {
    return envUrl
  }
  return Networks[getNetwork()].rpcUrl
}

/**
 * Get the explorer URL from environment or use default
 */
export function getExplorerUrl(): string {
  const envUrl = process.env.TEMPO_EXPLORER_URL
  if (envUrl) {
    return envUrl
  }
  return Networks[getNetwork()].explorerUrl
}

/**
 * Load full configuration from environment
 */
export function loadConfig(requirePrivateKey = false): BatonConfig {
  return {
    rpcUrl: getRpcUrl(),
    explorerUrl: getExplorerUrl(),
    network: getNetwork(),
    privateKey: requirePrivateKey ? getPrivateKey(true) : getPrivateKey(false),
  }
}

/**
 * Build an explorer URL for a transaction
 */
export function buildExplorerTxUrl(txHash: string): string {
  return `${getExplorerUrl()}/tx/${txHash}`
}

/**
 * Build an explorer URL for an address
 */
export function buildExplorerAddressUrl(address: string): string {
  return `${getExplorerUrl()}/address/${address}`
}

/**
 * Build an explorer URL for a block
 */
export function buildExplorerBlockUrl(blockNumber: bigint | number): string {
  return `${getExplorerUrl()}/block/${blockNumber.toString()}`
}

/**
 * Get the wallet address derived from the configured private key
 * @throws ConfigError if TEMPO_PRIVATE_KEY is not set or invalid
 */
export function getConfiguredAddress(): Address {
  const privateKey = getPrivateKey(true) // throws if not configured
  return deriveAddress(privateKey)
}
