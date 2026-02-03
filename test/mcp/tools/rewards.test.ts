import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerRewardsTools } from '../../../src/mcp/tools/rewards.js'
import * as rewards from '../../../src/modules/rewards.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/rewards.js')
vi.mock('../../../src/lib/config.js')

describe('Rewards Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerRewardsTools(server)
  })

  describe('tempo_getClaimableRewards', () => {
    it('should return claimable rewards', async () => {
      vi.mocked(rewards.getClaimableRewards).mockResolvedValue(5000000n)

      const tool = registeredTools.get('tempo_getClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken', account: '0xaccount' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.claimable).toBe('5000000')
    })
  })

  describe('tempo_getClaimableRewardsMulti', () => {
    it('should return claimable rewards for multiple tokens', async () => {
      const rewardsMap = new Map([
        ['0xtoken1', { amount: 1000000n, queryStatus: 'success' as const }],
        ['0xtoken2', { amount: 2000000n, queryStatus: 'success' as const }],
      ])
      vi.mocked(rewards.getClaimableRewardsMulti).mockResolvedValue(rewardsMap)

      const tool = registeredTools.get('tempo_getClaimableRewardsMulti')
      const result = await tool!.handler({
        tokens: ['0xtoken1', '0xtoken2'],
        account: '0xaccount',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
    })
  })

  describe('tempo_hasClaimableRewards', () => {
    it('should check if account has claimable rewards', async () => {
      vi.mocked(rewards.hasClaimableRewards).mockResolvedValue(true)

      const tool = registeredTools.get('tempo_hasClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken', account: '0xaccount' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.hasClaimable).toBe(true)
    })
  })

  describe('tempo_setRewardRecipient', () => {
    it('should set reward recipient', async () => {
      vi.mocked(rewards.setRewardRecipient).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_setRewardRecipient')
      const result = await tool!.handler({ token: '0xtoken', recipient: '0xrecipient' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_distributeReward', () => {
    it('should distribute rewards', async () => {
      vi.mocked(rewards.distributeReward).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_distributeReward')
      const result = await tool!.handler({
        token: '0xtoken',
        recipients: ['0xr1', '0xr2'],
        amounts: ['100', '200'],
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_claimRewards', () => {
    it('should claim rewards', async () => {
      vi.mocked(rewards.claimRewards).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
        claimed: 5000000n,
      })

      const tool = registeredTools.get('tempo_claimRewards')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.claimed).toBe('5000000')
    })
  })

  describe('tempo_claimRewardsMulti', () => {
    it('should claim rewards for multiple tokens', async () => {
      vi.mocked(rewards.claimRewardsMulti).mockResolvedValue([
        {
          success: true,
          transactionHash: '0xtxhash1',
          blockNumber: 12345n,
          explorerUrl: 'https://explorer/tx/0xtxhash1',
        },
        {
          success: true,
          transactionHash: '0xtxhash2',
          blockNumber: 12346n,
          explorerUrl: 'https://explorer/tx/0xtxhash2',
        },
      ])

      const tool = registeredTools.get('tempo_claimRewardsMulti')
      const result = await tool!.handler({ tokens: ['0xtoken1', '0xtoken2'] })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
    })
  })

  // "My" wallet tools
  describe('tempo_getMyClaimableRewards', () => {
    it('should return claimable rewards for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(rewards.getClaimableRewards).mockResolvedValue(10000000n)

      const tool = registeredTools.get('tempo_getMyClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.account).toBe('0xmyaddress')
      expect(data.claimable).toBe('10000000')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyClaimableRewardsMulti', () => {
    it('should return claimable rewards for multiple tokens for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      const rewardsMap = new Map([
        ['0xtoken1', { amount: 1000000n, queryStatus: 'success' as const }],
        ['0xtoken2', { amount: 2000000n, queryStatus: 'success' as const }],
      ])
      vi.mocked(rewards.getClaimableRewardsMulti).mockResolvedValue(rewardsMap)

      const tool = registeredTools.get('tempo_getMyClaimableRewardsMulti')
      const result = await tool!.handler({ tokens: ['0xtoken1', '0xtoken2'] })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.account).toBe('0xmyaddress')
      expect(data.rewards).toHaveLength(2)
    })
  })

  describe('tempo_doIHaveClaimableRewards', () => {
    it('should check if configured wallet has claimable rewards', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(rewards.hasClaimableRewards).mockResolvedValue(true)

      const tool = registeredTools.get('tempo_doIHaveClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.account).toBe('0xmyaddress')
      expect(data.hasClaimable).toBe(true)
    })

    it('should return false when no claimable rewards', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(rewards.hasClaimableRewards).mockResolvedValue(false)

      const tool = registeredTools.get('tempo_doIHaveClaimableRewards')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.hasClaimable).toBe(false)
    })
  })
})
