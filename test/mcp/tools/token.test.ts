import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTokenTools } from '../../../src/mcp/tools/token.js'
import * as token from '../../../src/modules/token.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/token.js')
vi.mock('../../../src/lib/config.js')

describe('Token Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerTokenTools(server)
  })

  describe('tempo_getTokenMetadata', () => {
    it('should return token metadata', async () => {
      vi.mocked(token.getTokenMetadata).mockResolvedValue({
        address: '0xtoken123',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        totalSupply: 1000000000000n,
      })

      const tool = registeredTools.get('tempo_getTokenMetadata')
      const result = await tool!.handler({ token: '0xtoken123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.name).toBe('USD Coin')
      expect(data.symbol).toBe('USDC')
      expect(data.decimals).toBe(6)
    })
  })

  describe('tempo_getAllowance', () => {
    it('should return allowance', async () => {
      vi.mocked(token.getAllowance).mockResolvedValue(5000000n)

      const tool = registeredTools.get('tempo_getAllowance')
      const result = await tool!.handler({
        token: '0xtoken',
        owner: '0xowner',
        spender: '0xspender',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.allowance).toBe('5000000')
    })
  })

  describe('tempo_getTokenRoles', () => {
    it('should return token roles', async () => {
      vi.mocked(token.getRoles).mockResolvedValue({
        isAdmin: true,
        isMinter: false,
        isBurner: false,
        isPauser: false,
      })

      const tool = registeredTools.get('tempo_getTokenRoles')
      const result = await tool!.handler({ token: '0xtoken', account: '0xaccount' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.isAdmin).toBe(true)
      expect(data.isMinter).toBe(false)
    })
  })

  describe('tempo_transfer', () => {
    it('should transfer tokens', async () => {
      vi.mocked(token.transfer).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_transfer')
      const result = await tool!.handler({
        token: '0xtoken',
        to: '0xrecipient',
        amount: '100',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.transactionHash).toBe('0xtxhash')
    })
  })

  describe('tempo_batchTransfer', () => {
    it('should batch transfer tokens', async () => {
      vi.mocked(token.batchTransfer).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_batchTransfer')
      const result = await tool!.handler({
        token: '0xtoken',
        transfers: [
          { to: '0xrecipient1', amount: '50' },
          { to: '0xrecipient2', amount: '50' },
        ],
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_approve', () => {
    it('should approve spender', async () => {
      vi.mocked(token.approve).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_approve')
      const result = await tool!.handler({
        token: '0xtoken',
        spender: '0xspender',
        amount: '1000',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_mint', () => {
    it('should mint tokens', async () => {
      vi.mocked(token.mint).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_mint')
      const result = await tool!.handler({
        token: '0xtoken',
        to: '0xrecipient',
        amount: '1000',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_burn', () => {
    it('should burn tokens', async () => {
      vi.mocked(token.burn).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_burn')
      const result = await tool!.handler({
        token: '0xtoken',
        amount: '100',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_grantRole', () => {
    it('should grant role', async () => {
      vi.mocked(token.grantRole).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_grantRole')
      const result = await tool!.handler({
        token: '0xtoken',
        role: 'MINTER_ROLE',
        account: '0xaccount',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_revokeRole', () => {
    it('should revoke role', async () => {
      vi.mocked(token.revokeRole).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_revokeRole')
      const result = await tool!.handler({
        token: '0xtoken',
        role: 'MINTER_ROLE',
        account: '0xaccount',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_canTransfer', () => {
    it('should check transfer feasibility', async () => {
      vi.mocked(token.canTransfer).mockResolvedValue({
        canTransfer: true,
        balance: 1000000n,
        shortfall: 0n,
      })

      const tool = registeredTools.get('tempo_canTransfer')
      const result = await tool!.handler({
        token: '0xtoken',
        from: '0xfrom',
        amount: '1.0',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.canTransfer).toBe(true)
      expect(data.shortfall).toBe('0')
    })
  })

  // "My" wallet tools
  describe('tempo_getMyAllowance', () => {
    it('should return allowance for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(token.getAllowance).mockResolvedValue(10000000n)

      const tool = registeredTools.get('tempo_getMyAllowance')
      const result = await tool!.handler({ token: '0xtoken', spender: '0xspender' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.owner).toBe('0xmyaddress')
      expect(data.allowance).toBe('10000000')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyAllowance')
      const result = await tool!.handler({ token: '0xtoken', spender: '0xspender' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyTokenRoles', () => {
    it('should return token roles for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(token.getRoles).mockResolvedValue({
        isAdmin: false,
        isMinter: true,
        isBurner: false,
        isPauser: false,
      })

      const tool = registeredTools.get('tempo_getMyTokenRoles')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.account).toBe('0xmyaddress')
      expect(data.roles.isMinter).toBe(true)
    })
  })

  describe('tempo_canITransfer', () => {
    it('should check if configured wallet can transfer', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(token.canTransfer).mockResolvedValue({
        canTransfer: false,
        balance: 500000n,
        shortfall: 500000n,
      })

      const tool = registeredTools.get('tempo_canITransfer')
      const result = await tool!.handler({ token: '0xtoken', amount: '1.0' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.from).toBe('0xmyaddress')
      expect(data.canTransfer).toBe(false)
      expect(data.shortfall).toBe('500000')
    })
  })
})
