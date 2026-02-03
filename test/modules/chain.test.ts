import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as chain from '../../src/modules/chain.js'
import * as client from '../../src/lib/client.js'

// Mock the client module
vi.mock('../../src/lib/client.js')

describe('chain', () => {
  const mockPublicClient = {
    getBlockNumber: vi.fn(),
    getBlock: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionReceipt: vi.fn(),
    getChainId: vi.fn(),
    getGasPrice: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
    estimateGas: vi.fn(),
    chain: { name: 'Tempo Moderato' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.getPublicClient).mockReturnValue(mockPublicClient as any)
  })

  describe('getBlockNumber', () => {
    it('should return the current block number', async () => {
      mockPublicClient.getBlockNumber.mockResolvedValue(12345678n)

      const blockNumber = await chain.getBlockNumber()

      expect(blockNumber).toBe(12345678n)
      expect(mockPublicClient.getBlockNumber).toHaveBeenCalledTimes(1)
    })
  })

  describe('getBlock', () => {
    const mockBlock = {
      number: 12345678n,
      hash: '0xblockhash0000000000000000000000000000000000000000000000000000001',
      timestamp: 1704067200n,
      transactions: ['0xtx1', '0xtx2', '0xtx3'],
    }

    it('should get block by number', async () => {
      mockPublicClient.getBlock.mockResolvedValue(mockBlock)

      const block = await chain.getBlock(12345678n)

      expect(block.number).toBe(12345678n)
      expect(block.transactionCount).toBe(3)
      expect(mockPublicClient.getBlock).toHaveBeenCalledWith({ blockNumber: 12345678n })
    })

    it('should get block by hash', async () => {
      mockPublicClient.getBlock.mockResolvedValue(mockBlock)
      const hash = '0xblockhash0000000000000000000000000000000000000000000000000000001' as `0x${string}`

      const block = await chain.getBlock(hash)

      expect(block.number).toBe(12345678n)
      expect(mockPublicClient.getBlock).toHaveBeenCalledWith({ blockHash: hash })
    })

    it('should get latest block by default', async () => {
      mockPublicClient.getBlock.mockResolvedValue(mockBlock)

      const block = await chain.getBlock()

      expect(block.number).toBe(12345678n)
      expect(mockPublicClient.getBlock).toHaveBeenCalledWith({ blockTag: 'latest' })
    })

    it('should get block by tag', async () => {
      mockPublicClient.getBlock.mockResolvedValue(mockBlock)

      await chain.getBlock('pending')
      expect(mockPublicClient.getBlock).toHaveBeenCalledWith({ blockTag: 'pending' })

      await chain.getBlock('earliest')
      expect(mockPublicClient.getBlock).toHaveBeenCalledWith({ blockTag: 'earliest' })
    })
  })

  describe('getTransaction', () => {
    it('should return transaction info for successful transaction', async () => {
      const mockTx = {
        hash: '0xtxhash0000000000000000000000000000000000000000000000000000000001',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: 1000000n,
        input: '0x',
        blockNumber: 12345678n,
      }

      const mockReceipt = {
        status: 'success',
      }

      const mockBlock = {
        timestamp: 1704067200n,
      }

      mockPublicClient.getTransaction.mockResolvedValue(mockTx)
      mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockPublicClient.getBlock.mockResolvedValue(mockBlock)

      const txInfo = await chain.getTransaction(mockTx.hash as `0x${string}`)

      expect(txInfo.hash).toBe(mockTx.hash)
      expect(txInfo.from).toBe(mockTx.from)
      expect(txInfo.to).toBe(mockTx.to)
      expect(txInfo.value).toBe(1000000n)
      expect(txInfo.status).toBe('success')
      expect(txInfo.timestamp).toBe(1704067200n)
    })

    it('should return pending status for unconfirmed transaction', async () => {
      const mockTx = {
        hash: '0xtxhash0000000000000000000000000000000000000000000000000000000001',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: 1000000n,
        input: '0x',
        blockNumber: null, // pending
      }

      mockPublicClient.getTransaction.mockResolvedValue(mockTx)
      mockPublicClient.getTransactionReceipt.mockRejectedValue(new Error('not found'))

      const txInfo = await chain.getTransaction(mockTx.hash as `0x${string}`)

      expect(txInfo.status).toBe('pending')
      expect(txInfo.blockNumber).toBe(0n)
    })

    it('should return failed status for reverted transaction', async () => {
      const mockTx = {
        hash: '0xtxhash0000000000000000000000000000000000000000000000000000000001',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: 1000000n,
        input: '0x',
        blockNumber: 12345678n,
      }

      mockPublicClient.getTransaction.mockResolvedValue(mockTx)
      mockPublicClient.getTransactionReceipt.mockResolvedValue({ status: 'reverted' })
      mockPublicClient.getBlock.mockResolvedValue({ timestamp: 1704067200n })

      const txInfo = await chain.getTransaction(mockTx.hash as `0x${string}`)

      expect(txInfo.status).toBe('failed')
    })
  })

  describe('getChainInfo', () => {
    it('should return chain information', async () => {
      mockPublicClient.getBlockNumber.mockResolvedValue(12345678n)
      mockPublicClient.getChainId.mockResolvedValue(42429)
      mockPublicClient.getGasPrice.mockResolvedValue(1000000000n)

      const info = await chain.getChainInfo()

      expect(info.chainId).toBe(42429)
      expect(info.name).toBe('Tempo Moderato')
      expect(info.blockNumber).toBe(12345678n)
      expect(info.gasPrice).toBe(1000000000n)
    })
  })

  describe('getGasPrice', () => {
    it('should return the current gas price', async () => {
      mockPublicClient.getGasPrice.mockResolvedValue(1000000000n)

      const gasPrice = await chain.getGasPrice()

      expect(gasPrice).toBe(1000000000n)
      expect(mockPublicClient.getGasPrice).toHaveBeenCalledTimes(1)
    })
  })

  describe('waitForTransaction', () => {
    it('should wait for transaction confirmation', async () => {
      const mockReceipt = {
        status: 'success',
        blockNumber: 12345678n,
      }
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt)

      const hash = '0xtxhash0000000000000000000000000000000000000000000000000000000001' as `0x${string}`
      const receipt = await chain.waitForTransaction(hash)

      expect(receipt.status).toBe('success')
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash,
        confirmations: 1,
      })
    })

    it('should wait for multiple confirmations', async () => {
      const mockReceipt = {
        status: 'success',
        blockNumber: 12345678n,
      }
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt)

      const hash = '0xtxhash0000000000000000000000000000000000000000000000000000000001' as `0x${string}`
      await chain.waitForTransaction(hash, 3)

      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash,
        confirmations: 3,
      })
    })
  })

  describe('estimateGas', () => {
    it('should estimate gas for a transaction', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(21000n)

      const gas = await chain.estimateGas({
        to: '0x1234567890123456789012345678901234567890',
        value: 1000000n,
      })

      expect(gas).toBe(21000n)
      expect(mockPublicClient.estimateGas).toHaveBeenCalledWith({
        to: '0x1234567890123456789012345678901234567890',
        value: 1000000n,
      })
    })

    it('should estimate gas with data', async () => {
      mockPublicClient.estimateGas.mockResolvedValue(50000n)

      const gas = await chain.estimateGas({
        to: '0x1234567890123456789012345678901234567890',
        data: '0xa9059cbb000000000000000000000000',
      })

      expect(gas).toBe(50000n)
    })
  })
})
