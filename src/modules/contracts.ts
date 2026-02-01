import type { Address, Hex } from 'viem'
import { decodeFunctionResult, encodeFunctionData } from 'viem'
import { getPublicClient, getWalletClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import type { ContractCallParams, ContractWriteParams, TransactionResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Read from a contract
 */
export async function readContract<T = unknown>(params: ContractCallParams): Promise<T> {
  const client = getPublicClient()
  const { address, abi, functionName, args = [] } = params

  const result = await client.readContract({
    address: validateAddress(address),
    abi: abi as any,
    functionName,
    args: args as any,
  })

  return result as T
}

/**
 * Read multiple contract calls using multicall
 */
export async function readContractMulti<T = unknown[]>(
  calls: ContractCallParams[]
): Promise<T[]> {
  const client = getPublicClient()

  const results = await client.multicall({
    contracts: calls.map((call) => ({
      address: validateAddress(call.address),
      abi: call.abi as any,
      functionName: call.functionName,
      args: (call.args || []) as any,
    })),
  })

  return results.map((result) => {
    if (result.status === 'success') {
      return result.result as T
    }
    throw new Error(`Multicall failed: ${result.error?.message || 'Unknown error'}`)
  }) as T[]
}

/**
 * Simulate a contract call without executing
 */
export async function simulateContract<T = unknown>(params: ContractWriteParams): Promise<T> {
  const client = getPublicClient()
  const { address, abi, functionName, args = [], value } = params

  const result = await client.simulateContract({
    address: validateAddress(address),
    abi: abi as any,
    functionName,
    args: args as any,
    value,
  })

  return result.result as T
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Write to a contract
 */
export async function writeContract(params: ContractWriteParams): Promise<TransactionResult> {
  const client = getWalletClient()
  const { address, abi, functionName, args = [], value } = params

  const hash = await client.writeContract({
    address: validateAddress(address),
    abi: abi as any,
    functionName,
    args: args as any,
    value,
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
 * Execute raw transaction
 */
export async function sendTransaction(params: {
  to: Address
  data?: Hex
  value?: bigint
}): Promise<TransactionResult> {
  const client = getWalletClient()
  const { to, data, value } = params

  const hash = await client.sendTransaction({
    to: validateAddress(to),
    data,
    value,
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
 * Encode function data for a contract call
 */
export function encodeContractData(params: {
  abi: unknown[]
  functionName: string
  args?: unknown[]
}): Hex {
  const { abi, functionName, args = [] } = params

  return encodeFunctionData({
    abi: abi as any,
    functionName,
    args: args as any,
  })
}

/**
 * Decode function result
 */
export function decodeContractResult<T = unknown>(params: {
  abi: unknown[]
  functionName: string
  data: Hex
}): T {
  const { abi, functionName, data } = params

  return decodeFunctionResult({
    abi: abi as any,
    functionName,
    data,
  }) as T
}

/**
 * Get contract code at an address
 */
export async function getContractCode(address: Address): Promise<Hex | undefined> {
  const client = getPublicClient()
  const code = await client.getCode({ address: validateAddress(address) })
  return code
}

/**
 * Check if an address is a contract
 */
export async function isContract(address: Address): Promise<boolean> {
  const code = await getContractCode(address)
  return code !== undefined && code !== '0x'
}

/**
 * Estimate gas for a contract call
 */
export async function estimateContractGas(params: ContractWriteParams): Promise<bigint> {
  const client = getPublicClient()
  const { address, abi, functionName, args = [], value } = params

  return client.estimateContractGas({
    address: validateAddress(address),
    abi: abi as any,
    functionName,
    args: args as any,
    value,
  })
}

/**
 * Get storage at a specific slot
 */
export async function getStorageAt(
  address: Address,
  slot: Hex
): Promise<Hex> {
  const client = getPublicClient()
  const result = await client.getStorageAt({
    address: validateAddress(address),
    slot,
  })
  return result || '0x0000000000000000000000000000000000000000000000000000000000000000'
}
