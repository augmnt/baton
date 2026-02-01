import { Command } from 'commander'
import type { Address } from 'viem'
import * as faucet from '../../modules/faucet.js'
import { formatAmount } from '../../lib/utils.js'
import {
  formatTransactionResult,
  formatKeyValue,
  formatError,
  formatOutput,
  formatHeader,
  formatSuccess,
  formatWarning,
} from '../formatters.js'

export function createFaucetCommand(): Command {
  const cmd = new Command('faucet')
    .description('Testnet faucet operations')

  // Fund address
  cmd
    .command('fund')
    .description('Fund an address via the testnet faucet')
    .argument('<address>', 'Address to fund')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const result = await faucet.fundAddress(address as Address)
        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Check faucet availability
  cmd
    .command('status')
    .description('Check faucet availability and info')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const info = await faucet.getFaucetInfo()

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                available: info.available,
                amountPerRequest: info.amountPerRequest.toString(),
                cooldownSeconds: info.cooldownSeconds,
                dailyLimit: info.dailyLimit.toString(),
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader('Faucet Status'))
          console.log('')
          console.log(formatKeyValue('Available', info.available ? 'Yes' : 'No'))
          console.log(formatKeyValue('Amount per Request', formatAmount(info.amountPerRequest)))
          console.log(formatKeyValue('Cooldown', `${info.cooldownSeconds} seconds`))
          console.log(formatKeyValue('Daily Limit', formatAmount(info.dailyLimit)))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Check cooldown for address
  cmd
    .command('cooldown')
    .description('Check faucet cooldown for an address')
    .argument('<address>', 'Address to check')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const status = await faucet.getFaucetCooldown(address as Address)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                canRequest: status.canRequest,
                cooldownRemaining: status.cooldownRemaining,
                lastRequestTime: status.lastRequestTime.toString(),
              },
              'json'
            )
          )
        } else {
          if (status.canRequest) {
            console.log(formatSuccess('Ready to request tokens'))
          } else {
            console.log(formatWarning(`Please wait ${status.cooldownRemaining} seconds`))
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
