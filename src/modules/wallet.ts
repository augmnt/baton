import { type Address, type Hex, getAddress } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts'
import type { GeneratedWallet } from '../lib/types.js'

/**
 * Generate a new random wallet
 * @param withMnemonic - Whether to generate a mnemonic phrase
 */
export function generateWallet(withMnemonic = false): GeneratedWallet {
  if (withMnemonic) {
    const mnemonic = generateMnemonic(english)
    const account = mnemonicToAccount(mnemonic)
    return {
      address: account.address,
      privateKey: account.getHdKey().privateKey
        ? (`0x${Buffer.from(account.getHdKey().privateKey!).toString('hex')}` as Hex)
        : generatePrivateKey(),
      mnemonic,
    }
  }

  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  return {
    address: account.address,
    privateKey,
  }
}

/**
 * Derive an address from a private key
 */
export function deriveAddress(privateKey: Hex): Address {
  const account = privateKeyToAccount(privateKey)
  return account.address
}

/**
 * Derive a wallet from a mnemonic phrase
 * @param mnemonic - BIP-39 mnemonic phrase
 * @param index - Account index (default 0)
 */
export function deriveFromMnemonic(mnemonic: string, index = 0): GeneratedWallet {
  const account = mnemonicToAccount(mnemonic, {
    accountIndex: index,
  })

  // Get the private key from the HD key
  const hdKey = account.getHdKey()
  const privateKeyBytes = hdKey.privateKey
  if (!privateKeyBytes) {
    throw new Error('Failed to derive private key from mnemonic')
  }

  const privateKey = `0x${Buffer.from(privateKeyBytes).toString('hex')}` as Hex

  return {
    address: account.address,
    privateKey,
    mnemonic,
  }
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    mnemonicToAccount(mnemonic)
    return true
  } catch {
    return false
  }
}

/**
 * Validate a private key
 */
export function validatePrivateKey(privateKey: string): boolean {
  try {
    const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    privateKeyToAccount(normalizedKey as Hex)
    return true
  } catch {
    return false
  }
}

/**
 * Get checksummed address
 */
export function checksumAddress(address: string): Address {
  return getAddress(address)
}

/**
 * Check if two addresses are equal (case-insensitive)
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Generate multiple wallets
 * @param count - Number of wallets to generate
 */
export function generateWallets(count: number): GeneratedWallet[] {
  return Array.from({ length: count }, () => generateWallet())
}

/**
 * Derive multiple addresses from a mnemonic
 * @param mnemonic - BIP-39 mnemonic phrase
 * @param count - Number of addresses to derive
 * @param startIndex - Starting index (default 0)
 */
export function deriveAddresses(
  mnemonic: string,
  count: number,
  startIndex = 0
): GeneratedWallet[] {
  return Array.from({ length: count }, (_, i) =>
    deriveFromMnemonic(mnemonic, startIndex + i)
  )
}
