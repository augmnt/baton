import { Command } from 'commander'
import type { Address } from 'viem'
import * as faucet from '../../modules/faucet.js'
import { FaucetTokens } from '../../lib/constants.js'
import {
  formatError,
  formatOutput,
  formatHeader,
  formatSuccess,
  formatKeyValue,
} from '../formatters.js'

export function createFaucetCommand(): Command {
  const cmd = new Command('faucet')
    .description('Testnet faucet operations')

  // Fund address
  cmd
    .command('fund')
    .description('Fund an address via the testnet faucet (receives 1M of each token: pathUSD, AlphaUSD, BetaUSD, ThetaUSD)')
    .argument('<address>', 'Address to fund')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (address: string, options) => {
      try {
        const result = await faucet.fundAddress(address as Address)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                success: result.success,
                transactions: result.transactionHashes.map((hash, i) => ({
                  token: FaucetTokens[i]?.name || `Token ${i + 1}`,
                  transactionHash: hash,
                  explorerUrl: result.explorerUrls[i],
                })),
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader('Faucet Funding'))
          console.log('')
          console.log(formatSuccess('Successfully funded address!'))
          console.log('')

          // Display each transaction with its corresponding token
          result.transactionHashes.forEach((hash, i) => {
            const tokenName = FaucetTokens[i]?.name || `Token ${i + 1}`
            console.log(formatKeyValue(tokenName, hash))
          })

          console.log('')
          console.log('Explorer URLs:')
          result.explorerUrls.forEach((url, i) => {
            const tokenName = FaucetTokens[i]?.name || `Token ${i + 1}`
            console.log(`  ${tokenName}: ${url}`)
          })
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
