import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerChainTools } from './chain.js'
import { registerWalletTools } from './wallet.js'
import { registerAccountTools } from './account.js'
import { registerTokenTools } from './token.js'
import { registerDexTools } from './dex.js'
import { registerFeesTools } from './fees.js'
import { registerFeeAmmTools } from './fee-amm.js'
import { registerKeychainTools } from './keychain.js'
import { registerPolicyTools } from './policy.js'
import { registerRewardsTools } from './rewards.js'
import { registerHistoryTools } from './history.js'
import { registerFaucetTools } from './faucet.js'
import { registerContractsTools } from './contracts.js'
import { registerUtilsTools } from './utils.js'

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(server: McpServer) {
  registerChainTools(server)
  registerWalletTools(server)
  registerAccountTools(server)
  registerTokenTools(server)
  registerDexTools(server)
  registerFeesTools(server)
  registerFeeAmmTools(server)
  registerKeychainTools(server)
  registerPolicyTools(server)
  registerRewardsTools(server)
  registerHistoryTools(server)
  registerFaucetTools(server)
  registerContractsTools(server)
  registerUtilsTools(server)
}

export {
  registerChainTools,
  registerWalletTools,
  registerAccountTools,
  registerTokenTools,
  registerDexTools,
  registerFeesTools,
  registerFeeAmmTools,
  registerKeychainTools,
  registerPolicyTools,
  registerRewardsTools,
  registerHistoryTools,
  registerFaucetTools,
  registerContractsTools,
  registerUtilsTools,
}
