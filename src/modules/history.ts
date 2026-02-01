import type { Address, Log } from 'viem'
import { decodeEventLog, parseAbiItem } from 'viem'
import { getPublicClient } from '../lib/client.js'
import { Abis } from '../lib/constants.js'
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

  // Build filter - either sent from or received by the address
  const logs = await client.getLogs({
    address: validToken,
    event: TRANSFER_EVENT,
    fromBlock: fromBlock ?? 'earliest',
    toBlock: toBlock ?? 'latest',
  })

  // Filter by address if provided
  let filteredLogs = logs
  if (validAddress) {
    filteredLogs = logs.filter((log) => {
      const args = log.args as { from?: Address; to?: Address }
      return (
        args.from?.toLowerCase() === validAddress.toLowerCase() ||
        args.to?.toLowerCase() === validAddress.toLowerCase()
      )
    })
  }

  // Limit results
  const limitedLogs = filteredLogs.slice(-limit)

  // Get block timestamps
  const transfers: TransferEvent[] = []
  for (const log of limitedLogs) {
    const args = log.args as { from: Address; to: Address; value: bigint }

    // Get block timestamp
    let timestamp = 0n
    if (log.blockNumber) {
      try {
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        timestamp = block.timestamp
      } catch {
        // Ignore timestamp errors
      }
    }

    transfers.push({
      token: validToken,
      from: args.from,
      to: args.to,
      amount: args.value,
      memo: null,
      transactionHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      timestamp,
    })
  }

  return transfers
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

  const logs = await client.getLogs({
    address: validToken,
    event: TRANSFER_EVENT,
    args: {
      to: validAddress,
    },
    fromBlock: fromBlock ?? 'earliest',
    toBlock: toBlock ?? 'latest',
  })

  const limitedLogs = logs.slice(-limit)
  const transfers: TransferEvent[] = []

  for (const log of limitedLogs) {
    const args = log.args as { from: Address; to: Address; value: bigint }

    let timestamp = 0n
    if (log.blockNumber) {
      try {
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        timestamp = block.timestamp
      } catch {
        // Ignore
      }
    }

    transfers.push({
      token: validToken,
      from: args.from,
      to: args.to,
      amount: args.value,
      memo: null,
      transactionHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      timestamp,
    })
  }

  return transfers
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

  const logs = await client.getLogs({
    address: validToken,
    event: TRANSFER_EVENT,
    args: {
      from: validAddress,
    },
    fromBlock: fromBlock ?? 'earliest',
    toBlock: toBlock ?? 'latest',
  })

  const limitedLogs = logs.slice(-limit)
  const transfers: TransferEvent[] = []

  for (const log of limitedLogs) {
    const args = log.args as { from: Address; to: Address; value: bigint }

    let timestamp = 0n
    if (log.blockNumber) {
      try {
        const block = await client.getBlock({ blockNumber: log.blockNumber })
        timestamp = block.timestamp
      } catch {
        // Ignore
      }
    }

    transfers.push({
      token: validToken,
      from: args.from,
      to: args.to,
      amount: args.value,
      memo: null,
      transactionHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      timestamp,
    })
  }

  return transfers
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

  const logParams: Parameters<typeof client.getLogs>[0] = {
    address: validateAddress(address),
    fromBlock: fromBlock ?? 'earliest',
    toBlock: toBlock ?? 'latest',
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

        onTransfer({
          token: validToken,
          from: args.from,
          to: args.to,
          amount: args.value,
          memo: null,
          transactionHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp,
        })
      }
    },
  })

  return unwatch
}
