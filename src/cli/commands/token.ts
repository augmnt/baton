import { Command } from 'commander'
import type { Address, Hex } from 'viem'
import * as token from '../../modules/token.js'
import { parseAmount, formatAmount } from '../../lib/utils.js'
import {
  formatTokenMetadata,
  formatKeyValue,
  formatTransactionResult,
  formatError,
  formatOutput,
} from '../formatters.js'

export function createTokenCommand(): Command {
  const cmd = new Command('token')
    .description('Token operations')

  // Get token metadata
  cmd
    .command('info')
    .description('Get token metadata')
    .argument('<token>', 'Token address')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, options) => {
      try {
        const metadata = await token.getTokenMetadata(tokenAddress as Address)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                ...metadata,
                totalSupply: metadata.totalSupply.toString(),
              },
              'json'
            )
          )
        } else {
          console.log(formatTokenMetadata(metadata))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Transfer tokens
  cmd
    .command('transfer')
    .description('Transfer tokens to an address')
    .argument('<token>', 'Token address')
    .argument('<to>', 'Recipient address')
    .argument('<amount>', 'Amount to transfer')
    .option('-m, --memo <memo>', 'Optional memo')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, to: string, amount: string, options) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.transfer({
          token: tokenAddress as Address,
          to: to as Address,
          amount: parsedAmount,
          memo: options.memo as Hex | undefined,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Approve spender
  cmd
    .command('approve')
    .description('Approve a spender to transfer tokens')
    .argument('<token>', 'Token address')
    .argument('<spender>', 'Spender address')
    .argument('<amount>', 'Amount to approve')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, spender: string, amount: string, options) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.approve({
          token: tokenAddress as Address,
          spender: spender as Address,
          amount: parsedAmount,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get allowance
  cmd
    .command('allowance')
    .description('Get token allowance for a spender')
    .argument('<token>', 'Token address')
    .argument('<owner>', 'Token owner address')
    .argument('<spender>', 'Spender address')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, owner: string, spender: string, options) => {
      try {
        const allowance = await token.getAllowance(
          tokenAddress as Address,
          owner as Address,
          spender as Address
        )

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                allowance: allowance.toString(),
                formatted: formatAmount(allowance),
              },
              'json'
            )
          )
        } else {
          console.log(formatKeyValue('Allowance', formatAmount(allowance)))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Mint tokens
  cmd
    .command('mint')
    .description('Mint new tokens (requires MINTER_ROLE)')
    .argument('<token>', 'Token address')
    .argument('<to>', 'Recipient address')
    .argument('<amount>', 'Amount to mint')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, to: string, amount: string, options) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.mint({
          token: tokenAddress as Address,
          to: to as Address,
          amount: parsedAmount,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Burn tokens
  cmd
    .command('burn')
    .description('Burn tokens from your balance')
    .argument('<token>', 'Token address')
    .argument('<amount>', 'Amount to burn')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, amount: string, options) => {
      try {
        const parsedAmount = parseAmount(amount)
        const result = await token.burn({
          token: tokenAddress as Address,
          amount: parsedAmount,
        })

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get roles
  cmd
    .command('roles')
    .description('Get token roles for an account')
    .argument('<token>', 'Token address')
    .argument('<account>', 'Account to check')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, account: string, options) => {
      try {
        const roles = await token.getRoles(tokenAddress as Address, account as Address)

        if (options.output === 'json') {
          console.log(formatOutput(roles, 'json'))
        } else {
          console.log(formatKeyValue('Admin', roles.admin ? 'Yes' : 'No'))
          console.log(formatKeyValue('Minter', roles.minter ? 'Yes' : 'No'))
          console.log(formatKeyValue('Burner', roles.burner ? 'Yes' : 'No'))
          console.log(formatKeyValue('Pauser', roles.pauser ? 'Yes' : 'No'))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Grant role
  cmd
    .command('grant-role')
    .description('Grant a role to an account')
    .argument('<token>', 'Token address')
    .argument('<role>', 'Role (MINTER_ROLE, BURNER_ROLE, PAUSER_ROLE)')
    .argument('<account>', 'Account to grant role to')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, role: string, account: string, options) => {
      try {
        const result = await token.grantRole(
          tokenAddress as Address,
          role as 'MINTER_ROLE' | 'BURNER_ROLE' | 'PAUSER_ROLE',
          account as Address
        )

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Revoke role
  cmd
    .command('revoke-role')
    .description('Revoke a role from an account')
    .argument('<token>', 'Token address')
    .argument('<role>', 'Role (MINTER_ROLE, BURNER_ROLE, PAUSER_ROLE)')
    .argument('<account>', 'Account to revoke role from')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (tokenAddress: string, role: string, account: string, options) => {
      try {
        const result = await token.revokeRole(
          tokenAddress as Address,
          role as 'MINTER_ROLE' | 'BURNER_ROLE' | 'PAUSER_ROLE',
          account as Address
        )

        console.log(formatTransactionResult(result, options.output))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
