import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as contracts from '../../src/modules/contracts.js'
import * as client from '../../src/lib/client.js'

// Mock the client module
vi.mock('../../src/lib/client.js')

// Valid checksummed test addresses
const TOKEN_A = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const
const USER_ADDRESS = '0x742d35Cc6634c0532925a3B844bC9e7595f88941' as const // proper checksum
const RECIPIENT = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const

describe('contracts', () => {
  const mockPublicClient = {
    readContract: vi.fn(),
    multicall: vi.fn(),
    simulateContract: vi.fn(),
    getCode: vi.fn(),
    estimateContractGas: vi.fn(),
    getStorageAt: vi.fn(),
  }

  const mockWalletClient = {
    writeContract: vi.fn(),
    sendTransaction: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
  }

  const mockAbi = [
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.getPublicClient).mockReturnValue(mockPublicClient as any)
    vi.mocked(client.getWalletClient).mockReturnValue(mockWalletClient as any)
  })

  describe('readContract', () => {
    it('should read contract data successfully', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000n)

      const result = await contracts.readContract<bigint>({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'balanceOf',
        args: [USER_ADDRESS],
      })

      expect(result).toBe(1000000n)
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'balanceOf',
        })
      )
    })

    it('should throw on contract revert', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('execution reverted'))

      await expect(
        contracts.readContract({
          address: TOKEN_A,
          abi: mockAbi,
          functionName: 'balanceOf',
          args: [USER_ADDRESS],
        })
      ).rejects.toThrow('execution reverted')
    })
  })

  describe('readContractMulti', () => {
    it('should read multiple contracts using multicall', async () => {
      mockPublicClient.multicall.mockResolvedValue([
        { status: 'success', result: 1000000n },
        { status: 'success', result: 2000000n },
      ])

      const results = await contracts.readContractMulti<bigint>([
        {
          address: TOKEN_A,
          abi: mockAbi,
          functionName: 'balanceOf',
          args: [USER_ADDRESS],
        },
        {
          address: TOKEN_A,
          abi: mockAbi,
          functionName: 'balanceOf',
          args: [RECIPIENT],
        },
      ])

      expect(results).toHaveLength(2)
      expect(results[0]).toBe(1000000n)
      expect(results[1]).toBe(2000000n)
    })

    it('should throw on multicall failure', async () => {
      mockPublicClient.multicall.mockResolvedValue([
        { status: 'success', result: 1000000n },
        { status: 'failure', error: { message: 'call failed' } },
      ])

      await expect(
        contracts.readContractMulti([
          {
            address: TOKEN_A,
            abi: mockAbi,
            functionName: 'balanceOf',
            args: [USER_ADDRESS],
          },
          {
            address: TOKEN_A,
            abi: mockAbi,
            functionName: 'balanceOf',
            args: [RECIPIENT],
          },
        ])
      ).rejects.toThrow('Multicall failed')
    })
  })

  describe('simulateContract', () => {
    it('should simulate contract call successfully', async () => {
      mockPublicClient.simulateContract.mockResolvedValue({ result: true })

      const result = await contracts.simulateContract<boolean>({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'transfer',
        args: [RECIPIENT, 1000000n],
      })

      expect(result).toBe(true)
    })

    it('should throw on simulation failure', async () => {
      mockPublicClient.simulateContract.mockRejectedValue(new Error('insufficient balance'))

      await expect(
        contracts.simulateContract({
          address: TOKEN_A,
          abi: mockAbi,
          functionName: 'transfer',
          args: [RECIPIENT, 1000000n],
        })
      ).rejects.toThrow('insufficient balance')
    })
  })

  describe('writeContract', () => {
    it('should write to contract successfully', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xtxhash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      const result = await contracts.writeContract({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'transfer',
        args: [RECIPIENT, 1000000n],
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xtxhash')
      expect(result.blockNumber).toBe(12345n)
    })

    it('should handle failed transaction', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xtxhash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'reverted',
        blockNumber: 12345n,
      })

      const result = await contracts.writeContract({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'transfer',
        args: [RECIPIENT, 1000000n],
      })

      expect(result.success).toBe(false)
    })

    it('should write with value', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xtxhash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      await contracts.writeContract({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'deposit',
        args: [],
        value: 1000000n,
      })

      expect(mockWalletClient.writeContract).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 1000000n,
        })
      )
    })
  })

  describe('sendTransaction', () => {
    it('should send raw transaction successfully', async () => {
      mockWalletClient.sendTransaction.mockResolvedValue('0xtxhash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      const result = await contracts.sendTransaction({
        to: USER_ADDRESS,
        value: 1000000n,
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xtxhash')
    })

    it('should send transaction with data', async () => {
      mockWalletClient.sendTransaction.mockResolvedValue('0xtxhash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      await contracts.sendTransaction({
        to: USER_ADDRESS,
        data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000001234' as `0x${string}`,
      })

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000001234',
        })
      )
    })
  })

  describe('encodeContractData', () => {
    it('should encode function data', () => {
      const encoded = contracts.encodeContractData({
        abi: mockAbi,
        functionName: 'transfer',
        args: [RECIPIENT, 1000000n],
      })

      expect(encoded).toMatch(/^0x/)
      // transfer(address,uint256) selector is 0xa9059cbb
      expect(encoded.toLowerCase()).toContain('a9059cbb')
    })
  })

  describe('getContractCode', () => {
    it('should return contract code', async () => {
      const mockCode = '0x608060405234801561001057600080fd5b50'
      mockPublicClient.getCode.mockResolvedValue(mockCode)

      const code = await contracts.getContractCode(TOKEN_A)

      expect(code).toBe(mockCode)
    })

    it('should return undefined for EOA', async () => {
      mockPublicClient.getCode.mockResolvedValue(undefined)

      const code = await contracts.getContractCode(USER_ADDRESS)

      expect(code).toBeUndefined()
    })
  })

  describe('isContract', () => {
    it('should return true for contract address', async () => {
      mockPublicClient.getCode.mockResolvedValue('0x608060405234801561001057600080fd5b50')

      const result = await contracts.isContract(TOKEN_A)

      expect(result).toBe(true)
    })

    it('should return false for EOA', async () => {
      mockPublicClient.getCode.mockResolvedValue(undefined)

      const result = await contracts.isContract(USER_ADDRESS)

      expect(result).toBe(false)
    })

    it('should return false for empty code', async () => {
      mockPublicClient.getCode.mockResolvedValue('0x')

      const result = await contracts.isContract(USER_ADDRESS)

      expect(result).toBe(false)
    })
  })

  describe('estimateContractGas', () => {
    it('should estimate gas for contract call', async () => {
      mockPublicClient.estimateContractGas.mockResolvedValue(50000n)

      const gas = await contracts.estimateContractGas({
        address: TOKEN_A,
        abi: mockAbi,
        functionName: 'transfer',
        args: [RECIPIENT, 1000000n],
      })

      expect(gas).toBe(50000n)
    })
  })

  describe('getStorageAt', () => {
    it('should return storage value at slot', async () => {
      const storageValue = '0x000000000000000000000000000000000000000000000000000000000000002a'
      mockPublicClient.getStorageAt.mockResolvedValue(storageValue)

      const value = await contracts.getStorageAt(
        TOKEN_A,
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      )

      expect(value).toBe(storageValue)
    })

    it('should return zero for empty storage', async () => {
      mockPublicClient.getStorageAt.mockResolvedValue(undefined)

      const value = await contracts.getStorageAt(
        TOKEN_A,
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      )

      expect(value).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
    })
  })
})
