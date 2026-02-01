import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as rewards from '../../modules/rewards.js'
import { getErrorMessage, parseAmount, formatAmount } from '../../lib/utils.js'

export function registerRewardsTools(server: McpServer) {
  // Get claimable rewards
  server.tool(
    'tempo_getClaimableRewards',
    'Get claimable rewards for an account',
    {
      token: z.string().describe('Reward token address'),
      account: z.string().describe('Account address'),
    },
    async ({ token, account }) => {
      try {
        const claimable = await rewards.getClaimableRewards(
          token as Address,
          account as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                account,
                claimable: claimable.toString(),
                claimableFormatted: formatAmount(claimable),
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

  // Get claimable rewards for multiple tokens
  server.tool(
    'tempo_getClaimableRewardsMulti',
    'Get claimable rewards for multiple tokens',
    {
      tokens: z.array(z.string()).describe('Array of reward token addresses'),
      account: z.string().describe('Account address'),
    },
    async ({ tokens, account }) => {
      try {
        const claimables = await rewards.getClaimableRewardsMulti(
          tokens as Address[],
          account as Address
        )

        const result: Array<{ token: string; claimable: string; claimableFormatted: string }> = []
        claimables.forEach((amount, token) => {
          result.push({
            token,
            claimable: amount.toString(),
            claimableFormatted: formatAmount(amount),
          })
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
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

  // Check if has claimable rewards
  server.tool(
    'tempo_hasClaimableRewards',
    'Check if an account has any claimable rewards',
    {
      token: z.string().describe('Reward token address'),
      account: z.string().describe('Account address'),
    },
    async ({ token, account }) => {
      try {
        const has = await rewards.hasClaimableRewards(token as Address, account as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ token, account, hasClaimable: has }),
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

  // Set reward recipient
  server.tool(
    'tempo_setRewardRecipient',
    'Redirect rewards to another address',
    {
      recipient: z.string().describe('Address to receive rewards'),
    },
    async ({ recipient }) => {
      try {
        const result = await rewards.setRewardRecipient(recipient as Address)
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

  // Distribute rewards
  server.tool(
    'tempo_distributeReward',
    'Distribute rewards to multiple recipients',
    {
      token: z.string().describe('Reward token address'),
      recipients: z.array(z.string()).describe('Recipient addresses'),
      amounts: z.array(z.string()).describe('Amounts for each recipient (human readable)'),
    },
    async ({ token, recipients, amounts }) => {
      try {
        const result = await rewards.distributeReward({
          token: token as Address,
          recipients: recipients as Address[],
          amounts: amounts.map((a) => parseAmount(a)),
        })
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

  // Claim rewards
  server.tool(
    'tempo_claimRewards',
    'Claim rewards for a specific token',
    {
      token: z.string().describe('Reward token address'),
    },
    async ({ token }) => {
      try {
        const result = await rewards.claimRewards(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result.success,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber.toString(),
                explorerUrl: result.explorerUrl,
                claimed: result.claimed?.toString() || null,
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

  // Claim rewards for multiple tokens
  server.tool(
    'tempo_claimRewardsMulti',
    'Claim rewards for multiple tokens',
    {
      tokens: z.array(z.string()).describe('Array of reward token addresses'),
    },
    async ({ tokens }) => {
      try {
        const results = await rewards.claimRewardsMulti(tokens as Address[])
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                results.map((r) => ({
                  success: r.success,
                  transactionHash: r.transactionHash,
                  blockNumber: r.blockNumber.toString(),
                  explorerUrl: r.explorerUrl,
                }))
              ),
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
