import type { Hash } from 'viem'
import { getPublicClient } from '../lib/client.js'
import type { BlockInfo, ChainInfo, TransactionInfo } from '../lib/types.js'

/**
 * Get the current block number
 */
export async function getBlockNumber(): Promise<bigint> {
  const client = getPublicClient()
  return client.getBlockNumber()
}

/**
 * Get block information by number or hash
 */
export async function getBlock(
  blockIdentifier: bigint | Hash | 'latest' | 'pending' | 'earliest' = 'latest'
): Promise<BlockInfo> {
  const client = getPublicClient()

  let block
  if (typeof blockIdentifier === 'bigint') {
    block = await client.getBlock({ blockNumber: blockIdentifier })
  } else if (typeof blockIdentifier === 'string' && blockIdentifier.startsWith('0x')) {
    block = await client.getBlock({ blockHash: blockIdentifier as Hash })
  } else {
    block = await client.getBlock({ blockTag: blockIdentifier as 'latest' | 'pending' | 'earliest' })
  }

  return {
    number: block.number!,
    hash: block.hash!,
    timestamp: block.timestamp,
    transactionCount: block.transactions.length,
  }
}

/**
 * Get transaction information by hash
 */
export async function getTransaction(txHash: Hash): Promise<TransactionInfo> {
  const client = getPublicClient()

  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: txHash }),
    client.getTransactionReceipt({ hash: txHash }).catch(() => null),
  ])

  // Get block timestamp
  let timestamp = 0n
  if (tx.blockNumber) {
    const block = await client.getBlock({ blockNumber: tx.blockNumber })
    timestamp = block.timestamp
  }

  let status: 'success' | 'failed' | 'pending' = 'pending'
  if (receipt) {
    status = receipt.status === 'success' ? 'success' : 'failed'
  }

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    data: tx.input,
    blockNumber: tx.blockNumber ?? 0n,
    timestamp,
    status,
  }
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(txHash: Hash) {
  const client = getPublicClient()
  return client.getTransactionReceipt({ hash: txHash })
}

/**
 * Get chain information
 */
export async function getChainInfo(): Promise<ChainInfo> {
  const client = getPublicClient()

  const [blockNumber, chainId, gasPrice] = await Promise.all([
    client.getBlockNumber(),
    client.getChainId(),
    client.getGasPrice(),
  ])

  return {
    chainId,
    name: client.chain?.name ?? 'Tempo',
    blockNumber,
    gasPrice,
  }
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(txHash: Hash, confirmations = 1) {
  const client = getPublicClient()
  return client.waitForTransactionReceipt({
    hash: txHash,
    confirmations,
  })
}

/**
 * Get the current gas price
 */
export async function getGasPrice(): Promise<bigint> {
  const client = getPublicClient()
  return client.getGasPrice()
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(params: {
  to: `0x${string}`
  data?: `0x${string}`
  value?: bigint
}): Promise<bigint> {
  const client = getPublicClient()
  return client.estimateGas(params)
}
