import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as faucet from '../../modules/faucet.js'
import { getErrorMessage } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'
import { FaucetTokens } from '../../lib/constants.js'

export function registerFaucetTools(server: McpServer) {
  // Fund address via faucet
  server.tool(
    'tempo_fundAddress',
    'Fund an address via the testnet faucet. Returns transaction hashes for each token funded (pathUSD, AlphaUSD, BetaUSD, ThetaUSD - 1M each).',
    {
      address: z.string().describe('Address to fund'),
    },
    async ({ address }) => {
      try {
        const result = await faucet.fundAddress(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result.success,
                transactions: result.transactionHashes.map((hash, i) => ({
                  token: FaucetTokens[i]?.name || `Token ${i + 1}`,
                  address: FaucetTokens[i]?.address || null,
                  transactionHash: hash,
                  explorerUrl: result.explorerUrls[i],
                })),
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Fund configured wallet via faucet
  server.tool(
    'tempo_fundMe',
    'Fund the configured wallet (TEMPO_PRIVATE_KEY) via the testnet faucet. Returns transaction hashes for each token funded (pathUSD, AlphaUSD, BetaUSD, ThetaUSD - 1M each). Use this when the user asks "fund my wallet" or similar.',
    {},
    async () => {
      try {
        const address = getConfiguredAddress()
        const result = await faucet.fundAddress(address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                success: result.success,
                transactions: result.transactionHashes.map((hash, i) => ({
                  token: FaucetTokens[i]?.name || `Token ${i + 1}`,
                  address: FaucetTokens[i]?.address || null,
                  transactionHash: hash,
                  explorerUrl: result.explorerUrls[i],
                })),
              }),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${getErrorMessage(error)}` }],
          isError: true,
        }
      }
    }
  )
}
