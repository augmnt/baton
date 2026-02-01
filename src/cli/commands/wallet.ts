import { Command } from 'commander'
import type { Hex } from 'viem'
import * as wallet from '../../modules/wallet.js'
import {
  formatWallet,
  formatKeyValue,
  formatError,
  formatOutput,
} from '../formatters.js'

export function createWalletCommand(): Command {
  const cmd = new Command('wallet')
    .description('Wallet management commands')

  // Generate new wallet
  cmd
    .command('new')
    .description('Generate a new wallet')
    .option('-m, --mnemonic', 'Generate with mnemonic phrase')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const result = wallet.generateWallet(options.mnemonic)

        if (options.output === 'json') {
          console.log(formatOutput(result, 'json'))
        } else {
          console.log(formatWallet(result))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Derive address from private key
  cmd
    .command('derive')
    .description('Derive address from private key')
    .argument('<privateKey>', 'Private key (hex)')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (privateKey: string, options) => {
      try {
        const normalizedKey = privateKey.startsWith('0x')
          ? (privateKey as Hex)
          : (`0x${privateKey}` as Hex)
        const address = wallet.deriveAddress(normalizedKey)

        if (options.output === 'json') {
          console.log(formatOutput({ address }, 'json'))
        } else {
          console.log(formatKeyValue('Address', address))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Derive from mnemonic
  cmd
    .command('from-mnemonic')
    .description('Derive wallet from mnemonic phrase')
    .argument('<mnemonic>', 'BIP-39 mnemonic phrase')
    .option('-i, --index <number>', 'Account index', '0')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (mnemonic: string, options) => {
      try {
        const index = parseInt(options.index, 10)
        const result = wallet.deriveFromMnemonic(mnemonic, index)

        if (options.output === 'json') {
          console.log(formatOutput(result, 'json'))
        } else {
          console.log(formatWallet(result))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Validate mnemonic
  cmd
    .command('validate-mnemonic')
    .description('Validate a mnemonic phrase')
    .argument('<mnemonic>', 'Mnemonic phrase to validate')
    .action(async (mnemonic: string) => {
      try {
        const isValid = wallet.validateMnemonic(mnemonic)
        console.log(formatKeyValue('Valid', isValid ? 'Yes' : 'No'))
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Checksum address
  cmd
    .command('checksum')
    .description('Convert address to checksummed format')
    .argument('<address>', 'Address to checksum')
    .action(async (address: string) => {
      try {
        const checksummed = wallet.checksumAddress(address)
        console.log(checksummed)
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
