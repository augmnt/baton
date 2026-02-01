import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerFeeAmmTools } from '../../../src/mcp/tools/fee-amm.js'
import * as feeAmm from '../../../src/modules/fee-amm.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/fee-amm.js')
vi.mock('../../../src/lib/config.js')

describe('Fee AMM Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerFeeAmmTools(server)
  })

  describe('tempo_getFeeLiquidity', () => {
    it('should return liquidity position', async () => {
      vi.mocked(feeAmm.getLiquidity).mockResolvedValue(5000000000n)

      const tool = registeredTools.get('tempo_getFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken', provider: '0xprovider' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.liquidity).toBe('5000000000')
    })
  })

  describe('tempo_getTotalFeeLiquidity', () => {
    it('should return total liquidity', async () => {
      vi.mocked(feeAmm.getTotalLiquidity).mockResolvedValue(100000000000n)

      const tool = registeredTools.get('tempo_getTotalFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.totalLiquidity).toBe('100000000000')
    })
  })

  describe('tempo_getLiquidityShare', () => {
    it('should return liquidity share', async () => {
      vi.mocked(feeAmm.getLiquidityShare).mockResolvedValue(5.5)

      const tool = registeredTools.get('tempo_getLiquidityShare')
      const result = await tool!.handler({ token: '0xtoken', provider: '0xprovider' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.sharePercent).toBe(5.5)
    })
  })

  describe('tempo_mintFeeLiquidity', () => {
    it('should mint fee liquidity', async () => {
      vi.mocked(feeAmm.mintFeeLiquidity).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
        liquidity: 1000000n,
      })

      const tool = registeredTools.get('tempo_mintFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken', amount: '100' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.liquidity).toBe('1000000')
    })
  })

  describe('tempo_burnFeeLiquidity', () => {
    it('should burn fee liquidity', async () => {
      vi.mocked(feeAmm.burnFeeLiquidity).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
        amount: 500000n,
      })

      const tool = registeredTools.get('tempo_burnFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken', liquidity: '1000000' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.amount).toBe('500000')
    })
  })

  // "My" wallet tools
  describe('tempo_getMyFeeLiquidity', () => {
    it('should return liquidity for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(feeAmm.getLiquidity).mockResolvedValue(2500000000n)

      const tool = registeredTools.get('tempo_getMyFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.provider).toBe('0xmyaddress')
      expect(data.liquidity).toBe('2500000000')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyFeeLiquidity')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyLiquidityShare', () => {
    it('should return liquidity share for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(feeAmm.getLiquidityShare).mockResolvedValue(2.5)

      const tool = registeredTools.get('tempo_getMyLiquidityShare')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.provider).toBe('0xmyaddress')
      expect(data.sharePercent).toBe(2.5)
    })

    it('should return 0 for no liquidity', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(feeAmm.getLiquidityShare).mockResolvedValue(0)

      const tool = registeredTools.get('tempo_getMyLiquidityShare')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.sharePercent).toBe(0)
    })
  })
})
