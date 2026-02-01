import type { Address } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import { Abis, Contracts } from '../lib/constants.js'
import type { AccessKeyInfo, AccessKeyPermissions, TransactionResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// ============================================================================
// Permission Flags (Bitwise)
// ============================================================================

export const PermissionFlags = {
  TRANSFER: 1n << 0n,
  APPROVE: 1n << 1n,
  MANAGE_KEYS: 1n << 2n,
  // Add more as needed
} as const

/**
 * Encode permissions to a uint256
 */
export function encodePermissions(permissions: AccessKeyPermissions): bigint {
  let encoded = 0n

  if (permissions.canTransfer) {
    encoded |= PermissionFlags.TRANSFER
  }
  if (permissions.canApprove) {
    encoded |= PermissionFlags.APPROVE
  }
  if (permissions.canManageKeys) {
    encoded |= PermissionFlags.MANAGE_KEYS
  }

  return encoded
}

/**
 * Decode permissions from a uint256
 */
export function decodePermissions(encoded: bigint): AccessKeyPermissions {
  return {
    canTransfer: (encoded & PermissionFlags.TRANSFER) !== 0n,
    canApprove: (encoded & PermissionFlags.APPROVE) !== 0n,
    canManageKeys: (encoded & PermissionFlags.MANAGE_KEYS) !== 0n,
    allowedTokens: [], // Would need separate lookup
  }
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get access key information
 */
export async function getAccessKey(
  owner: Address,
  accessKey: Address
): Promise<AccessKeyInfo | null> {
  const client = getPublicClient()

  try {
    const result = (await client.readContract({
      address: Contracts.ACCOUNT_KEYCHAIN,
      abi: Abis.accountKeychain,
      functionName: 'getAccessKey',
      args: [validateAddress(owner), validateAddress(accessKey)],
    })) as [bigint, bigint, boolean]

    const [permissionsEncoded, expiry, isActive] = result

    if (!isActive && expiry === 0n) {
      return null // Key doesn't exist
    }

    return {
      accessKey: validateAddress(accessKey),
      owner: validateAddress(owner),
      permissions: decodePermissions(permissionsEncoded),
      expiry,
      isActive,
    }
  } catch {
    return null
  }
}

/**
 * Get all access keys for an owner
 */
export async function getAccessKeys(owner: Address): Promise<Address[]> {
  const client = getPublicClient()

  try {
    const keys = (await client.readContract({
      address: Contracts.ACCOUNT_KEYCHAIN,
      abi: Abis.accountKeychain,
      functionName: 'getAccessKeys',
      args: [validateAddress(owner)],
    })) as Address[]

    return keys
  } catch {
    return []
  }
}

/**
 * Get detailed info for all access keys of an owner
 */
export async function getAccessKeysWithInfo(owner: Address): Promise<AccessKeyInfo[]> {
  const keys = await getAccessKeys(owner)

  const infos: AccessKeyInfo[] = []
  for (const key of keys) {
    const info = await getAccessKey(owner, key)
    if (info) {
      infos.push(info)
    }
  }

  return infos
}

/**
 * Check if an access key has specific permission
 */
export async function hasPermission(
  owner: Address,
  accessKey: Address,
  permission: keyof typeof PermissionFlags
): Promise<boolean> {
  const info = await getAccessKey(owner, accessKey)

  if (!info || !info.isActive) {
    return false
  }

  // Check expiry
  if (info.expiry > 0n) {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (info.expiry < now) {
      return false
    }
  }

  const permissionFlag = PermissionFlags[permission]
  const encoded = encodePermissions(info.permissions)
  return (encoded & permissionFlag) !== 0n
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Authorize a new access key
 */
export async function authorizeAccessKey(params: {
  accessKey: Address
  permissions: AccessKeyPermissions
  expiry?: bigint
}): Promise<TransactionResult> {
  const client = getWalletClient()
  const { accessKey, permissions, expiry = 0n } = params

  const encodedPermissions = encodePermissions(permissions)

  const hash = await client.writeContract({
    address: Contracts.ACCOUNT_KEYCHAIN,
    abi: Abis.accountKeychain,
    functionName: 'authorizeAccessKey',
    args: [validateAddress(accessKey), encodedPermissions, expiry],
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
 * Revoke an access key
 */
export async function revokeAccessKey(accessKey: Address): Promise<TransactionResult> {
  const client = getWalletClient()

  const hash = await client.writeContract({
    address: Contracts.ACCOUNT_KEYCHAIN,
    abi: Abis.accountKeychain,
    functionName: 'revokeAccessKey',
    args: [validateAddress(accessKey)],
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
 * Update access key permissions
 */
export async function updateAccessKeyPermissions(params: {
  accessKey: Address
  permissions: AccessKeyPermissions
  expiry?: bigint
}): Promise<TransactionResult> {
  // Revoke and re-authorize with new permissions
  await revokeAccessKey(params.accessKey)
  return authorizeAccessKey(params)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a full-permission access key (all permissions enabled)
 */
export async function authorizeFullAccessKey(
  accessKey: Address,
  expiry?: bigint
): Promise<TransactionResult> {
  return authorizeAccessKey({
    accessKey,
    permissions: {
      canTransfer: true,
      canApprove: true,
      canManageKeys: true,
      allowedTokens: [],
    },
    expiry,
  })
}

/**
 * Create a transfer-only access key
 */
export async function authorizeTransferOnlyKey(
  accessKey: Address,
  expiry?: bigint
): Promise<TransactionResult> {
  return authorizeAccessKey({
    accessKey,
    permissions: {
      canTransfer: true,
      canApprove: false,
      canManageKeys: false,
      allowedTokens: [],
    },
    expiry,
  })
}

/**
 * Check if access key is expired
 */
export function isExpired(info: AccessKeyInfo): boolean {
  if (info.expiry === 0n) {
    return false // No expiry
  }
  const now = BigInt(Math.floor(Date.now() / 1000))
  return info.expiry < now
}

/**
 * Get remaining time until expiry
 */
export function getTimeUntilExpiry(info: AccessKeyInfo): bigint {
  if (info.expiry === 0n) {
    return BigInt(Number.MAX_SAFE_INTEGER) // No expiry
  }
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (info.expiry <= now) {
    return 0n
  }
  return info.expiry - now
}
