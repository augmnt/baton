import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as dex from '../../src/modules/dex.js'
import * as client from '../../src/lib/client.js'

// Mock the client module
vi.mock('../../src/lib/client.js')

// Valid checksummed test addresses
const TOKEN_A = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const // USDC mainnet
const TOKEN_B = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const // USDT mainnet
const USER_ADDRESS = '0x742d35Cc6634c0532925a3B844bC9e7595f88941' as const // proper checksum

describe('dex', () => {
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

  describe('getSwapQuote', () => {
    it('should return a valid swap quote', async () => {
      mockPublicClient.readContract.mockResolvedValue(950000n) // amountOut

      const quote = await dex.getSwapQuote({
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amountIn: 1000000n,
      })

      expect(quote.amountIn).toBe(1000000n)
      expect(quote.amountOut).toBe(950000n)
      expect(quote.route).toHaveLength(2)
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'getQuote',
        })
      )
    })

    it('should throw for zero amount', async () => {
      await expect(
        dex.getSwapQuote({
          tokenIn: TOKEN_A,
          tokenOut: TOKEN_B,
          amountIn: 0n,
        })
      ).rejects.toThrow('must be positive')
    })

    it('should throw for zero output (insufficient liquidity)', async () => {
      mockPublicClient.readContract.mockResolvedValue(0n)

      await expect(
        dex.getSwapQuote({
          tokenIn: TOKEN_A,
          tokenOut: TOKEN_B,
          amountIn: 1000000n,
        })
      ).rejects.toThrow('Insufficient liquidity')
    })
  })

  describe('getOrder', () => {
    it('should return order info for existing order', async () => {
      mockPublicClient.readContract.mockResolvedValue([
        USER_ADDRESS, // owner
        TOKEN_A, // token
        1000000n, // amount
        100, // tick
        true, // isBuy
        500000n, // filled
      ])

      const order = await dex.getOrder(1n)

      expect(order).not.toBeNull()
      expect(order!.orderId).toBe(1n)
      expect(order!.amount).toBe(1000000n)
      expect(order!.isBuy).toBe(true)
      expect(order!.filled).toBe(500000n)
    })

    it('should return null for non-existent order', async () => {
      mockPublicClient.readContract.mockResolvedValue([
        '0x0000000000000000000000000000000000000000', // zero address = no owner
        '0x0000000000000000000000000000000000000000',
        0n,
        0,
        false,
        0n,
      ])

      const order = await dex.getOrder(999n)
      expect(order).toBeNull()
    })
  })

  describe('swap', () => {
    it('should execute a swap successfully', async () => {
      // Mock getQuote for auto slippage calculation
      mockPublicClient.readContract.mockResolvedValue(950000n)

      // Mock approval
      mockWalletClient.writeContract
        .mockResolvedValueOnce('0xapproveHash')
        .mockResolvedValueOnce('0xswapHash')

      mockWalletClient.waitForTransactionReceipt
        .mockResolvedValueOnce({ status: 'success' })
        .mockResolvedValueOnce({ status: 'success', blockNumber: 12345n })

      const result = await dex.swap({
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amountIn: 1000000n,
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xswapHash')
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2)
    })

    it('should reject zero amount swap', async () => {
      await expect(
        dex.swap({
          tokenIn: TOKEN_A,
          tokenOut: TOKEN_B,
          amountIn: 0n,
        })
      ).rejects.toThrow('must be positive')
    })
  })

  describe('placeOrder', () => {
    it('should place a buy order successfully', async () => {
      // Reset mocks for this specific test
      mockWalletClient.writeContract.mockReset()
      mockWalletClient.waitForTransactionReceipt.mockReset()

      mockWalletClient.writeContract.mockResolvedValue('0xorderHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
        logs: [],
      })

      const result = await dex.placeOrder({
        token: TOKEN_A,
        amount: 1000000n,
        tick: 100,
        isBuy: true,
      })

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xorderHash')
      // For buy orders, no approval needed
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1)
    })

    it('should place a sell order with approval', async () => {
      mockWalletClient.writeContract
        .mockResolvedValueOnce('0xapproveHash')
        .mockResolvedValueOnce('0xorderHash')

      mockWalletClient.waitForTransactionReceipt
        .mockResolvedValueOnce({ status: 'success' })
        .mockResolvedValueOnce({
          status: 'success',
          blockNumber: 12345n,
          logs: [],
        })

      const result = await dex.placeOrder({
        token: TOKEN_A,
        amount: 1000000n,
        tick: 100,
        isBuy: false, // sell order
      })

      expect(result.success).toBe(true)
      // Sell orders require approval first
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2)
    })

    it('should reject zero amount order', async () => {
      await expect(
        dex.placeOrder({
          token: TOKEN_A,
          amount: 0n,
          tick: 100,
          isBuy: true,
        })
      ).rejects.toThrow('must be positive')
    })
  })

  describe('cancelOrder', () => {
    it('should cancel an order successfully', async () => {
      mockWalletClient.writeContract.mockResolvedValue('0xcancelHash')
      mockWalletClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        blockNumber: 12345n,
      })

      const result = await dex.cancelOrder(1n)

      expect(result.success).toBe(true)
      expect(result.transactionHash).toBe('0xcancelHash')
    })
  })

  describe('getPrice and getTick', () => {
    it('should convert price to tick correctly', () => {
      const tick = dex.getTick(1.01)
      expect(tick).toBeTypeOf('number')
    })

    it('should convert tick to price correctly', () => {
      const price = dex.getPrice(100)
      expect(price).toBeCloseTo(1.01, 2)
    })

    it('should be reversible (price -> tick -> price)', () => {
      const originalPrice = 1.05
      const tick = dex.getTick(originalPrice)
      const recoveredPrice = dex.getPrice(tick)
      expect(recoveredPrice).toBeCloseTo(originalPrice, 3)
    })
  })

  describe('calculateSwapWithSlippage', () => {
    it('should calculate min output with default slippage', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000n)

      const result = await dex.calculateSwapWithSlippage({
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amountIn: 1000000n,
      })

      expect(result.amountOut).toBe(1000000n)
      // Default slippage is 50 bps (0.5%), so minAmountOut should be 995000
      expect(result.minAmountOut).toBe(995000n)
    })

    it('should calculate min output with custom slippage', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000n)

      const result = await dex.calculateSwapWithSlippage({
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amountIn: 1000000n,
        slippageBps: 100, // 1%
      })

      expect(result.amountOut).toBe(1000000n)
      expect(result.minAmountOut).toBe(990000n)
    })
  })
})
