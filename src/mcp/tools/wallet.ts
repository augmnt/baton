import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import * as wallet from '../../modules/wallet.js'
import { getErrorMessage } from '../../lib/utils.js'
import type { Hex } from 'viem'

export function registerWalletTools(server: McpServer) {
  // Generate a new wallet
  server.tool(
    'tempo_generateWallet',
    'Generate a new random wallet with private key. Optionally generates a mnemonic phrase.',
    {
      withMnemonic: z
        .boolean()
        .optional()
        .describe('If true, generates a 12-word mnemonic phrase'),
    },
    async ({ withMnemonic }) => {
      try {
        const result = wallet.generateWallet(withMnemonic ?? false)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address: result.address,
                privateKey: result.privateKey,
                mnemonic: result.mnemonic || null,
                warning:
                  'IMPORTANT: Store your private key securely. Never share it with anyone.',
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

  // Derive address from private key
  server.tool(
    'tempo_deriveAddress',
    'Derive the wallet address from a private key',
    {
      privateKey: z.string().describe('Private key (hex string, with or without 0x prefix)'),
    },
    async ({ privateKey }) => {
      try {
        const normalizedKey = privateKey.startsWith('0x')
          ? (privateKey as Hex)
          : (`0x${privateKey}` as Hex)
        const address = wallet.deriveAddress(normalizedKey)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address }),
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

  // Derive wallet from mnemonic
  server.tool(
    'tempo_deriveFromMnemonic',
    'Derive a wallet from a BIP-39 mnemonic phrase',
    {
      mnemonic: z.string().describe('BIP-39 mnemonic phrase (12 or 24 words)'),
      index: z
        .number()
        .optional()
        .describe('Account index to derive (default 0)'),
    },
    async ({ mnemonic, index }) => {
      try {
        const result = wallet.deriveFromMnemonic(mnemonic, index ?? 0)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                address: result.address,
                privateKey: result.privateKey,
                index: index ?? 0,
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

  // Validate mnemonic
  server.tool(
    'tempo_validateMnemonic',
    'Validate a BIP-39 mnemonic phrase',
    {
      mnemonic: z.string().describe('Mnemonic phrase to validate'),
    },
    async ({ mnemonic }) => {
      try {
        const isValid = wallet.validateMnemonic(mnemonic)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ valid: isValid }),
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

  // Validate private key
  server.tool(
    'tempo_validatePrivateKey',
    'Validate a private key format',
    {
      privateKey: z.string().describe('Private key to validate'),
    },
    async ({ privateKey }) => {
      try {
        const isValid = wallet.validatePrivateKey(privateKey)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ valid: isValid }),
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

  // Checksum address
  server.tool(
    'tempo_checksumAddress',
    'Convert an address to checksummed format',
    {
      address: z.string().describe('Address to checksum'),
    },
    async ({ address }) => {
      try {
        const checksummed = wallet.checksumAddress(address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address: checksummed }),
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
