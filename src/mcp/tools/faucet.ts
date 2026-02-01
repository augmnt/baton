import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as faucet from '../../modules/faucet.js'
import { getErrorMessage, formatAmount } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'

export function registerFaucetTools(server: McpServer) {
  // Fund address via faucet
  server.tool(
    'tempo_fundAddress',
    'Fund an address via the testnet faucet (testnet only)',
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
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber.toString(),
                explorerUrl: result.explorerUrl,
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

  // Check faucet availability
  server.tool(
    'tempo_isFaucetAvailable',
    'Check if the testnet faucet is available',
    {},
    async () => {
      try {
        const available = await faucet.isFaucetAvailable()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ available }),
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

  // Get faucet info
  server.tool(
    'tempo_getFaucetInfo',
    'Get information about the testnet faucet',
    {},
    async () => {
      try {
        const info = await faucet.getFaucetInfo()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                available: info.available,
                amountPerRequest: info.amountPerRequest.toString(),
                amountPerRequestFormatted: formatAmount(info.amountPerRequest),
                cooldownSeconds: info.cooldownSeconds,
                dailyLimit: info.dailyLimit.toString(),
                dailyLimitFormatted: formatAmount(info.dailyLimit),
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

  // Get faucet cooldown for address
  server.tool(
    'tempo_getFaucetCooldown',
    'Check faucet cooldown status for an address',
    {
      address: z.string().describe('Address to check'),
    },
    async ({ address }) => {
      try {
        const status = await faucet.getFaucetCooldown(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                canRequest: status.canRequest,
                cooldownRemaining: status.cooldownRemaining,
                lastRequestTime: status.lastRequestTime.toString(),
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

  // Fund if eligible
  server.tool(
    'tempo_fundAddressIfEligible',
    'Fund an address if eligible (checks cooldown first)',
    {
      address: z.string().describe('Address to fund'),
    },
    async ({ address }) => {
      try {
        const result = await faucet.fundAddressIfEligible(address as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                funded: result.funded,
                reason: result.reason || null,
                transactionHash: result.result?.transactionHash || null,
                blockNumber: result.result?.blockNumber.toString() || null,
                explorerUrl: result.result?.explorerUrl || null,
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
    'Fund the configured wallet (TEMPO_PRIVATE_KEY) via the testnet faucet. Use this when the user asks "fund my wallet" or similar.',
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
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber.toString(),
                explorerUrl: result.explorerUrl,
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

  // Get faucet cooldown for configured wallet
  server.tool(
    'tempo_getMyFaucetCooldown',
    'Check faucet cooldown status for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "can I use the faucet?" or similar.',
    {},
    async () => {
      try {
        const address = getConfiguredAddress()
        const status = await faucet.getFaucetCooldown(address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                canRequest: status.canRequest,
                cooldownRemaining: status.cooldownRemaining,
                lastRequestTime: status.lastRequestTime.toString(),
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

  // Fund configured wallet if eligible
  server.tool(
    'tempo_fundMeIfEligible',
    'Fund the configured wallet (TEMPO_PRIVATE_KEY) if eligible (checks cooldown first). Use this when the user asks "fund me if I can" or similar.',
    {},
    async () => {
      try {
        const address = getConfiguredAddress()
        const result = await faucet.fundAddressIfEligible(address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address,
                funded: result.funded,
                reason: result.reason || null,
                transactionHash: result.result?.transactionHash || null,
                blockNumber: result.result?.blockNumber.toString() || null,
                explorerUrl: result.result?.explorerUrl || null,
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
