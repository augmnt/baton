import {
  type Address,
  type Hex,
  formatUnits,
  getAddress,
  isAddress,
  pad,
  parseUnits,
  stringToHex,
} from 'viem'
import { Defaults } from './constants.js'

// ============================================================================
// Amount Utilities
// ============================================================================

/**
 * Parse a human-readable amount to the smallest unit (6 decimals)
 * @param amount - Human readable amount (e.g., "100.5")
 * @param decimals - Number of decimals (defaults to 6)
 * @returns BigInt representation
 */
export function parseAmount(amount: string | number, decimals: number = Defaults.DECIMALS): bigint {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount
  return parseUnits(amountStr, decimals)
}

/**
 * Format a bigint amount to human-readable string (6 decimals)
 * @param amount - BigInt amount in smallest unit
 * @param decimals - Number of decimals (defaults to 6)
 * @returns Human readable string
 */
export function formatAmount(amount: bigint, decimals: number = Defaults.DECIMALS): string {
  return formatUnits(amount, decimals)
}

/**
 * Format an amount with a specific number of display decimals
 * @param amount - BigInt amount in smallest unit
 * @param tokenDecimals - Token's decimal places (defaults to 6)
 * @param displayDecimals - Number of decimals to show (defaults to 2)
 */
export function formatDisplayAmount(
  amount: bigint,
  tokenDecimals: number = Defaults.DECIMALS,
  displayDecimals: number = 2
): string {
  const formatted = formatUnits(amount, tokenDecimals)
  const num = parseFloat(formatted)
  return num.toFixed(displayDecimals)
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Validate and normalize an address
 * @param address - Address to validate
 * @returns Checksummed address
 * @throws Error if address is invalid
 */
export function validateAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`)
  }
  return getAddress(address)
}

/**
 * Check if a string is a valid address
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address)
}

/**
 * Truncate an address for display
 * @param address - Full address
 * @param startChars - Characters to show at start (default 6)
 * @param endChars - Characters to show at end (default 4)
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// ============================================================================
// Memo Utilities
// ============================================================================

/**
 * Encode a string memo to bytes32
 * Right-pads with zeros to fit 32 bytes
 * @param memo - String memo (max 31 characters for UTF-8)
 * @returns bytes32 hex string
 */
export function encodeMemo(memo: string): Hex {
  if (memo.length > 31) {
    throw new Error('Memo too long. Maximum 31 characters for UTF-8 strings.')
  }
  const hex = stringToHex(memo)
  return pad(hex, { size: 32 })
}

/**
 * Check if a value is a valid bytes32 memo
 */
export function isValidMemo(memo: unknown): memo is Hex {
  if (typeof memo !== 'string') return false
  if (!memo.startsWith('0x')) return false
  // bytes32 = 0x + 64 hex characters
  return /^0x[0-9a-fA-F]{64}$/.test(memo)
}

/**
 * Convert a string or hex to a valid bytes32 memo
 * If already a valid bytes32, returns as-is
 * If a string, encodes it to bytes32
 */
export function toMemo(value: string): Hex {
  if (isValidMemo(value)) {
    return value
  }
  return encodeMemo(value)
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate that an amount is positive
 */
export function validatePositiveAmount(amount: bigint, name = 'amount'): void {
  if (amount <= 0n) {
    throw new Error(`${name} must be positive`)
  }
}

/**
 * Validate that required parameters are present
 */
export function validateRequired<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`)
  }
  return value
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a bigint as a string, preserving precision
 */
export function bigintToString(value: bigint): string {
  return value.toString()
}

/**
 * Parse a string to bigint
 */
export function stringToBigint(value: string): bigint {
  return BigInt(value)
}

/**
 * Format a timestamp to ISO string
 */
export function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString()
}

// ============================================================================
// Tick Utilities (for DEX)
// ============================================================================

/**
 * Calculate tick from price
 * tick = log1.0001(price)
 * @param price - Price as a number
 * @returns Tick value
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001))
}

/**
 * Calculate price from tick
 * price = 1.0001^tick
 * @param tick - Tick value
 * @returns Price as a number
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick)
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Extract a readable error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for common viem error patterns
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for this transaction'
    }
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected'
    }
    if (error.message.includes('nonce')) {
      return 'Nonce error - transaction may have been replaced or pending'
    }
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

// ============================================================================
// Slippage Utilities
// ============================================================================

/**
 * Calculate minimum output amount with slippage
 * @param amount - Expected output amount
 * @param slippageBps - Slippage in basis points (100 = 1%)
 * @returns Minimum acceptable amount
 */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10000 - slippageBps)) / 10000n
}

/**
 * Calculate maximum input amount with slippage
 * @param amount - Expected input amount
 * @param slippageBps - Slippage in basis points (100 = 1%)
 * @returns Maximum acceptable input
 */
export function applySlippageMax(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10000 + slippageBps)) / 10000n
}
