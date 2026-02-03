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
    it('should fund an address and return array of transaction hashes', async () => {
      vi.mocked(faucet.fundAddress).mockResolvedValue({
        success: true,
        transactionHashes: [
          '0x54340f261371117e7d5d39d241a48c595c0626871c38179248262b3a425dd71d',
          '0x2d8840c6df9fdfe7cbcdca4a4d5b97cb1a520580e2a5be074eb018e2868808f6',
          '0x5ec61f424fd34aa3faa57eb29204f95de7160bc35f892e358aa23c61e3640fe8',
          '0xc946437b2fe84d0666bf158e0ed3b8d56f285c440b291b89ea1d2a3487319396',
        ] as `0x${string}`[],
        explorerUrls: [
          'https://explorer/tx/0x543...',
          'https://explorer/tx/0x2d8...',
          'https://explorer/tx/0x5ec...',
          'https://explorer/tx/0xc94...',
        ],
      })

      const tool = registeredTools.get('tempo_fundAddress')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.success).toBe(true)
      expect(data.transactions).toHaveLength(4)
      expect(data.transactions[0].token).toBe('pathUSD')
      expect(data.transactions[0].transactionHash).toBe('0x54340f261371117e7d5d39d241a48c595c0626871c38179248262b3a425dd71d')
      expect(data.transactions[1].token).toBe('AlphaUSD')
      expect(data.transactions[2].token).toBe('BetaUSD')
      expect(data.transactions[3].token).toBe('ThetaUSD')
    })

    it('should return error on failure', async () => {
      vi.mocked(faucet.fundAddress).mockRejectedValue(new Error('Faucet unavailable'))

      const tool = registeredTools.get('tempo_fundAddress')
      const result = await tool!.handler({ address: '0xaddress123' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Faucet unavailable')
    })
  })

  describe('tempo_fundMe', () => {
    it('should fund configured wallet and return array of transaction hashes', async () => {
      vi.mocked(config.getConfiguredAddress).mockReturnValue('0xmyaddress' as any)
      vi.mocked(faucet.fundAddress).mockResolvedValue({
        success: true,
        transactionHashes: [
          '0x54340f261371117e7d5d39d241a48c595c0626871c38179248262b3a425dd71d',
          '0x2d8840c6df9fdfe7cbcdca4a4d5b97cb1a520580e2a5be074eb018e2868808f6',
          '0x5ec61f424fd34aa3faa57eb29204f95de7160bc35f892e358aa23c61e3640fe8',
          '0xc946437b2fe84d0666bf158e0ed3b8d56f285c440b291b89ea1d2a3487319396',
        ] as `0x${string}`[],
        explorerUrls: [
          'https://explorer/tx/0x543...',
          'https://explorer/tx/0x2d8...',
          'https://explorer/tx/0x5ec...',
          'https://explorer/tx/0xc94...',
        ],
      })

      const tool = registeredTools.get('tempo_fundMe')
      const result = await tool!.handler({})

      expect(result.isError).toBeUndefined()
      const data = JSON.parse(result.content[0].text)
      expect(data.address).toBe('0xmyaddress')
      expect(data.success).toBe(true)
      expect(data.transactions).toHaveLength(4)
      expect(data.transactions[0].token).toBe('pathUSD')
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
})
