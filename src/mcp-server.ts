#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { registerAllTools } from './mcp/tools/index.js'
import { KnownTokens, Contracts, Abis } from './lib/constants.js'
import { getNetwork, getRpcUrl, getExplorerUrl, getVersion } from './lib/config.js'

// Create the MCP server
const server = new McpServer({
  name: 'baton',
  version: getVersion(),
})

// Register all tools
registerAllTools(server)

// Register resources using the correct signature: (name, uri, metadata, callback)
server.resource(
  'known-tokens',
  'tempo://tokens/known',
  { description: 'Known Tempo tokens with their addresses' },
  async () => ({
    contents: [
      {
        uri: 'tempo://tokens/known',
        mimeType: 'application/json',
        text: JSON.stringify(KnownTokens, null, 2),
      },
    ],
  })
)

server.resource(
  'contract-addresses',
  'tempo://contracts/addresses',
  { description: 'Tempo contract addresses' },
  async () => ({
    contents: [
      {
        uri: 'tempo://contracts/addresses',
        mimeType: 'application/json',
        text: JSON.stringify(Contracts, null, 2),
      },
    ],
  })
)

server.resource(
  'tip20-abi',
  'tempo://contracts/abis/tip20',
  { description: 'TIP-20 token ABI' },
  async () => ({
    contents: [
      {
        uri: 'tempo://contracts/abis/tip20',
        mimeType: 'application/json',
        text: JSON.stringify(Abis.tip20, null, 2),
      },
    ],
  })
)

server.resource(
  'network-config',
  'tempo://config/network',
  { description: 'Current network configuration' },
  async () => ({
    contents: [
      {
        uri: 'tempo://config/network',
        mimeType: 'application/json',
        text: JSON.stringify({
          network: getNetwork(),
          rpcUrl: getRpcUrl(),
          explorerUrl: getExplorerUrl(),
        }, null, 2),
      },
    ],
  })
)

// Register prompts for guided workflows
server.prompt(
  'transfer-tokens',
  'Guided workflow for transferring TIP-20 tokens',
  {
    token: z.string().describe('Token address'),
    to: z.string().describe('Recipient address'),
    amount: z.string().describe('Amount to transfer'),
    memo: z.string().optional().describe('Optional memo'),
  },
  async ({ token, to, amount, memo }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I want to transfer ${amount} tokens to ${to}.
Token address: ${token}
${memo ? `Memo: ${memo}` : ''}

Please:
1. First check my balance for this token
2. Get the token metadata to confirm the token
3. Execute the transfer
4. Confirm the transaction was successful`,
        },
      },
    ],
  })
)

server.prompt(
  'swap-tokens',
  'Guided workflow for swapping tokens on the DEX',
  {
    tokenIn: z.string().describe('Input token address'),
    tokenOut: z.string().describe('Output token address'),
    amountIn: z.string().describe('Amount of input token'),
  },
  async ({ tokenIn, tokenOut, amountIn }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I want to swap ${amountIn} of ${tokenIn} for ${tokenOut}.

Please:
1. Get a quote for this swap
2. Check my balance of the input token
3. If I have sufficient balance, execute the swap with 0.5% slippage tolerance
4. Confirm the transaction was successful`,
        },
      },
    ],
  })
)

server.prompt(
  'check-account',
  'Get complete account overview',
  {
    address: z.string().describe('Account address'),
  },
  async ({ address }) => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please give me a complete overview of the account ${address}:

1. Get all token balances
2. Get the account nonce
3. Check the configured fee token
4. Show any non-zero balances`,
        },
      },
    ],
  })
)

server.prompt(
  'new-wallet',
  'Generate a new wallet and fund it on testnet',
  {},
  async () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Please help me set up a new wallet:

1. Generate a new wallet with a mnemonic phrase
2. Show me the address and private key (with a warning to save them securely)
3. If we're on testnet, fund the wallet using the faucet
4. Show the initial balances`,
        },
      },
    ],
  })
)

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Baton MCP Server started')
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
