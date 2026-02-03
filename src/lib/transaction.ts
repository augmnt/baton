import type { Hash } from 'viem'
import type { TempoWalletClient } from './client.js'
import { buildExplorerTxUrl } from './config.js'
import type { TransactionResult } from './types.js'

/**
 * Build a standardized transaction result from a transaction hash.
 * Waits for the transaction receipt and constructs the result object.
 *
 * @param client - The wallet client to use for waiting on the receipt
 * @param hash - The transaction hash
 * @returns A standardized TransactionResult object
 */
export async function buildTransactionResult(
  client: TempoWalletClient,
  hash: Hash
): Promise<TransactionResult> {
  const receipt = await client.waitForTransactionReceipt({ hash })

  return {
    success: receipt.status === 'success',
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: buildExplorerTxUrl(hash),
  }
}

/**
 * Build a transaction result with additional data.
 * Useful for operations that return extra information like order IDs.
 *
 * @param client - The wallet client to use for waiting on the receipt
 * @param hash - The transaction hash
 * @param additionalData - Additional data to include in the result
 * @returns A TransactionResult merged with the additional data
 */
export async function buildTransactionResultWithData<T extends Record<string, unknown>>(
  client: TempoWalletClient,
  hash: Hash,
  additionalData: T
): Promise<TransactionResult & T> {
  const baseResult = await buildTransactionResult(client, hash)
  return { ...baseResult, ...additionalData }
}
