import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Address } from 'viem'
import * as keychain from '../../modules/keychain.js'
import { getErrorMessage } from '../../lib/utils.js'
import { getConfiguredAddress } from '../../lib/config.js'

export function registerKeychainTools(server: McpServer) {
  // Get access key info
  server.tool(
    'tempo_getAccessKey',
    'Get information about an access key',
    {
      owner: z.string().describe('Owner address'),
      accessKey: z.string().describe('Access key address'),
    },
    async ({ owner, accessKey }) => {
      try {
        const info = await keychain.getAccessKey(owner as Address, accessKey as Address)
        if (!info) {
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
                accessKey: info.accessKey,
                owner: info.owner,
                permissions: info.permissions,
                expiry: info.expiry.toString(),
                isActive: info.isActive,
                isExpired: keychain.isExpired(info),
                timeUntilExpiry: keychain.getTimeUntilExpiry(info).toString(),
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

  // Get all access keys
  server.tool(
    'tempo_getAccessKeys',
    'Get all access keys for an owner',
    {
      owner: z.string().describe('Owner address'),
    },
    async ({ owner }) => {
      try {
        const keys = await keychain.getAccessKeys(owner as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ owner, accessKeys: keys }),
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

  // Get access keys with full info
  server.tool(
    'tempo_getAccessKeysWithInfo',
    'Get all access keys with detailed info for an owner',
    {
      owner: z.string().describe('Owner address'),
    },
    async ({ owner }) => {
      try {
        const keys = await keychain.getAccessKeysWithInfo(owner as Address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                keys.map((k) => ({
                  accessKey: k.accessKey,
                  permissions: k.permissions,
                  expiry: k.expiry.toString(),
                  isActive: k.isActive,
                  isExpired: keychain.isExpired(k),
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

  // Check permission
  server.tool(
    'tempo_hasPermission',
    'Check if an access key has a specific permission',
    {
      owner: z.string().describe('Owner address'),
      accessKey: z.string().describe('Access key address'),
      permission: z.enum(['TRANSFER', 'APPROVE', 'MANAGE_KEYS']).describe('Permission to check'),
    },
    async ({ owner, accessKey, permission }) => {
      try {
        const has = await keychain.hasPermission(
          owner as Address,
          accessKey as Address,
          permission
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ permission, hasPermission: has }),
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

  // Authorize access key
  server.tool(
    'tempo_authorizeAccessKey',
    'Authorize a new access key with specified permissions',
    {
      accessKey: z.string().describe('Access key address to authorize'),
      canTransfer: z.boolean().describe('Allow transfers'),
      canApprove: z.boolean().describe('Allow approvals'),
      canManageKeys: z.boolean().describe('Allow managing other keys'),
      expiry: z.string().optional().describe('Expiry timestamp (Unix seconds, 0 for no expiry)'),
    },
    async ({ accessKey, canTransfer, canApprove, canManageKeys, expiry }) => {
      try {
        const result = await keychain.authorizeAccessKey({
          accessKey: accessKey as Address,
          permissions: {
            canTransfer,
            canApprove,
            canManageKeys,
            allowedTokens: [],
          },
          expiry: expiry ? BigInt(expiry) : undefined,
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

  // Revoke access key
  server.tool(
    'tempo_revokeAccessKey',
    'Revoke an access key',
    {
      accessKey: z.string().describe('Access key address to revoke'),
    },
    async ({ accessKey }) => {
      try {
        const result = await keychain.revokeAccessKey(accessKey as Address)
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

  // Authorize full access key (convenience)
  server.tool(
    'tempo_authorizeFullAccessKey',
    'Authorize a new access key with full permissions',
    {
      accessKey: z.string().describe('Access key address to authorize'),
      expiry: z.string().optional().describe('Expiry timestamp (Unix seconds, 0 for no expiry)'),
    },
    async ({ accessKey, expiry }) => {
      try {
        const result = await keychain.authorizeFullAccessKey(
          accessKey as Address,
          expiry ? BigInt(expiry) : undefined
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

  // Authorize transfer-only key (convenience)
  server.tool(
    'tempo_authorizeTransferOnlyKey',
    'Authorize a new access key with transfer-only permissions',
    {
      accessKey: z.string().describe('Access key address to authorize'),
      expiry: z.string().optional().describe('Expiry timestamp (Unix seconds, 0 for no expiry)'),
    },
    async ({ accessKey, expiry }) => {
      try {
        const result = await keychain.authorizeTransferOnlyKey(
          accessKey as Address,
          expiry ? BigInt(expiry) : undefined
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

  // Get access keys for configured wallet
  server.tool(
    'tempo_getMyAccessKeys',
    'Get all access keys for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "what are my access keys?" or similar.',
    {},
    async () => {
      try {
        const owner = getConfiguredAddress()
        const keys = await keychain.getAccessKeys(owner)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ owner, accessKeys: keys }),
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

  // Get access keys with info for configured wallet
  server.tool(
    'tempo_getMyAccessKeysWithInfo',
    'Get all access keys with detailed info for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "show my access keys with details" or similar.',
    {},
    async () => {
      try {
        const owner = getConfiguredAddress()
        const keys = await keychain.getAccessKeysWithInfo(owner)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                owner,
                accessKeys: keys.map((k) => ({
                  accessKey: k.accessKey,
                  permissions: k.permissions,
                  expiry: k.expiry.toString(),
                  isActive: k.isActive,
                  isExpired: keychain.isExpired(k),
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

  // Get specific access key for configured wallet
  server.tool(
    'tempo_getMyAccessKey',
    'Get information about a specific access key for the configured wallet (TEMPO_PRIVATE_KEY). Use this when the user asks "show info for this access key" or similar.',
    {
      accessKey: z.string().describe('Access key address'),
    },
    async ({ accessKey }) => {
      try {
        const owner = getConfiguredAddress()
        const info = await keychain.getAccessKey(owner, accessKey as Address)
        if (!info) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ owner, found: false }) }],
          }
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                owner,
                found: true,
                accessKey: info.accessKey,
                permissions: info.permissions,
                expiry: info.expiry.toString(),
                isActive: info.isActive,
                isExpired: keychain.isExpired(info),
                timeUntilExpiry: keychain.getTimeUntilExpiry(info).toString(),
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
