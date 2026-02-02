import { Command } from 'commander'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

import {
  createWalletCommand,
  createAccountCommand,
  createTokenCommand,
  createDexCommand,
  createChainCommand,
  createFaucetCommand,
} from './commands/index.js'
import { getBanner, colors } from './branding.js'

const VERSION = '0.1.2'

export function createCli(): Command {
  const program = new Command()

  program
    .name('baton')
    .description(`${getBanner()}\n\nCLI toolkit for the Tempo blockchain`)
    .version(VERSION)
    .configureOutput({
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
    })

  // Global options
  program
    .option('--network <network>', 'Network to use (mainnet, testnet)', 'mainnet')
    .option('--rpc <url>', 'Custom RPC URL')
    .option('-v, --verbose', 'Enable verbose output')

  // Apply global options to environment
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts()
    if (opts.network) {
      process.env.TEMPO_NETWORK = opts.network
    }
    if (opts.rpc) {
      process.env.TEMPO_RPC_URL = opts.rpc
    }
  })

  // Add subcommands
  program.addCommand(createWalletCommand())
  program.addCommand(createAccountCommand())
  program.addCommand(createTokenCommand())
  program.addCommand(createDexCommand())
  program.addCommand(createChainCommand())
  program.addCommand(createFaucetCommand())

  // MCP server command
  program
    .command('mcp')
    .description('Start the MCP server for AI integration')
    .action(async () => {
      // Import and start MCP server
      const { spawn } = await import('child_process')

      // Resolve absolute path to mcp-server.js using import.meta.url
      // __dirname points to dist/src/cli/ (where compiled index.js lives)
      // mcp-server.js is at dist/src/mcp-server.js (one level up)
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const mcpServerPath = resolve(__dirname, '../mcp-server.js')

      const mcpProcess = spawn('node', [mcpServerPath], {
        stdio: 'inherit',
      })

      mcpProcess.on('error', (err) => {
        console.error(colors.error(`Failed to start MCP server: ${err.message}`))
        process.exit(1)
      })

      mcpProcess.on('exit', (code) => {
        process.exit(code ?? 0)
      })
    })

  // Quick transfer command at root level
  program
    .command('transfer <to> <amount>')
    .description('Quick transfer tokens')
    .option('-t, --token <address>', 'Token address (required)')
    .option('-m, --memo <memo>', 'Optional memo')
    .option('-o, --output <format>', 'Output format', 'table')
    .action(async (to, amount, options) => {
      if (!options.token) {
        console.error(colors.error('--token is required'))
        process.exit(1)
      }

      // Forward to token transfer command
      const tokenCmd = createTokenCommand()
      const transferCmd = tokenCmd.commands.find((c) => c.name() === 'transfer')
      if (transferCmd) {
        await transferCmd.parseAsync([
          options.token,
          to,
          amount,
          ...(options.memo ? ['-m', options.memo] : []),
          '-o',
          options.output,
        ], { from: 'user' })
      }
    })

  // Quick balances command at root level
  program
    .command('balances <address>')
    .description('Quick view of all balances')
    .option('--non-zero', 'Only show non-zero balances')
    .option('-o, --output <format>', 'Output format', 'table')
    .action(async (address, options) => {
      const accountCmd = createAccountCommand()
      const balancesCmd = accountCmd.commands.find((c) => c.name() === 'balances')
      if (balancesCmd) {
        await balancesCmd.parseAsync([
          address,
          ...(options.nonZero ? ['--non-zero'] : []),
          '-o',
          options.output,
        ], { from: 'user' })
      }
    })

  return program
}
