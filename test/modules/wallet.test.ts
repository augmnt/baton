import { describe, it, expect } from 'vitest'
import {
  generateWallet,
  deriveAddress,
  validateMnemonic,
  validatePrivateKey,
  checksumAddress,
  addressesEqual,
} from '../../src/modules/wallet.js'

describe('wallet', () => {
  describe('generateWallet', () => {
    it('should generate a valid wallet', () => {
      const wallet = generateWallet()

      expect(wallet.address).toBeDefined()
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(wallet.privateKey).toBeDefined()
      expect(wallet.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/)
      expect(wallet.mnemonic).toBeUndefined()
    })

    it('should generate a wallet with mnemonic', () => {
      const wallet = generateWallet(true)

      expect(wallet.address).toBeDefined()
      expect(wallet.privateKey).toBeDefined()
      expect(wallet.mnemonic).toBeDefined()
      expect(wallet.mnemonic?.split(' ').length).toBe(12)
    })
  })

  describe('deriveAddress', () => {
    it('should derive address from private key', () => {
      const wallet = generateWallet()
      const derived = deriveAddress(wallet.privateKey)

      expect(derived).toBe(wallet.address)
    })
  })

  describe('validatePrivateKey', () => {
    it('should validate valid private keys', () => {
      const wallet = generateWallet()
      expect(validatePrivateKey(wallet.privateKey)).toBe(true)
    })

    it('should reject invalid private keys', () => {
      expect(validatePrivateKey('invalid')).toBe(false)
      expect(validatePrivateKey('0x123')).toBe(false)
    })
  })

  describe('addressesEqual', () => {
    it('should compare addresses case-insensitively', () => {
      const addr = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
      expect(addressesEqual(addr, addr.toLowerCase())).toBe(true)
      expect(addressesEqual(addr, addr.toUpperCase())).toBe(true)
    })
  })

  describe('checksumAddress', () => {
    it('should return checksummed address', () => {
      const addr = '0xabcdef1234567890abcdef1234567890abcdef12'
      const checksummed = checksumAddress(addr)
      expect(checksummed).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })
  })
})
