import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerFaucetTools } from '../../../src/mcp/tools/faucet.js'
import * as faucet from '../../../src/modules/faucet.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/faucet.js')
vi.mock('../../../src/lib/config.js')

describe('Faucet Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerFaucetTools(server)
  })

  describe('tempo_fundAddress', () => {
    it('should fund an address', async () => {
      vi.mocked(faucet.fundAddress).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_fundAddress')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.transactionHash).toBe('0xtxhash')
    })

    it('should return error on failure', async () => {
      vi.mocked(faucet.fundAddress).mockRejectedValue(new Error('Faucet unavailable'))

      const tool = registeredTools.get('tempo_fundAddress')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Faucet unavailable')
    })
  })

  describe('tempo_isFaucetAvailable', () => {
    it('should check faucet availability', async () => {
      vi.mocked(faucet.isFaucetAvailable).mockResolvedValue(true)

      const tool = registeredTools.get('tempo_isFaucetAvailable')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.available).toBe(true)
    })
  })

  describe('tempo_getFaucetInfo', () => {
    it('should return faucet info', async () => {
      vi.mocked(faucet.getFaucetInfo).mockResolvedValue({
        available: true,
        amountPerRequest: 1000000000n,
        cooldownSeconds: 86400,
        dailyLimit: 10000000000n,
      })

      const tool = registeredTools.get('tempo_getFaucetInfo')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.available).toBe(true)
      expect(data.cooldownSeconds).toBe(86400)
    })
  })

  describe('tempo_getFaucetCooldown', () => {
    it('should return cooldown status', async () => {
      vi.mocked(faucet.getFaucetCooldown).mockResolvedValue({
        canRequest: true,
        cooldownRemaining: 0,
        lastRequestTime: 1700000000n,
      })

      const tool = registeredTools.get('tempo_getFaucetCooldown')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.canRequest).toBe(true)
      expect(data.cooldownRemaining).toBe(0)
    })
  })

  describe('tempo_fundAddressIfEligible', () => {
    it('should fund address if eligible', async () => {
      vi.mocked(faucet.fundAddressIfEligible).mockResolvedValue({
        funded: true,
        result: {
          success: true,
          transactionHash: '0xtxhash',
          blockNumber: 12345n,
          explorerUrl: 'https://explorer/tx/0xtxhash',
        },
      })

      const tool = registeredTools.get('tempo_fundAddressIfEligible')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.funded).toBe(true)
      expect(data.transactionHash).toBe('0xtxhash')
    })

    it('should return reason if not eligible', async () => {
      vi.mocked(faucet.fundAddressIfEligible).mockResolvedValue({
        funded: false,
        reason: 'Cooldown active',
      })

      const tool = registeredTools.get('tempo_fundAddressIfEligible')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.funded).toBe(false)
      expect(data.reason).toBe('Cooldown active')
    })
  })

  // "My" wallet tools
  describe('tempo_fundMe', () => {
    it('should fund configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(faucet.fundAddress).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_fundMe')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.success).toBe(true)
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_fundMe')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyFaucetCooldown', () => {
    it('should return cooldown status for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(faucet.getFaucetCooldown).mockResolvedValue({
        canRequest: false,
        cooldownRemaining: 3600,
        lastRequestTime: 1700000000n,
      })

      const tool = registeredTools.get('tempo_getMyFaucetCooldown')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.canRequest).toBe(false)
      expect(data.cooldownRemaining).toBe(3600)
    })
  })

  describe('tempo_fundMeIfEligible', () => {
    it('should fund configured wallet if eligible', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(faucet.fundAddressIfEligible).mockResolvedValue({
        funded: true,
        result: {
          success: true,
          transactionHash: '0xtxhash',
          blockNumber: 12345n,
          explorerUrl: 'https://explorer/tx/0xtxhash',
        },
      })

      const tool = registeredTools.get('tempo_fundMeIfEligible')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.funded).toBe(true)
      expect(data.transactionHash).toBe('0xtxhash')
    })

    it('should return reason if not eligible', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(faucet.fundAddressIfEligible).mockResolvedValue({
        funded: false,
        reason: 'Cooldown active',
      })

      const tool = registeredTools.get('tempo_fundMeIfEligible')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.funded).toBe(false)
      expect(data.reason).toBe('Cooldown active')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_fundMeIfEligible')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })
})
