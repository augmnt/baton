import type { Address, Hash, Hex } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Roles } from '../lib/constants.js'
import type {
  ApprovalParams,
  BatchTransferParams,
  BurnParams,
  MintParams,
  TokenMetadata,
  TransactionResult,
  TransferParams,
} from '../lib/types.js'
import { formatAmount, toMemo, validateAddress, validatePositiveAmount } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get token metadata (name, symbol, decimals, totalSupply)
 */
export async function getTokenMetadata(token: Address): Promise<TokenMetadata> {
  const client = getPublicClient()
  const validToken = validateAddress(token)

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'name',
    }) as Promise<string>,
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'symbol',
    }) as Promise<string>,
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'decimals',
    }) as Promise<number>,
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'totalSupply',
    }) as Promise<bigint>,
  ])

  return {
    address: validToken,
    name,
    symbol,
    decimals,
    totalSupply,
  }
}

/**
 * Get allowance for a spender
 */
export async function getAllowance(
  token: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  const client = getPublicClient()

  const allowance = await client.readContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'allowance',
    args: [validateAddress(owner), validateAddress(spender)],
  })

  return allowance as bigint
}

/**
 * Check if an account has a specific role
 */
export async function hasRole(
  token: Address,
  role: keyof typeof Roles | Hex,
  account: Address
): Promise<boolean> {
  const client = getPublicClient()
  const roleHash: Hex = typeof role === 'string' && role in Roles ? Roles[role as keyof typeof Roles] as Hex : role as Hex

  const result = await client.readContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'hasRole',
    args: [roleHash, validateAddress(account)],
  })

  return result as boolean
}

/**
 * Get all roles for an account on a token
 */
export async function getRoles(
  token: Address,
  account: Address
): Promise<{ admin: boolean; minter: boolean; burner: boolean; pauser: boolean }> {
  const client = getPublicClient()
  const validToken = validateAddress(token)
  const validAccount = validateAddress(account)

  const results = await client.multicall({
    contracts: [
      {
        address: validToken,
        abi: Abis.tip20,
        functionName: 'hasRole',
        args: [Roles.DEFAULT_ADMIN_ROLE, validAccount],
      },
      {
        address: validToken,
        abi: Abis.tip20,
        functionName: 'hasRole',
        args: [Roles.MINTER_ROLE, validAccount],
      },
      {
        address: validToken,
        abi: Abis.tip20,
        functionName: 'hasRole',
        args: [Roles.BURNER_ROLE, validAccount],
      },
      {
        address: validToken,
        abi: Abis.tip20,
        functionName: 'hasRole',
        args: [Roles.PAUSER_ROLE, validAccount],
      },
    ],
  })

  return {
    admin: results[0].status === 'success' ? (results[0].result as boolean) : false,
    minter: results[1].status === 'success' ? (results[1].result as boolean) : false,
    burner: results[2].status === 'success' ? (results[2].result as boolean) : false,
    pauser: results[3].status === 'success' ? (results[3].result as boolean) : false,
  }
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Transfer tokens to an address
 */
export async function transfer(params: TransferParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, to, amount, memo } = params

  validatePositiveAmount(amount)

  let hash: Hash

  if (memo) {
    // Use transferWithMemo if memo is provided
    hash = await client.writeContract({
      address: validateAddress(token),
      abi: Abis.tip20,
      functionName: 'transferWithMemo',
      args: [validateAddress(to), amount, toMemo(memo)],
    })
  } else {
    hash = await client.writeContract({
      address: validateAddress(token),
      abi: Abis.tip20,
      functionName: 'transfer',
      args: [validateAddress(to), amount],
    })
  }

  const receipt = await client.waitForTransactionReceipt({ hash })

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
  }
}

/**
 * Batch transfer tokens to multiple addresses
 */
export async function batchTransfer(params: BatchTransferParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, transfers } = params

  // For batch transfers, we'll need to execute multiple transactions
  // or use a batch contract if available
  // For now, we'll execute sequentially
  const validToken = validateAddress(token)

  // Prepare all transfer calls
  const hashes: Hash[] = []
  for (const t of transfers) {
    validatePositiveAmount(t.amount)

    let hash: Hash
    if (t.memo) {
      hash = await client.writeContract({
        address: validToken,
        abi: Abis.tip20,
        functionName: 'transferWithMemo',
        args: [validateAddress(t.to), t.amount, toMemo(t.memo)],
      })
    } else {
      hash = await client.writeContract({
        address: validToken,
        abi: Abis.tip20,
        functionName: 'transfer',
        args: [validateAddress(t.to), t.amount],
      })
    }
    hashes.push(hash)
  }

  // Wait for the last transaction
  const lastHash = hashes[hashes.length - 1]
  const receipt = await client.waitForTransactionReceipt({ hash: lastHash })

  return {
    success: receipt.status === 'success',
    transactionHash: lastHash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(lastHash),
  }
}

/**
 * Approve a spender to transfer tokens
 */
export async function approve(params: ApprovalParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, spender, amount } = params

  const hash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'approve',
    args: [validateAddress(spender), amount],
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
 * Mint new tokens (requires MINTER_ROLE)
 */
export async function mint(params: MintParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, to, amount } = params

  validatePositiveAmount(amount)

  const hash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'mint',
    args: [validateAddress(to), amount],
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
 * Burn tokens from own balance
 */
export async function burn(params: BurnParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { token, amount } = params

  validatePositiveAmount(amount)

  const hash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'burn',
    args: [amount],
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
 * Grant a role to an account (requires admin)
 */
export async function grantRole(
  token: Address,
  role: keyof typeof Roles | Hex,
  account: Address
): Promise<TransactionResult> {
  const client = getWalletClient()
  const roleHash: Hex = typeof role === 'string' && role in Roles ? Roles[role as keyof typeof Roles] as Hex : role as Hex

  const hash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'grantRole',
    args: [roleHash, validateAddress(account)],
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
 * Revoke a role from an account (requires admin)
 */
export async function revokeRole(
  token: Address,
  role: keyof typeof Roles | Hex,
  account: Address
): Promise<TransactionResult> {
  const client = getWalletClient()
  const roleHash: Hex = typeof role === 'string' && role in Roles ? Roles[role as keyof typeof Roles] as Hex : role as Hex

  const hash = await client.writeContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'revokeRole',
    args: [roleHash, validateAddress(account)],
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
 * Format token amount with symbol
 */
export async function formatTokenAmount(token: Address, amount: bigint): Promise<string> {
  const metadata = await getTokenMetadata(token)
  return `${formatAmount(amount, metadata.decimals)} ${metadata.symbol}`
}

/**
 * Check if a transfer will succeed (balance check)
 */
export async function canTransfer(
  token: Address,
  from: Address,
  amount: bigint
): Promise<{ canTransfer: boolean; balance: bigint; shortfall: bigint }> {
  const client = getPublicClient()

  const balance = (await client.readContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'balanceOf',
    args: [validateAddress(from)],
  })) as bigint

  const canDo = balance >= amount
  const shortfall = canDo ? 0n : amount - balance

  return {
    canTransfer: canDo,
    balance,
    shortfall,
  }
}
