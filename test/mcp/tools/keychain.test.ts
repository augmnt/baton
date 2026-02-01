import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerKeychainTools } from '../../../src/mcp/tools/keychain.js'
import * as keychain from '../../../src/modules/keychain.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/keychain.js')
vi.mock('../../../src/lib/config.js')

describe('Keychain Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerKeychainTools(server)
  })

  describe('tempo_getAccessKey', () => {
    it('should return access key info', async () => {
      vi.mocked(keychain.getAccessKey).mockResolvedValue({
        accessKey: '0xaccesskey',
        owner: '0xowner',
        permissions: { canTransfer: true, canApprove: false, canManageKeys: false, allowedTokens: [] },
        expiry: 1800000000n,
        isActive: true,
      })
      vi.mocked(keychain.isExpired).mockReturnValue(false)
      vi.mocked(keychain.getTimeUntilExpiry).mockReturnValue(100000n)

      const tool = registeredTools.get('tempo_getAccessKey')
      const result = await tool!.handler({ owner: '0xowner', accessKey: '0xaccesskey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.found).toBe(true)
      expect(data.accessKey).toBe('0xaccesskey')
      expect(data.isExpired).toBe(false)
    })

    it('should return not found for non-existent key', async () => {
      vi.mocked(keychain.getAccessKey).mockResolvedValue(null)

      const tool = registeredTools.get('tempo_getAccessKey')
      const result = await tool!.handler({ owner: '0xowner', accessKey: '0xaccesskey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.found).toBe(false)
    })
  })

  describe('tempo_getAccessKeys', () => {
    it('should return all access keys for owner', async () => {
      vi.mocked(keychain.getAccessKeys).mockResolvedValue(['0xkey1', '0xkey2'])

      const tool = registeredTools.get('tempo_getAccessKeys')
      const result = await tool!.handler({ owner: '0xowner' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.accessKeys).toHaveLength(2)
    })
  })

  describe('tempo_getAccessKeysWithInfo', () => {
    it('should return all access keys with full info', async () => {
      vi.mocked(keychain.getAccessKeysWithInfo).mockResolvedValue([
        {
          accessKey: '0xkey1',
          owner: '0xowner',
          permissions: { canTransfer: true, canApprove: true, canManageKeys: false, allowedTokens: [] },
          expiry: 0n,
          isActive: true,
        },
      ])
      vi.mocked(keychain.isExpired).mockReturnValue(false)

      const tool = registeredTools.get('tempo_getAccessKeysWithInfo')
      const result = await tool!.handler({ owner: '0xowner' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].accessKey).toBe('0xkey1')
    })
  })

  describe('tempo_hasPermission', () => {
    it('should check permission', async () => {
      vi.mocked(keychain.hasPermission).mockResolvedValue(true)

      const tool = registeredTools.get('tempo_hasPermission')
      const result = await tool!.handler({
        owner: '0xowner',
        accessKey: '0xaccesskey',
        permission: 'TRANSFER',
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.hasPermission).toBe(true)
    })
  })

  describe('tempo_authorizeAccessKey', () => {
    it('should authorize new access key', async () => {
      vi.mocked(keychain.authorizeAccessKey).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_authorizeAccessKey')
      const result = await tool!.handler({
        accessKey: '0xnewkey',
        canTransfer: true,
        canApprove: false,
        canManageKeys: false,
      })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_revokeAccessKey', () => {
    it('should revoke access key', async () => {
      vi.mocked(keychain.revokeAccessKey).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_revokeAccessKey')
      const result = await tool!.handler({ accessKey: '0xkey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_authorizeFullAccessKey', () => {
    it('should authorize full access key', async () => {
      vi.mocked(keychain.authorizeFullAccessKey).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_authorizeFullAccessKey')
      const result = await tool!.handler({ accessKey: '0xnewkey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  describe('tempo_authorizeTransferOnlyKey', () => {
    it('should authorize transfer-only key', async () => {
      vi.mocked(keychain.authorizeTransferOnlyKey).mockResolvedValue({
        success: true,
        transactionHash: '0xtxhash',
        blockNumber: 12345n,
        explorerUrl: 'https://explorer/tx/0xtxhash',
      })

      const tool = registeredTools.get('tempo_authorizeTransferOnlyKey')
      const result = await tool!.handler({ accessKey: '0xnewkey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
    })
  })

  // "My" wallet tools
  describe('tempo_getMyAccessKeys', () => {
    it('should return access keys for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(keychain.getAccessKeys).mockResolvedValue(['0xkey1', '0xkey2'])

      const tool = registeredTools.get('tempo_getMyAccessKeys')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.owner).toBe('0xmyaddress')
      expect(data.accessKeys).toHaveLength(2)
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyAccessKeys')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyAccessKeysWithInfo', () => {
    it('should return access keys with info for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(keychain.getAccessKeysWithInfo).mockResolvedValue([
        {
          accessKey: '0xkey1',
          owner: '0xmyaddress',
          permissions: { canTransfer: true, canApprove: false, canManageKeys: false, allowedTokens: [] },
          expiry: 0n,
          isActive: true,
        },
      ])
      vi.mocked(keychain.isExpired).mockReturnValue(false)

      const tool = registeredTools.get('tempo_getMyAccessKeysWithInfo')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.owner).toBe('0xmyaddress')
      expect(data.accessKeys).toHaveLength(1)
    })
  })

  describe('tempo_getMyAccessKey', () => {
    it('should return specific access key for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(keychain.getAccessKey).mockResolvedValue({
        accessKey: '0xaccesskey',
        owner: '0xmyaddress',
        permissions: { canTransfer: true, canApprove: true, canManageKeys: true, allowedTokens: [] },
        expiry: 1800000000n,
        isActive: true,
      })
      vi.mocked(keychain.isExpired).mockReturnValue(false)
      vi.mocked(keychain.getTimeUntilExpiry).mockReturnValue(50000n)

      const tool = registeredTools.get('tempo_getMyAccessKey')
      const result = await tool!.handler({ accessKey: '0xaccesskey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.owner).toBe('0xmyaddress')
      expect(data.found).toBe(true)
      expect(data.accessKey).toBe('0xaccesskey')
    })

    it('should return not found for non-existent key', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(keychain.getAccessKey).mockResolvedValue(null)

      const tool = registeredTools.get('tempo_getMyAccessKey')
      const result = await tool!.handler({ accessKey: '0xaccesskey' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.owner).toBe('0xmyaddress')
      expect(data.found).toBe(false)
    })
  })
})
