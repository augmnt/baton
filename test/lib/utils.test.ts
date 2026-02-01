import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  formatAmount,
  encodeMemo,
  validateAddress,
  isValidAddress,
  truncateAddress,
  priceToTick,
  tickToPrice,
  applySlippage,
} from '../../src/lib/utils.js'

describe('utils', () => {
  describe('parseAmount', () => {
    it('should parse string amounts', () => {
      expect(parseAmount('100')).toBe(100000000n)
      expect(parseAmount('1.5')).toBe(1500000n)
      expect(parseAmount('0.000001')).toBe(1n)
    })

    it('should parse number amounts', () => {
      expect(parseAmount(100)).toBe(100000000n)
      expect(parseAmount(1.5)).toBe(1500000n)
    })
  })

  describe('formatAmount', () => {
    it('should format bigint amounts', () => {
      expect(formatAmount(100000000n)).toBe('100')
      expect(formatAmount(1500000n)).toBe('1.5')
      expect(formatAmount(1n)).toBe('0.000001')
    })
  })

  describe('encodeMemo', () => {
    it('should encode string to bytes32', () => {
      const memo = encodeMemo('test')
      expect(memo).toMatch(/^0x[0-9a-fA-F]{64}$/)
    })

    it('should throw for long memos', () => {
      expect(() => encodeMemo('x'.repeat(32))).toThrow('Memo too long')
    })
  })

  describe('validateAddress', () => {
    it('should validate and checksum addresses', () => {
      const addr = '0xabcdef1234567890abcdef1234567890abcdef12'
      const result = validateAddress(addr)
      expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('should throw for invalid addresses', () => {
      expect(() => validateAddress('invalid')).toThrow('Invalid address')
    })
  })

  describe('isValidAddress', () => {
    it('should return true for valid addresses', () => {
      expect(isValidAddress('0xabcdef1234567890abcdef1234567890abcdef12')).toBe(true)
    })

    it('should return false for invalid addresses', () => {
      expect(isValidAddress('invalid')).toBe(false)
      expect(isValidAddress('0x123')).toBe(false)
    })
  })

  describe('truncateAddress', () => {
    it('should truncate address', () => {
      const addr = '0xabcdef1234567890abcdef1234567890abcdef12'
      expect(truncateAddress(addr)).toBe('0xabcd...ef12')
      expect(truncateAddress(addr, 10, 6)).toBe('0xabcdef12...cdef12')
    })
  })

  describe('priceToTick and tickToPrice', () => {
    it('should convert between price and tick', () => {
      const price = 1.0001
      const tick = priceToTick(price)
      const recovered = tickToPrice(tick)
      expect(Math.abs(recovered - price)).toBeLessThan(0.0001)
    })
  })

  describe('applySlippage', () => {
    it('should apply slippage correctly', () => {
      // 1% slippage on 100 tokens = 99 tokens minimum
      expect(applySlippage(100000000n, 100)).toBe(99000000n)
      // 0.5% slippage
      expect(applySlippage(100000000n, 50)).toBe(99500000n)
    })
  })
})
