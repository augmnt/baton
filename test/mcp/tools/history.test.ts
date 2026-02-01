import { describe, it, expect, vi, beforeEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerHistoryTools } from '../../../src/mcp/tools/history.js'
import * as history from '../../../src/modules/history.js'
import * as config from '../../../src/lib/config.js'

// Mock modules
vi.mock('../../../src/modules/history.js')
vi.mock('../../../src/lib/config.js')

describe('History Tools', () => {
  let registeredTools: Map<string, { name: string; handler: (args: any) => Promise<any> }>

  beforeEach(() => {
    vi.clearAllMocks()
    registeredTools = new Map()

    const server = {
      tool: vi.fn((name: string, _desc: string, _schema: any, handler: any) => {
        registeredTools.set(name, { name, handler })
      }),
    } as unknown as McpServer

    registerHistoryTools(server)
  })

  const mockTransfer = {
    token: '0xtoken',
    from: '0xfrom',
    to: '0xto',
    amount: 1000000n,
    memo: null,
    transactionHash: '0xtxhash',
    blockNumber: 12345n,
    timestamp: 1700000000n,
  }

  describe('tempo_getTransferHistory', () => {
    it('should return transfer history', async () => {
      vi.mocked(history.getTransferHistory).mockResolvedValue([mockTransfer])

      const tool = registeredTools.get('tempo_getTransferHistory')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].from).toBe('0xfrom')
      expect(data[0].to).toBe('0xto')
    })

    it('should filter by address', async () => {
      vi.mocked(history.getTransferHistory).mockResolvedValue([mockTransfer])

      const tool = registeredTools.get('tempo_getTransferHistory')
      const result = await tool!.handler({ token: '0xtoken', address: '0xfrom' })

      expect(result.isError).toBeUndefined()
      expect(history.getTransferHistory).toHaveBeenCalledWith(
        expect.objectContaining({ address: '0xfrom' })
      )
    })
  })

  describe('tempo_getIncomingTransfers', () => {
    it('should return incoming transfers', async () => {
      vi.mocked(history.getIncomingTransfers).mockResolvedValue([
        { ...mockTransfer, to: '0xrecipient' },
      ])

      const tool = registeredTools.get('tempo_getIncomingTransfers')
      const result = await tool!.handler({ token: '0xtoken', address: '0xrecipient' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].from).toBe('0xfrom')
    })
  })

  describe('tempo_getOutgoingTransfers', () => {
    it('should return outgoing transfers', async () => {
      vi.mocked(history.getOutgoingTransfers).mockResolvedValue([
        { ...mockTransfer, from: '0xsender' },
      ])

      const tool = registeredTools.get('tempo_getOutgoingTransfers')
      const result = await tool!.handler({ token: '0xtoken', address: '0xsender' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].to).toBe('0xto')
    })
  })

  describe('tempo_getLogs', () => {
    it('should return raw logs', async () => {
      vi.mocked(history.getLogs).mockResolvedValue([
        {
          address: '0xcontract',
          topics: ['0xtopic1'],
          data: '0xdata',
          blockNumber: 12345n,
          transactionHash: '0xtxhash',
          logIndex: 0,
          blockHash: '0xblockhash',
          transactionIndex: 0,
          removed: false,
        },
      ])

      const tool = registeredTools.get('tempo_getLogs')
      const result = await tool!.handler({ address: '0xcontract' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveLength(1)
      expect(data[0].address).toBe('0xcontract')
    })
  })

  // "My" wallet tools
  describe('tempo_getMyTransferHistory', () => {
    it('should return transfer history for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(history.getTransferHistory).mockResolvedValue([
        { ...mockTransfer, from: '0xmyaddress' },
        { ...mockTransfer, to: '0xmyaddress' },
      ])

      const tool = registeredTools.get('tempo_getMyTransferHistory')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.transfers).toHaveLength(2)
    })

    it('should return error when TEMPO_PRIVATE_KEY not configured', async () => {
      vi.mocked(config.getConfiguredAddress).mockImplementation(() => {
        throw new Error('TEMPO_PRIVATE_KEY environment variable is not set')
      })

      const tool = registeredTools.get('tempo_getMyTransferHistory')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('TEMPO_PRIVATE_KEY')
    })
  })

  describe('tempo_getMyIncomingTransfers', () => {
    it('should return incoming transfers for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(history.getIncomingTransfers).mockResolvedValue([
        { ...mockTransfer, from: '0xsender', to: '0xmyaddress' },
      ])

      const tool = registeredTools.get('tempo_getMyIncomingTransfers')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.transfers).toHaveLength(1)
      expect(data.transfers[0].from).toBe('0xsender')
    })
  })

  describe('tempo_getMyOutgoingTransfers', () => {
    it('should return outgoing transfers for configured wallet', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(history.getOutgoingTransfers).mockResolvedValue([
        { ...mockTransfer, from: '0xmyaddress', to: '0xrecipient' },
      ])

      const tool = registeredTools.get('tempo_getMyOutgoingTransfers')
      const result = await tool!.handler({ token: '0xtoken' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.transfers).toHaveLength(1)
      expect(data.transfers[0].to).toBe('0xrecipient')
    })

    it('should support pagination options', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(history.getOutgoingTransfers).mockResolvedValue([])

      const tool = registeredTools.get('tempo_getMyOutgoingTransfers')
      await tool!.handler({
        token: '0xtoken',
        fromBlock: '1000',
        toBlock: '2000',
        limit: 50,
      })

      expect(history.getOutgoingTransfers).toHaveBeenCalledWith(
        expect.objectContaining({
          fromBlock: 1000n,
          toBlock: 2000n,
          limit: 50,
        })
      )
    })
  })
})
