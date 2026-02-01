import { Command } from 'commander'
import type { Address } from 'viem'
import * as account from '../../modules/account.js'
import {
  formatBalancesTable,
  formatKeyValue,
  formatError,
  formatOutput,
  formatHeader,
} from '../formatters.js'

export function createAccountCommand(): Command {
  const cmd = new Command('account')
    .description('Account information commands')

  // Get balance
  cmd
    .command('balance')
    .description('Get token balance for an address')
    .argument('<address>', 'Address to check')
    .option('-t, --token <address>', 'Token address')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        if (options.token) {
          const balance = await account.getFormattedBalance(
            options.token as Address,
            address as Address
          )

          if (options.output === 'json') {
            console.log(
              formatOutput(
                {
                  token: balance.token,
                  symbol: balance.symbol,
                  balance: balance.balance.toString(),
                  formatted: balance.formatted,
                },
                'json'
              )
            )
          } else {
            console.log(`${balance.formatted} ${balance.symbol}`)
          }
        } else {
          const balances = await account.getBalances(address as Address)

          if (options.output === 'json') {
            console.log(
              formatOutput(
                balances.map((b) => ({
                  token: b.token,
                  symbol: b.symbol,
                  balance: b.balance.toString(),
                  formatted: b.formatted,
                })),
                'json'
              )
            )
          } else {
            console.log(formatBalancesTable(balances))
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get all balances
  cmd
    .command('balances')
    .description('Get all token balances for an address')
    .argument('<address>', 'Address to check')
    .option('--non-zero', 'Only show non-zero balances')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const balances = options.nonZero
          ? await account.getNonZeroBalances(address as Address)
          : await account.getBalances(address as Address)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              balances.map((b) => ({
                token: b.token,
                symbol: b.symbol,
                balance: b.balance.toString(),
                formatted: b.formatted,
              })),
              'json'
            )
          )
        } else {
          console.log(formatBalancesTable(balances))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get nonce
  cmd
    .command('nonce')
    .description('Get transaction nonce for an address')
    .argument('<address>', 'Address to check')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const nonce = await account.getNonce(address as Address)

        if (options.output === 'json') {
          console.log(formatOutput({ nonce: nonce.toString() }, 'json'))
        } else {
          console.log(formatKeyValue('Nonce', nonce.toString()))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get fee token
  cmd
    .command('fee-token')
    .description('Get the configured fee token for an address')
    .argument('<address>', 'Address to check')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const feeToken = await account.getUserFeeToken(address as Address)

        if (options.output === 'json') {
          console.log(formatOutput({ feeToken }, 'json'))
        } else {
          console.log(formatKeyValue('Fee Token', feeToken || 'Not set'))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get full account info
  cmd
    .command('info')
    .description('Get complete account information')
    .argument('<address>', 'Address to check')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const info = await account.getAccountInfo(address as Address)
        const balances = await account.getNonZeroBalances(address as Address)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                address: info.address,
                nonce: info.nonce.toString(),
                feeToken: info.feeToken,
                balances: balances.map((b) => ({
                  token: b.token,
                  symbol: b.symbol,
                  balance: b.balance.toString(),
                  formatted: b.formatted,
                })),
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader('Account Information'))
          console.log('')
          console.log(formatKeyValue('Address', info.address))
          console.log(formatKeyValue('Nonce', info.nonce.toString()))
          console.log(formatKeyValue('Fee Token', info.feeToken || 'Not set'))
          console.log('')
          console.log(formatHeader('Balances'))
          console.log(formatBalancesTable(balances))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
