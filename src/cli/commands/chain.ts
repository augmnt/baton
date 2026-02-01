import { Command } from 'commander'
import type { Hash } from 'viem'
import * as chain from '../../modules/chain.js'
import {
  formatChainInfo,
  formatKeyValue,
  formatError,
  formatOutput,
  formatHeader,
} from '../formatters.js'
import { formatTimestamp } from '../../lib/utils.js'

export function createChainCommand(): Command {
  const cmd = new Command('chain')
    .description('Chain information commands')

  // Get chain info
  cmd
    .command('info')
    .description('Get chain information')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const info = await chain.getChainInfo()

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                chainId: info.chainId,
                name: info.name,
                blockNumber: info.blockNumber.toString(),
                gasPrice: info.gasPrice.toString(),
              },
              'json'
            )
          )
        } else {
          console.log(formatChainInfo(info))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get block number
  cmd
    .command('block-number')
    .description('Get current block number')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const blockNumber = await chain.getBlockNumber()

        if (options.output === 'json') {
          console.log(formatOutput({ blockNumber: blockNumber.toString() }, 'json'))
        } else {
          console.log(blockNumber.toString())
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get block
  cmd
    .command('block')
    .description('Get block information')
    .argument('[blockIdentifier]', 'Block number, hash, or tag (latest, pending)', 'latest')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (blockIdentifier: string, options) => {
      try {
        let identifier: bigint | Hash | 'latest' | 'pending' | 'earliest'

        if (blockIdentifier.startsWith('0x')) {
          identifier = blockIdentifier as Hash
        } else if (['latest', 'pending', 'earliest'].includes(blockIdentifier)) {
          identifier = blockIdentifier as 'latest' | 'pending' | 'earliest'
        } else {
          identifier = BigInt(blockIdentifier)
        }

        const block = await chain.getBlock(identifier)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                number: block.number.toString(),
                hash: block.hash,
                timestamp: block.timestamp.toString(),
                transactionCount: block.transactionCount,
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader(`Block #${block.number}`))
          console.log('')
          console.log(formatKeyValue('Hash', block.hash))
          console.log(formatKeyValue('Timestamp', formatTimestamp(block.timestamp)))
          console.log(formatKeyValue('Transactions', block.transactionCount))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get transaction
  cmd
    .command('tx')
    .description('Get transaction information')
    .argument('<txHash>', 'Transaction hash')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (txHash: string, options) => {
      try {
        const tx = await chain.getTransaction(txHash as Hash)

        if (options.output === 'json') {
          console.log(
            formatOutput(
              {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: tx.blockNumber.toString(),
                timestamp: tx.timestamp.toString(),
                status: tx.status,
              },
              'json'
            )
          )
        } else {
          console.log(formatHeader('Transaction'))
          console.log('')
          console.log(formatKeyValue('Hash', tx.hash))
          console.log(formatKeyValue('From', tx.from))
          console.log(formatKeyValue('To', tx.to || 'Contract Creation'))
          console.log(formatKeyValue('Value', tx.value.toString()))
          console.log(formatKeyValue('Block', tx.blockNumber.toString()))
          console.log(formatKeyValue('Status', tx.status))
          if (tx.timestamp > 0n) {
            console.log(formatKeyValue('Time', formatTimestamp(tx.timestamp)))
          }
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  // Get gas price
  cmd
    .command('gas-price')
    .description('Get current gas price')
    .option('-o, --output <format>', 'Output format (table|json)', 'table')
    .action(async (options) => {
      try {
        const gasPrice = await chain.getGasPrice()

        if (options.output === 'json') {
          console.log(formatOutput({ gasPrice: gasPrice.toString() }, 'json'))
        } else {
          console.log(formatKeyValue('Gas Price', gasPrice.toString()))
        }
      } catch (error) {
        console.error(formatError(error instanceof Error ? error.message : 'Unknown error'))
        process.exit(1)
      }
    })

  return cmd
}
