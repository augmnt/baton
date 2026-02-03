import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address, Hex } from 'viem'
import * as token from '../../modules/token.js'
import { getErrorMessage, parseAmount, formatAmount } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'

export function registerTokenTools(server: McpServer) {
  // Get token metadata
  server.tool(
    'tempo_getTokenMetadata',
    'Get TIP-20 token metadata (name, symbol, decimals, totalSupply)',
    {
      token: z.string().describe('Token contract address'),
    },
    async ({ token: tokenAddress }) => {
      try {
        const metadata = await token.getTokenMetadata(tokenAddress as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address: metadata.address,
                name: metadata.name,
                symbol: metadata.symbol,
                decimals: metadata.decimals,
                totalSupply: metadata.totalSupply.toString(),
                totalSupplyFormatted: formatAmount(metadata.totalSupply, metadata.decimals),
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

  // Get allowance
  server.tool(
    'tempo_getAllowance',
    'Get token allowance for a spender',
    {
      token: z.string().describe('Token contract address'),
      owner: z.string().describe('Token owner address'),
      spender: z.string().describe('Spender address'),
    },
    async ({ token: tokenAddress, owner, spender }) => {
      try {
        const allowance = await token.getAllowance(
          tokenAddress as Address,
          owner as Address,
          spender as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                allowance: allowance.toString(),
                formatted: formatAmount(allowance),
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

  // Get roles
  server.tool(
    'tempo_getTokenRoles',
    'Get token roles for an account (admin, minter, burner, pauser)',
    {
      token: z.string().describe('Token contract address'),
      account: z.string().describe('Account to check roles for'),
    },
    async ({ token: tokenAddress, account }) => {
      try {
        const roles = await token.getRoles(tokenAddress as Address, account as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(roles),
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

  // Transfer tokens
  server.tool(
    'tempo_transfer',
    'Transfer TIP-20 tokens to an address',
    {
      token: z.string().describe('Token contract address'),
      to: z.string().describe('Recipient address'),
      amount: z.string().describe('Amount to transfer (human readable, e.g., "100.5")'),
      memo: z.string().optional().describe('Optional memo (max 31 characters or bytes32 hex)'),
    },
    async ({ token: tokenAddress, to, amount, memo }) => {
      try {
        // Validate memo length if provided (and not already a bytes32 hex)
        if (memo && !memo.startsWith('0x') && memo.length > 31) {
          throw new Error('Memo too long. Maximum 31 characters for UTF-8 strings.')
        }
        const parsedAmount = parseAmount(amount)
        const result = await token.transfer({
          token: tokenAddress as Address,
          to: to as Address,
          amount: parsedAmount,
          memo: memo as Hex | undefined,
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

  // Batch transfer
  server.tool(
    'tempo_batchTransfer',
    'Transfer tokens to multiple addresses in batch',
    {
      token: z.string().describe('Token contract address'),
      transfers: z
        .array(
          z.object({
            to: z.string().describe('Recipient address'),
            amount: z.string().describe('Amount to transfer'),
            memo: z.string().optional().describe('Optional memo'),
          })
        )
        .describe('Array of transfers'),
    },
    async ({ token: tokenAddress, transfers }) => {
      try {
        // Validate memo lengths for all transfers
        for (let i = 0; i < transfers.length; i++) {
          const memo = transfers[i].memo
          if (memo && !memo.startsWith('0x') && memo.length > 31) {
            throw new Error(`Memo too long at index ${i}. Maximum 31 characters for UTF-8 strings.`)
          }
        }
        const result = await token.batchTransfer({
          token: tokenAddress as Address,
          transfers: transfers.map((t) => ({
            to: t.to as Address,
            amount: parseAmount(t.amount),
            memo: t.memo as Hex | undefined,
          })),
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

  // Approve spender
  server.tool(
    'tempo_approve',
    'Approve a spender to transfer tokens on your behalf',
    {
      token: z.string().describe('Token contract address'),
      spender: z.string().describe('Spender address to approve'),
      amount: z.string().describe('Amount to approve (human readable)'),
    },
    async ({ token: tokenAddress, spender, amount }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.approve({
          token: tokenAddress as Address,
          spender: spender as Address,
          amount: parsedAmount,
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

  // Mint tokens
  server.tool(
    'tempo_mint',
    'Mint new tokens (requires MINTER_ROLE)',
    {
      token: z.string().describe('Token contract address'),
      to: z.string().describe('Recipient address'),
      amount: z.string().describe('Amount to mint'),
    },
    async ({ token: tokenAddress, to, amount }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.mint({
          token: tokenAddress as Address,
          to: to as Address,
          amount: parsedAmount,
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

  // Burn tokens
  server.tool(
    'tempo_burn',
    'Burn tokens from your balance',
    {
      token: z.string().describe('Token contract address'),
      amount: z.string().describe('Amount to burn'),
    },
    async ({ token: tokenAddress, amount }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.burn({
          token: tokenAddress as Address,
          amount: parsedAmount,
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

  // Grant role
  server.tool(
    'tempo_grantRole',
    'Grant a role to an account (requires admin)',
    {
      token: z.string().describe('Token contract address'),
      role: z
        .enum(['MINTER_ROLE', 'BURNER_ROLE', 'PAUSER_ROLE', 'DEFAULT_ADMIN_ROLE'])
        .describe('Role to grant'),
      account: z.string().describe('Account to grant role to'),
    },
    async ({ token: tokenAddress, role, account }) => {
      try {
        const result = await token.grantRole(
          tokenAddress as Address,
          role,
          account as Address
        )
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

  // Revoke role
  server.tool(
    'tempo_revokeRole',
    'Revoke a role from an account (requires admin)',
    {
      token: z.string().describe('Token contract address'),
      role: z
        .enum(['MINTER_ROLE', 'BURNER_ROLE', 'PAUSER_ROLE', 'DEFAULT_ADMIN_ROLE'])
        .describe('Role to revoke'),
      account: z.string().describe('Account to revoke role from'),
    },
    async ({ token: tokenAddress, role, account }) => {
      try {
        const result = await token.revokeRole(
          tokenAddress as Address,
          role,
          account as Address
        )
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

  // Check transfer feasibility
  server.tool(
    'tempo_canTransfer',
    'Check if a transfer will succeed (balance check)',
    {
      token: z.string().describe('Token contract address'),
      from: z.string().describe('Sender address'),
      amount: z.string().describe('Amount to transfer'),
    },
    async ({ token: tokenAddress, from, amount }) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.canTransfer(
          tokenAddress as Address,
          from as Address,
          parsedAmount
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                canTransfer: result.canTransfer,
                balance: result.balance.toString(),
                balanceFormatted: formatAmount(result.balance),
                shortfall: result.shortfall.toString(),
                shortfallFormatted: formatAmount(result.shortfall),
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

  // Get allowance for configured wallet
  server.tool(
    'tempo_getMyAllowance',
    'Get token allowance where the configured wallet (TEMPO_PRIVATE_KEY) is the owner. Use this when the user asks "what is my USDC allowance for DEX?" or similar.',
    {
      token: z.string().describe('Token contract address'),
      spender: z.string().describe('Spender address'),
    },
    async ({ token: tokenAddress, spender }) => {
      try {
        const owner = getConfiguredAddress()
        const allowance = await token.getAllowance(
          tokenAddress as Address,
          owner,
          spender as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                owner,
                spender,
                token: tokenAddress,
                allowance: allowance.toString(),
                formatted: formatAmount(allowance),
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

  // Get token roles for configured wallet
  server.tool(
    'tempo_getMyTokenRoles',
    'Get token roles for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "what roles do I have on this token?" or similar.',
    {
      token: z.string().describe('Token contract address'),
    },
    async ({ token: tokenAddress }) => {
      try {
        const account = getConfiguredAddress()
        const roles = await token.getRoles(tokenAddress as Address, account)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                account,
                token: tokenAddress,
                roles,
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

  // Check if configured wallet can transfer
  server.tool(
    'tempo_canITransfer',
    'Check if the configured wallet (TEMPO_PRIVATE_KEY) can transfer a specified amount. Use this when the user asks "can I transfer 100 USDC?" or similar.',
    {
      token: z.string().describe('Token contract address'),
      amount: z.string().describe('Amount to transfer'),
    },
    async ({ token: tokenAddress, amount }) => {
      try {
        const from = getConfiguredAddress()
        const parsedAmount = parseAmount(amount)
        const result = await token.canTransfer(
          tokenAddress as Address,
          from,
          parsedAmount
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                from,
                token: tokenAddress,
                amount,
                canTransfer: result.canTransfer,
                balance: result.balance.toString(),
                balanceFormatted: formatAmount(result.balance),
                shortfall: result.shortfall.toString(),
                shortfallFormatted: formatAmount(result.shortfall),
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
