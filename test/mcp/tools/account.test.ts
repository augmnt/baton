import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAccountTools } from '../../../src/mcp/tools/account.js'
import * as account from '../../../src/modules/account.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/account.js')
vi.mock('../../../src/lib/config.js')

describe('Account Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    // Create mock server that captures tool registrations
    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerAccountTools(server)
  })

  describe('tempo_getBalance', () => {
    it('should return balance for a token and address', async () => {
      vi.mocked(account.getFormattedBalance).mockResolvedValue({
        token: '0xtoken123',
        symbol: 'USDC',
        balance: 1000000n,
        formatted: '1.0',
      })

      const tool = registeredTools.get('tempo_getBalance')
      const result = await tool!.handler({ token: '0xtoken123', address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.token).toBe('0xtoken123')
      expect(data.symbol).toBe('USDC')
      expect(data.balance).toBe('1000000')
      expect(data.formatted).toBe('1.0')
    })

    it('should return error on failure', async () => {
      vi.mocked(account.getFormattedBalance).mockRejectedValue(new Error('Network error'))

      const tool = registeredTools.get('tempo_getBalance')
      const result = await tool!.handler({ token: '0xtoken123', address: '0xaddress123' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Network error')
    })
  })

  describe('tempo_getBalances', () => {
    it('should return all known token balances', async () => {
      vi.mocked(account.getBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 1000000n, formatted: '1.0' },
        { token: '0xweth', symbol: 'WETH', balance: 2000000000000000000n, formatted: '2.0' },
      ])

      const tool = registeredTools.get('tempo_getBalances')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(2)
      expect(data[0].symbol).toBe('USDC')
      expect(data[1].symbol).toBe('WETH')
    })
  })

  describe('tempo_getTokenBalances', () => {
    it('should return balances for specific tokens', async () => {
      vi.mocked(account.getTokenBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 1000000n, formatted: '1.0' },
      ])

      const tool = registeredTools.get('tempo_getTokenBalances')
      const result = await tool!.handler({
        address: '0xaddress123',
        tokens: ['0xusdc'],
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].symbol).toBe('USDC')
    })
  })

  describe('tempo_getNonce', () => {
    it('should return nonce for an address', async () => {
      vi.mocked(account.getNonce).mockResolvedValue(42n)

      const tool = registeredTools.get('tempo_getNonce')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.nonce).toBe('42')
    })
  })

  describe('tempo_getUserFeeToken', () => {
    it('should return fee token for an address', async () => {
      vi.mocked(account.getUserFeeToken).mockResolvedValue('0xfeetoken')

      const tool = registeredTools.get('tempo_getUserFeeToken')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.feeToken).toBe('0xfeetoken')
    })
  })

  describe('tempo_getAccountInfo', () => {
    it('should return complete account info', async () => {
      vi.mocked(account.getAccountInfo).mockResolvedValue({
        address: '0xaddress123',
        nonce: 5n,
        feeToken: '0xfeetoken',
      })

      const tool = registeredTools.get('tempo_getAccountInfo')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xaddress123')
      expect(data.nonce).toBe('5')
      expect(data.feeToken).toBe('0xfeetoken')
    })
  })

  describe('tempo_getNonZeroBalances', () => {
    it('should return non-zero balances', async () => {
      vi.mocked(account.getNonZeroBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 1000000n, formatted: '1.0' },
      ])

      const tool = registeredTools.get('tempo_getNonZeroBalances')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].balance).toBe('1000000')
    })
  })

  // "My" wallet tools
  describe('tempo_getMyAddress', () => {
    it('should return configured wallet address', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)

      const tool = registeredTools.get('tempo_getMyAddress')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyAddress')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyBalances', () => {
    it('should return balances for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(account.getBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 5000000n, formatted: '5.0' },
      ])

      const tool = registeredTools.get('tempo_getMyBalances')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.balances).toHaveLength(1)
      expect(data.balances[0].formatted).toBe('5.0')
    })
  })

  describe('tempo_getMyAccountInfo', () => {
    it('should return account info for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(account.getAccountInfo).mockResolvedValue({
        address: '0xmyaddress',
        nonce: 10n,
        feeToken: '0xfeetoken',
      })
      vi.mocked(account.getNonZeroBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 1000000n, formatted: '1.0' },
      ])

      const tool = registeredTools.get('tempo_getMyAccountInfo')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.nonce).toBe('10')
      expect(data.balances).toHaveLength(1)
    })
  })

  describe('tempo_getMyBalance', () => {
    it('should return specific token balance for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(account.getFormattedBalance).mockResolvedValue({
        token: '0xusdc',
        symbol: 'USDC',
        balance: 1000000n,
        formatted: '1.0',
      })

      const tool = registeredTools.get('tempo_getMyBalance')
      const result = await tool!.handler({ token: '0xusdc' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.symbol).toBe('USDC')
      expect(data.formatted).toBe('1.0')
    })
  })

  describe('tempo_getMyNonce', () => {
    it('should return nonce for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(account.getNonce).mockResolvedValue(15n)

      const tool = registeredTools.get('tempo_getMyNonce')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.nonce).toBe('15')
    })
  })

  describe('tempo_getMyNonZeroBalances', () => {
    it('should return non-zero balances for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(account.getNonZeroBalances).mockResolvedValue([
        { token: '0xusdc', symbol: 'USDC', balance: 2000000n, formatted: '2.0' },
        { token: '0xweth', symbol: 'WETH', balance: 1000000000000000000n, formatted: '1.0' },
      ])

      const tool = registeredTools.get('tempo_getMyNonZeroBalances')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.balances).toHaveLength(2)
    })
  })
})
