import type { Address, Log } from 'viem'
import { decodeEventLog, parseAbiItem } from 'viem'
import { getPublicClient } from '../lib/client.js'
import { Abis, RpcLimits } from '../lib/constants.js'
import type { TransferEvent } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// Transfer event signature
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
)

// Transfer with memo event signature - kept for future use
// const TRANSFER_MEMO_EVENT = parseAbiItem(
//   'event TransferWithMemo(address indexed from, address indexed to, uint256 value, bytes32 memo)'
// )

// Type for transfer logs with args
type TransferLog = Log & { args: { from: Address; to: Address; value: bigint } }

/**
 * Parse the suggested block range from an RPC error message.
 * Example: "query exceeds max results 20000, retry with the range 3425345-3425755"
 */
function parseSuggestedRange(errorMessage: string): { from: bigint; to: bigint } | null {
  const match = errorMessage.match(/retry with the range (\d+)-(\d+)/)
  if (match) {
    return {
      from: BigInt(match[1]),
      to: BigInt(match[2]),
    }
  }
  return null
}

/**
 * Helper to fetch logs with automatic chunking to respect RPC limits.
 * Fetches from latest blocks first (reverse order) for most recent results.
 * Uses adaptive chunk sizing based on RPC feedback.
 */
async function getLogsWithChunking(params: {
  client: ReturnType<typeof getPublicClient>
  address: Address
  event: typeof TRANSFER_EVENT
  args?: { from?: Address; to?: Address }
  fromBlock?: bigint
  toBlock?: bigint
  limit: number
}): Promise<TransferLog[]> {
  const { client, address, event, args, fromBlock, toBlock, limit } = params

  // Get current block if toBlock not specified
  const latestBlock = toBlock ?? (await client.getBlockNumber())
  const startBlock = fromBlock ?? 0n

  // Start with smaller chunks - 10k blocks is safer for active tokens
  let chunkSize: bigint = RpcLimits.INITIAL_CHUNK_SIZE
  const allLogs: TransferLog[] = []
  let currentToBlock = latestBlock

  while (currentToBlock > startBlock && allLogs.length < limit) {
    const currentFromBlock = currentToBlock - chunkSize
    const chunkFromBlock = currentFromBlock < startBlock ? startBlock : currentFromBlock

    try {
      const logs = await client.getLogs({
        address,
        event,
        args,
        fromBlock: chunkFromBlock,
        toBlock: currentToBlock,
      })

      // Success! Prepend logs (they're from earlier blocks, we want newest first)
      allLogs.unshift(...(logs as TransferLog[]))

      // Move to next chunk
      currentToBlock = chunkFromBlock - 1n

      // Stop if we've collected enough
      if (allLogs.length >= limit) break
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('max results')) {
        // Parse the suggested range from the error
        const suggested = parseSuggestedRange(error.message)

        if (suggested) {
          // Use the suggested range size (with a small buffer)
          const suggestedSize = suggested.to - suggested.from
          chunkSize = suggestedSize > 0n ? suggestedSize : 500n
        } else {
          // Halve the chunk size and retry
          chunkSize = chunkSize / 2n
          if (chunkSize < RpcLimits.MIN_CHUNK_SIZE) chunkSize = RpcLimits.MIN_CHUNK_SIZE
        }

        // Don't move currentToBlock - retry same endpoint with smaller chunk
        continue
      } else {
        throw error
      }
    }
  }

  return allLogs
}

/**
 * Convert transfer logs to TransferEvent objects with timestamps
 * Uses batched block fetching for better performance
 */
async function logsToTransfers(
  client: ReturnType<typeof getPublicClient>,
  token: Address,
  logs: TransferLog[]
): Promise<TransferEvent[]> {
  if (logs.length === 0) {
    return []
  }

  // Collect unique block numbers that need timestamps
  const uniqueBlockNumbers = [...new Set(
    logs
      .filter(log => log.blockNumber !== null && log.blockNumber !== undefined)
      .map(log => log.blockNumber!)
  )]

  // Fetch all block timestamps in parallel
  const blockTimestamps = new Map<bigint, bigint>()
  const blockFetchPromises = uniqueBlockNumbers.map(async (blockNumber) => {
    try {
      const block = await client.getBlock({ blockNumber })
      blockTimestamps.set(blockNumber, block.timestamp)
    } catch {
      // Ignore timestamp errors, will default to 0n
    }
  })

  await Promise.all(blockFetchPromises)

  // Build transfer events using cached timestamps
  const transfers: TransferEvent[] = []
  for (const log of logs) {
    const { from, to, value } = log.args

    // Validate required fields
    if (!log.transactionHash || log.blockNumber === null || log.blockNumber === undefined) {
      continue // Skip logs with missing required data
    }

    const timestamp = blockTimestamps.get(log.blockNumber) ?? 0n

    transfers.push({
      token,
      from,
      to,
      amount: value,
      memo: null,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp,
    })
  }

  return transfers
}

/**
 * Get transfer history for a token and address
 */
