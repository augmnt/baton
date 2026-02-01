import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as policy from '../../modules/policy.js'
import { getErrorMessage, parseAmount } from '../../lib/utils.js'
import type { PolicyRule } from '../../lib/types.js'

export function registerPolicyTools(server: McpServer) {
  // Get policy
  server.tool(
    'tempo_getPolicy',
    'Get policy information by ID',
    {
      policyId: z.string().describe('Policy ID'),
    },
    async ({ policyId }) => {
      try {
        const result = await policy.getPolicy(BigInt(policyId))
        if (!result) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ found: false }) }],
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                name: result.name,
                owner: result.owner,
                rules: result.rules,
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

  // Get transfer policy
  server.tool(
    'tempo_getTransferPolicy',
    'Get the transfer policy for a token',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const policyId = await policy.getTransferPolicy(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                token,
                policyId: policyId.toString(),
                hasPolicy: policyId > 0n,
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

  // Check if token has policy
  server.tool(
    'tempo_hasTransferPolicy',
    'Check if a token has a transfer policy',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const has = await policy.hasTransferPolicy(token as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ token, hasPolicy: has }),
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

  // Create policy
  server.tool(
    'tempo_createPolicy',
    'Create a new transfer policy',
    {
      name: z.string().describe('Policy name'),
      rules: z
        .array(
          z.object({
            ruleType: z
              .enum(['MAX_AMOUNT', 'DAILY_LIMIT', 'TIME_LOCK'])
              .describe('Rule type'),
            value: z.string().describe('Rule value (amount in human readable or seconds)'),
          })
        )
        .describe('Policy rules'),
    },
    async ({ name, rules }) => {
      try {
        const policyRules: PolicyRule[] = rules.map((r) => ({
          ruleType: r.ruleType,
          value:
            r.ruleType === 'TIME_LOCK'
              ? BigInt(r.value)
              : parseAmount(r.value),
        }))

        const result = await policy.createPolicy({ name, rules: policyRules })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: result.success,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber.toString(),
                explorerUrl: result.explorerUrl,
                policyId: result.policyId?.toString() || null,
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

  // Set transfer policy
  server.tool(
    'tempo_setTransferPolicy',
    'Set a transfer policy for a token',
    {
      token: z.string().describe('Token address'),
      policyId: z.string().describe('Policy ID to apply'),
    },
    async ({ token, policyId }) => {
      try {
        const result = await policy.setTransferPolicy({
          token: token as Address,
          policyId: BigInt(policyId),
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

  // Remove transfer policy
  server.tool(
    'tempo_removeTransferPolicy',
    'Remove the transfer policy from a token',
    {
      token: z.string().describe('Token address'),
    },
    async ({ token }) => {
      try {
        const result = await policy.removeTransferPolicy(token as Address)
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

  // Create transfer limit policy (convenience)
  server.tool(
    'tempo_createTransferLimitPolicy',
    'Create a policy with transfer amount limits',
    {
      name: z.string().describe('Policy name'),
      maxAmount: z.string().describe('Maximum transfer amount per transaction'),
      dailyLimit: z.string().optional().describe('Optional daily transfer limit'),
    },
    async ({ name, maxAmount, dailyLimit }) => {
      try {
        const result = await policy.createTransferLimitPolicy(
          name,
          parseAmount(maxAmount),
          dailyLimit ? parseAmount(dailyLimit) : undefined
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
                policyId: result.policyId?.toString() || null,
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

  // Create time lock policy (convenience)
  server.tool(
    'tempo_createTimeLockPolicy',
    'Create a policy with time lock requirements',
    {
      name: z.string().describe('Policy name'),
      lockSeconds: z.string().describe('Lock duration in seconds'),
      maxAmount: z.string().optional().describe('Optional maximum transfer amount'),
    },
    async ({ name, lockSeconds, maxAmount }) => {
      try {
        const result = await policy.createTimeLockPolicy(
          name,
          BigInt(lockSeconds),
          maxAmount ? parseAmount(maxAmount) : undefined
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
                policyId: result.policyId?.toString() || null,
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
