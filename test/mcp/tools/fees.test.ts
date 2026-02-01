import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerFeesTools } from '../../../src/mcp/tools/fees.js'
import * as fees from '../../../src/modules/fees.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/fees.js')
vi.mock('../../../src/lib/config.js')

describe('Fees Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerFeesTools(server)
  })

  describe('tempo_getFeeToken', () => {
    it('should return fee token for account', async () => {
      vi.mocked(fees.getFeeToken).mockResolvedValue('0xfeetoken')

      const tool = registeredTools.get('tempo_getFeeToken')
      const result = await tool!.handler({ account: '0xaccount' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.feeToken).toBe('0xfeetoken')
    })
  })

  describe('tempo_getSupportedFeeTokens', () => {
    it('should return supported fee tokens', async () => {
      vi.mocked(fees.getSupportedFeeTokens).mockResolvedValue(['0xtoken1', '0xtoken2'])

      const tool = registeredTools.get('tempo_getSupportedFeeTokens')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.tokens).toHaveLength(2)
    })
  })

  describe('tempo_getFeeRate', () => {
    it('should return fee rate for token', async () => {
      vi.mocked(fees.getFeeRate).mockResolvedValue(100n)

      const tool = registeredTools.get('tempo_getFeeRate')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.rate).toBe('100')
    })
  })

  describe('tempo_getFeeTokenInfo', () => {
    it('should return fee token info', async () => {
      vi.mocked(fees.getFeeTokenInfo).mockResolvedValue({
        token: '0xtoken',
        symbol: 'USDC',
        rate: 50n,
      })

      const tool = registeredTools.get('tempo_getFeeTokenInfo')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.symbol).toBe('USDC')
      expect(data.rate).toBe('50')
    })
  })

  describe('tempo_getAllFeeTokensInfo', () => {
    it('should return all fee tokens info', async () => {
      vi.mocked(fees.getAllFeeTokensInfo).mockResolvedValue([
        { token: '0xtoken1', symbol: 'USDC', rate: 50n },
        { token: '0xtoken2', symbol: 'WETH', rate: 100n },
      ])

      const tool = registeredTools.get('tempo_getAllFeeTokensInfo')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
    })
  })

  describe('tempo_setFeeToken', () => {
    it('should set fee token', async () => {
      vi.mocked(fees.setFeeToken).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_setFeeToken')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_isSupportedFeeToken', () => {
    it('should check if token is supported', async () => {
      vi.mocked(fees.isSupportedFeeToken).mockResolvedValue(true)

      const tool = registeredTools.get('tempo_isSupportedFeeToken')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.supported).toBe(true)
    })
  })

  describe('tempo_estimateFee', () => {
    it('should estimate fee', async () => {
      vi.mocked(fees.estimateFee).mockResolvedValue({
        fee: 1000000n,
        token: '0xtoken',
      })

      const tool = registeredTools.get('tempo_estimateFee')
      const result = await tool!.handler({ token: '0xtoken', gasUnits: '21000' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.fee).toBe('1000000')
    })
  })

  // "My" wallet tool
  describe('tempo_getMyFeeToken', () => {
    it('should return fee token for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(fees.getFeeToken).mockResolvedValue('0xmyfeetoken')

      const tool = registeredTools.get('tempo_getMyFeeToken')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.account).toBe('0xmyaddress')
      expect(data.feeToken).toBe('0xmyfeetoken')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyFeeToken')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })
})