export async function getTransferHistory(params: {
  token: Address
  address?: Address
  fromBlock?: bigint
  toBlock?: bigint
  limit?: number
}): Promise<TransferEvent[]> {
  const client = getPublicClient()
  const { token, address, fromBlock, toBlock, limit = 100 } = params
  const validToken = validateAddress(token)
  const validAddress = address ? validateAddress(address) : undefined

  // If no address filter, fetch all transfers (original behavior)
  if (!validAddress) {
    const logs = await getLogsWithChunking({
      client,
      address: validToken,
      event: TRANSFER_EVENT,
      fromBlock,
      toBlock,
      limit,
    })

    const limitedLogs = logs.slice(-limit)
    return await logsToTransfers(client, validToken, limitedLogs)
  }

  // With address filter: fetch incoming AND outgoing in parallel, then merge
  const [incomingLogs, outgoingLogs] = await Promise.all([
    getLogsWithChunking({
      client,
      address: validToken,
      event: TRANSFER_EVENT,
      args: { to: validAddress },
      fromBlock,
      toBlock,
      limit,
    }),
    getLogsWithChunking({
      client,
      address: validToken,
      event: TRANSFER_EVENT,
      args: { from: validAddress },
      fromBlock,
      toBlock,
      limit,
    }),
  ])

  // Merge and deduplicate by transaction hash + log index
  const seen = new Set<string>()
  const allLogs: TransferLog[] = []

  for (const log of [...incomingLogs, ...outgoingLogs]) {
    const key = `${log.transactionHash}-${log.logIndex}`
    if (!seen.has(key)) {
      seen.add(key)
      allLogs.push(log)
    }
  }

  // Sort by block number descending (newest first), then take limit
  allLogs.sort((a, b) => {
    const blockDiff = Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))
    if (blockDiff !== 0) return blockDiff
    return Number((b.logIndex ?? 0) - (a.logIndex ?? 0))
  })

  const limitedLogs = allLogs.slice(0, limit)
  return await logsToTransfers(client, validToken, limitedLogs)
}

/**
 * Get incoming transfers for an address
 */
export async function getIncomingTransfers(params: {
  token: Address
  address: Address
  fromBlock?: bigint
  toBlock?: bigint
  limit?: number
}): Promise<TransferEvent[]> {
  const client = getPublicClient()
  const { token, address, fromBlock, toBlock, limit = 100 } = params
  const validToken = validateAddress(token)
  const validAddress = validateAddress(address)

  const logs = await getLogsWithChunking({
    client,
    address: validToken,
    event: TRANSFER_EVENT,
    args: { to: validAddress },
    fromBlock,
    toBlock,
    limit,
  })

  // Use the optimized batched timestamp fetching
  return await logsToTransfers(client, validToken, logs)
}

/**
 * Get outgoing transfers for an address
 */
export async function getOutgoingTransfers(params: {
  token: Address
  address: Address
  fromBlock?: bigint
  toBlock?: bigint
  limit?: number
}): Promise<TransferEvent[]> {
  const client = getPublicClient()
  const { token, address, fromBlock, toBlock, limit = 100 } = params
  const validToken = validateAddress(token)
  const validAddress = validateAddress(address)

  const logs = await getLogsWithChunking({
    client,
    address: validToken,
    event: TRANSFER_EVENT,
    args: { from: validAddress },
    fromBlock,
    toBlock,
    limit,
  })

  // Use the optimized batched timestamp fetching
  return await logsToTransfers(client, validToken, logs)
}

/**
 * Get raw logs for a contract
 */
export async function getLogs(input: {
  address: Address
  fromBlock?: bigint
  toBlock?: bigint
}): Promise<Log[]> {
  const client = getPublicClient()
  const { address, fromBlock, toBlock } = input

  const latestBlock = toBlock ?? (await client.getBlockNumber())
  const defaultFromBlock =
    fromBlock ?? (latestBlock > RpcLimits.MAX_BLOCK_RANGE ? latestBlock - RpcLimits.MAX_BLOCK_RANGE : 0n)

  const logParams: Parameters<typeof client.getLogs>[0] = {
    address: validateAddress(address),
    fromBlock: defaultFromBlock,
    toBlock: latestBlock,
  }

  return client.getLogs(logParams)
}

/**
 * Decode a transfer event log
 */
export function decodeTransferLog(log: Log): {
  from: Address
  to: Address
  value: bigint
} | null {
  try {
    const decoded = decodeEventLog({
      abi: Abis.tip20,
      data: log.data,
      topics: log.topics,
    })

    if (decoded.eventName === 'Transfer') {
      const args = decoded.args as { from: Address; to: Address; value: bigint }
      return {
        from: args.from,
        to: args.to,
        value: args.value,
      }
    }
  } catch {
    // Not a transfer event
  }
  return null
}

/**
 * Watch for new transfer events
 */
export function watchTransfers(params: {
  token: Address
  address?: Address
  onTransfer: (event: TransferEvent) => void
}): () => void {
  const client = getPublicClient()
  const { token, address, onTransfer } = params
  const validToken = validateAddress(token)
  const validAddress = address ? validateAddress(address) : undefined

  const unwatch = client.watchContractEvent({
    address: validToken,
    abi: Abis.tip20,
    eventName: 'Transfer',
    onLogs: async (logs) => {
      for (const log of logs) {
        const args = log.args as { from: Address; to: Address; value: bigint }

        // Filter by address if provided
        if (validAddress) {
          if (
            args.from.toLowerCase() !== validAddress.toLowerCase() &&
            args.to.toLowerCase() !== validAddress.toLowerCase()
          ) {
            continue
          }
        }

        // Get block timestamp
        let timestamp = 0n
        if (log.blockNumber) {
          try {
            const block = await client.getBlock({ blockNumber: log.blockNumber })
            timestamp = block.timestamp
          } catch {
            // Ignore
          }
        }

        // Skip logs with missing required data
        if (!log.transactionHash || log.blockNumber === null || log.blockNumber === undefined) {
          continue
        }

        onTransfer({
          token: validToken,
          from: args.from,
          to: args.to,
          amount: args.value,
          memo: null,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp,
        })
      }
    },
  })

  return unwatch
}
