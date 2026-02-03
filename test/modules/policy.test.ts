import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as policy from '../../src/modules/policy.js'
import * as client from '../../src/lib/client.js'

// Mock the client module
vi.mock('../../src/lib/client.js')

// Valid checksummed test addresses
const TOKEN_A = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const
const USER_ADDRESS = '0x742d35Cc6634c0532925a3B844bC9e7595f88941' as const // proper checksum

describe('policy', () => {
  const mockPublicClient = {
    readContract: vi.fn(),
  }

  const mockWalletClient = {
    writeContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    account: { address: USER_ADDRESS },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.getPublicClient).mockReturnValue(mockPublicClient as any)
    vi.mocked(client.getWalletClient).mockReturnValue(mockWalletClient as any)
  })

  describe('encodePolicyRules and decodePolicyRules', () => {
    it('should encode and decode MAX_AMOUNT rules', () => {
      const rules = [{ ruleType: 'MAX_AMOUNT' as const, value: 1000000n }]
      const encoded = policy.encodePolicyRules(rules)
      const decoded = policy.decodePolicyRules(encoded)

      expect(decoded).toHaveLength(1)
      expect(decoded[0].ruleType).toBe('MAX_AMOUNT')
      expect(decoded[0].value).toBe(1000000n)
    })

    it('should encode and decode DAILY_LIMIT rules', () => {
      const rules = [{ ruleType: 'DAILY_LIMIT' as const, value: 5000000n }]
      const encoded = policy.encodePolicyRules(rules)
      const decoded = policy.decodePolicyRules(encoded)

      expect(decoded).toHaveLength(1)
      expect(decoded[0].ruleType).toBe('DAILY_LIMIT')
      expect(decoded[0].value).toBe(5000000n)
    })

    it('should encode and decode TIME_LOCK rules', () => {
      const rules = [{ ruleType: 'TIME_LOCK' as const, value: 86400n }] // 1 day
      const encoded = policy.encodePolicyRules(rules)
      const decoded = policy.decodePolicyRules(encoded)

      expect(decoded).toHaveLength(1)
      expect(decoded[0].ruleType).toBe('TIME_LOCK')
      expect(decoded[0].value).toBe(86400n)
    })

    it('should encode and decode multiple rules', () => {
      const rules = [
        { ruleType: 'MAX_AMOUNT' as const, value: 1000000n },
        { ruleType: 'DAILY_LIMIT' as const, value: 5000000n },
        { ruleType: 'TIME_LOCK' as const, value: 3600n },
      ]
      const encoded = policy.encodePolicyRules(rules)
      const decoded = policy.decodePolicyRules(encoded)

      expect(decoded).toHaveLength(3)
      expect(decoded[0].ruleType).toBe('MAX_AMOUNT')
      expect(decoded[1].ruleType).toBe('DAILY_LIMIT')
      expect(decoded[2].ruleType).toBe('TIME_LOCK')
    })

    it('should return empty array for empty data', () => {
      expect(policy.decodePolicyRules('0x')).toEqual([])
    })
  })

  describe('getPolicy', () => {
    it('should return policy for existing ID', async () => {
      mockPublicClient.readContract.mockResolvedValue([
        'Transfer Limit Policy',
        USER_ADDRESS,
        '0x' + '00'.repeat(32), // encoded rules
      ])

      const result = await policy.getPolicy(1n)

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Transfer Limit Policy')
      expect(result!.owner).toBe(USER_ADDRESS)
    })

    it('should return null for non-existent policy', async () => {
      mockPublicClient.readContract.mockResolvedValue([
        '',
        '0x0000000000000000000000000000000000000000',
        '0x',
      ])

      const result = await policy.getPolicy(999n)
      expect(result).toBeNull()
    })

    it('should return null on revert', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('execution reverted'))

      const result = await policy.getPolicy(999n)
      expect(result).toBeNull()
    })
  })

  describe('getTransferPolicy', () => {
    it('should return policy ID for token with policy', async () => {
      mockPublicClient.readContract.mockResolvedValue(5n)

      const policyId = await policy.getTransferPolicy(TOKEN_A)

      expect(policyId).toBe(5n)
    })

    it('should return 0 for token without policy', async () => {
      mockPublicClient.readContract.mockResolvedValue(0n)

      const policyId = await policy.getTransferPolicy(TOKEN_A)

      expect(policyId).toBe(0n)
    })

    it('should return 0 on revert', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('execution reverted'))

      const policyId = await policy.getTransferPolicy(TOKEN_A)

      expect(policyId).toBe(0n)
    })
  })

  describe('hasTransferPolicy', () => {
    it('should return true when policy exists', async () => {
      mockPublicClient.readContract.mockResolvedValue(5n)

      const has = await policy.hasTransferPolicy(TOKEN_A)

      expect(has).toBe(true)
    })

    it('should return false when no policy', async () => {
      mockPublicClient.readContract.mockResolvedValue(0n)

      const has = await policy.hasTransferPolicy(TOKEN_A)

      expect(has).toBe(false)
    })
  })

  describe('createPolicy', () => {
    it('should create a policy successfully', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xpolicyHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await policy.createPolicy({
        name: 'Test Policy',
        rules: [{ ruleType: 'MAX_AMOUNT', value: 1000000n }],
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xpolicyHash')
    })
  })

  describe('setTransferPolicy', () => {
    it('should set transfer policy successfully', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xsetHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      const result = await policy.setTransferPolicy({
        token: TOKEN_A,
        policyId: 5n,
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xsetHash')
    })
  })

  describe('removeTransferPolicy', () => {
    it('should remove transfer policy by setting to 0', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xremoveHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      const result = await policy.removeTransferPolicy(TOKEN_A)

      expect(result.success).toBe(true)
      // Verify setTransferPolicy was called with policyId = 0
      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([0n]),
        })
      )
    })
  })

  describe('policy builder utilities', () => {
    it('should create maxAmountRule', () => {
      const rule = policy.maxAmountRule(1000000n)
      expect(rule.ruleType).toBe('MAX_AMOUNT')
      expect(rule.value).toBe(1000000n)
    })

    it('should create dailyLimitRule', () => {
      const rule = policy.dailyLimitRule(5000000n)
      expect(rule.ruleType).toBe('DAILY_LIMIT')
      expect(rule.value).toBe(5000000n)
    })

    it('should create timeLockRule', () => {
      const rule = policy.timeLockRule(86400n)
      expect(rule.ruleType).toBe('TIME_LOCK')
      expect(rule.value).toBe(86400n)
    })
  })

  describe('createTransferLimitPolicy', () => {
    it('should create a transfer limit policy with max amount only', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xlimitHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await policy.createTransferLimitPolicy('Max Only', 1000000n)

      expect(result.success).toBe(true)
    })

    it('should create a transfer limit policy with max amount and daily limit', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xlimitHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await policy.createTransferLimitPolicy('With Daily', 1000000n, 5000000n)

      expect(result.success).toBe(true)
    })
  })

  describe('createTimeLockPolicy', () => {
    it('should create a time lock policy', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xtimeLockHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await policy.createTimeLockPolicy('1 Day Lock', 86400n)

      expect(result.success).toBe(true)
    })

    it('should create a time lock policy with max amount', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xtimeLockHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await policy.createTimeLockPolicy('Lock with Max', 86400n, 1000000n)

      expect(result.success).toBe(true)
    })
  })
})
