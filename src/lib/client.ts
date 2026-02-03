import {
  type Chain,
  type Client,
  type Hex,
  type PublicActions,
  type Transport,
  type WalletActions,
  type Account,
  createClient,
  http,
  publicActions,
  walletActions,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { loadConfig, getRpcUrl } from './config.js'
import { Contracts } from './constants.js'

// ============================================================================
// Chain Definition
// ============================================================================

// Tempo Mainnet chain definition
// NOTE: Mainnet is not yet launched. These are placeholder values.
export const tempoMainnet: Chain = {
  id: 42429,
  name: 'Tempo Mainnet',
  nativeCurrency: {
    decimals: 6,
    name: 'pathUSD',
    symbol: 'pathUSD',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explorer.tempo.xyz',
    },
  },
  contracts: {
    multicall3: {
      address: Contracts.MULTICALL3,
    },
  },
}

// Tempo testnet chain definition
export const tempoTestnet: Chain = {
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: {
    decimals: 6,
    name: 'pathUSD',
    symbol: 'pathUSD',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Testnet Explorer',
      url: 'https://explore.tempo.xyz',
    },
  },
  testnet: true,
  contracts: {
    multicall3: {
      address: Contracts.MULTICALL3,
    },
  },
}

// ============================================================================
// Client Types
// ============================================================================

export type TempoClient = Client<
  Transport,
  Chain,
  undefined,
  undefined,
  PublicActions<Transport, Chain> & WalletActions<Chain, undefined>
>

export type TempoWalletClient = Client<
  Transport,
  Chain,
  Account,
  undefined,
  PublicActions<Transport, Chain> & WalletActions<Chain, Account>
>

// ============================================================================
// Client Factory
// ============================================================================

export interface CreateClientOptions {
  rpcUrl?: string
  privateKey?: Hex
  chain?: Chain
}

// RPC client configuration
const RPC_CONFIG = {
  timeout: 30_000, // 30 seconds
  retryCount: 3,
  retryDelay: 2000, // 2 seconds between retries (increased from 1s for better reliability)
}

/**
 * Create a public client for read-only operations
 */
export function createTempoPublicClient(options: CreateClientOptions = {}): TempoClient {
  const config = loadConfig()
  const rpcUrl = options.rpcUrl || config.rpcUrl || getRpcUrl()
  const chain = options.chain || (config.network === 'testnet' ? tempoTestnet : tempoMainnet)

  return createClient({
    chain,
    transport: http(rpcUrl, {
      timeout: RPC_CONFIG.timeout,
      retryCount: RPC_CONFIG.retryCount,
      retryDelay: RPC_CONFIG.retryDelay,
    }),
  })
    .extend(publicActions)
    .extend(walletActions)
}

/**
 * Create a wallet client for write operations
 * Requires a private key
 */
export function createTempoWalletClient(options: CreateClientOptions = {}): TempoWalletClient {
  const config = loadConfig(true) // Require private key
  const rpcUrl = options.rpcUrl || config.rpcUrl || getRpcUrl()
  const privateKey = options.privateKey || config.privateKey
  const chain = options.chain || (config.network === 'testnet' ? tempoTestnet : tempoMainnet)

  if (!privateKey) {
    throw new Error('Private key is required for wallet client')
  }

  const account = privateKeyToAccount(privateKey)

  return createClient({
    account,
    chain,
    transport: http(rpcUrl, {
      timeout: RPC_CONFIG.timeout,
      retryCount: RPC_CONFIG.retryCount,
      retryDelay: RPC_CONFIG.retryDelay,
    }),
  })
    .extend(publicActions)
    .extend(walletActions) as TempoWalletClient
}

/**
 * Create a client that can be used for both read and write operations
 * If a private key is available, returns a wallet client
 * Otherwise returns a public client
 */
export function createTempoClient(options: CreateClientOptions = {}): TempoClient | TempoWalletClient {
  try {
    const config = loadConfig(false)
    if (config.privateKey || options.privateKey) {
      return createTempoWalletClient(options)
    }
  } catch {
    // No private key available, fall through to public client
  }
  return createTempoPublicClient(options)
}

// ============================================================================
// Singleton Client Instance
// ============================================================================

let _publicClient: TempoClient | null = null
let _walletClient: TempoWalletClient | null = null

/**
 * Get a singleton public client instance
 */
export function getPublicClient(): TempoClient {
  if (!_publicClient) {
    _publicClient = createTempoPublicClient()
  }
  return _publicClient
}

/**
 * Get a singleton wallet client instance
 * Creates a new one if the private key changes
 */
export function getWalletClient(): TempoWalletClient {
  if (!_walletClient) {
    _walletClient = createTempoWalletClient()
  }
  return _walletClient
}

/**
 * Reset cached clients (useful for testing or config changes)
 */
export function resetClients(): void {
  _publicClient = null
  _walletClient = null
}
