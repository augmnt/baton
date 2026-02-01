import Table from 'cli-table3'
import type { TokenBalance, TransactionResult, TransferEvent } from '../lib/types.js'
import { formatAmount, truncateAddress, formatTimestamp } from '../lib/utils.js'
import { colors, formatBrandedHeader, formatBrandedKeyValue, formatBrandedSuccess, formatBrandedError, formatBrandedWarning, formatBrandedInfo } from './branding.js'

export type OutputFormat = 'table' | 'json'

/**
 * Format output based on the specified format
 */
export function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(
      data,
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    )
  }
  // For table format, return empty string (specific formatters handle it)
  return ''
}

/**
 * Format token balances as a table
 */
export function formatBalancesTable(balances: TokenBalance[]): string {
  if (balances.length === 0) {
    return colors.warning('No token balances found')
  }

  const table = new Table({
    head: [
      colors.accent('Token'),
      colors.accent('Symbol'),
      colors.accent('Balance'),
    ],
    style: { head: [], border: [] },
  })

  for (const balance of balances) {
    table.push([
      truncateAddress(balance.token),
      balance.symbol,
      balance.formatted,
    ])
  }

  return table.toString()
}

/**
 * Format transaction result
 */
export function formatTransactionResult(result: TransactionResult, format: OutputFormat): string {
  if (format === 'json') {
    return formatOutput(
      {
        success: result.success,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber.toString(),
        explorerUrl: result.explorerUrl,
      },
      'json'
    )
  }

  const status = result.success
    ? colors.success('✓ Success')
    : colors.error('✗ Failed')

  return `
${status}
${colors.dim('Transaction:')} ${result.transactionHash}
${colors.dim('Block:')} ${result.blockNumber.toString()}
${colors.dim('Explorer:')} ${colors.info(result.explorerUrl)}
`.trim()
}

/**
 * Format transfer history as a table
 */
export function formatTransfersTable(transfers: TransferEvent[]): string {
  if (transfers.length === 0) {
    return colors.warning('No transfers found')
  }

  const table = new Table({
    head: [
      colors.accent('From'),
      colors.accent('To'),
      colors.accent('Amount'),
      colors.accent('Block'),
      colors.accent('Time'),
    ],
    style: { head: [], border: [] },
  })

  for (const transfer of transfers) {
    table.push([
      truncateAddress(transfer.from),
      truncateAddress(transfer.to),
      formatAmount(transfer.amount),
      transfer.blockNumber.toString(),
      transfer.timestamp > 0n ? formatTimestamp(transfer.timestamp).split('T')[0] : '-',
    ])
  }

  return table.toString()
}

/**
 * Format a key-value pair for display
 */
export function formatKeyValue(key: string, value: string | number | boolean): string {
  return formatBrandedKeyValue(key, value)
}

/**
 * Format a section header
 */
export function formatHeader(title: string): string {
  return formatBrandedHeader(title)
}

/**
 * Format an error message
 */
export function formatError(message: string): string {
  return formatBrandedError(message)
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return formatBrandedSuccess(message)
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
  return formatBrandedWarning(message)
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return formatBrandedInfo(message)
}

/**
 * Format address for display
 */
export function formatAddress(address: string, shorten = true): string {
  if (shorten) {
    return truncateAddress(address)
  }
  return address
}

/**
 * Format a wallet display
 */
export function formatWallet(params: {
  address: string
  privateKey: string
  mnemonic?: string
}): string {
  const lines = [
    formatHeader('New Wallet Generated'),
    '',
    formatKeyValue('Address', params.address),
    formatKeyValue('Private Key', params.privateKey),
  ]

  if (params.mnemonic) {
    lines.push(formatKeyValue('Mnemonic', params.mnemonic))
  }

  lines.push('')
  lines.push(formatWarning('Store these credentials securely! Never share your private key.'))

  return lines.join('\n')
}

/**
 * Format token metadata
 */
export function formatTokenMetadata(metadata: {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}): string {
  return [
    formatHeader(`Token: ${metadata.name} (${metadata.symbol})`),
    '',
    formatKeyValue('Address', metadata.address),
    formatKeyValue('Decimals', metadata.decimals),
    formatKeyValue('Total Supply', formatAmount(metadata.totalSupply)),
  ].join('\n')
}

/**
 * Format chain info
 */
export function formatChainInfo(info: {
  chainId: number
  name: string
  blockNumber: bigint
  gasPrice: bigint
}): string {
  return [
    formatHeader('Chain Information'),
    '',
    formatKeyValue('Name', info.name),
    formatKeyValue('Chain ID', info.chainId),
    formatKeyValue('Block Number', info.blockNumber.toString()),
    formatKeyValue('Gas Price', info.gasPrice.toString()),
  ].join('\n')
}

/**
 * Format a table from an object
 */
export function formatObjectTable(obj: Record<string, unknown>): string {
  const table = new Table({
    style: { head: [], border: [] },
  })

  for (const [key, value] of Object.entries(obj)) {
    const formattedValue =
      typeof value === 'bigint'
        ? value.toString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
    table.push([colors.dim(key), formattedValue])
  }

  return table.toString()
}
