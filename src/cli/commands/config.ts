import { Command } from 'commander'
import prompts from 'prompts'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Hex } from 'viem'
import * as wallet from '../../modules/wallet.js'
import { colors } from '../branding.js'

interface EnvVars {
  [key: string]: string | undefined
}

function readEnvFile(envPath: string): EnvVars {
  const vars: EnvVars = {}

  if (!existsSync(envPath)) {
    return vars
  }

  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex)
        const value = trimmed.slice(eqIndex + 1)
        vars[key] = value
      }
    }
  }

  return vars
}

function writeEnvFile(vars: EnvVars, envPath: string): void {
  const lines: string[] = [
    '# Baton Configuration',
    '# Updated by: baton config',
    '',
  ]

  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      lines.push(`${key}=${value}`)
    }
  }

  writeFileSync(envPath, lines.join('\n') + '\n')
}

export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .description('View and update Baton configuration')

  // View config
  cmd
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const envPath = join(process.cwd(), '.env')

      if (!existsSync(envPath)) {
        console.log(colors.warning('No .env file found in current directory.'))
        console.log(colors.info('Run `baton init` to create one.'))
        return
      }

      const vars = readEnvFile(envPath)

      console.log(colors.accent.bold('\nCurrent Configuration\n'))

      const network = vars.TEMPO_NETWORK || 'mainnet (default)'
      const rpcUrl = vars.TEMPO_RPC_URL || '(default)'
      const hasKey = !!vars.TEMPO_PRIVATE_KEY

      console.log(colors.dim('  Network:     ') + colors.accent(network))
      console.log(colors.dim('  RPC URL:     ') + colors.accent(rpcUrl))
      console.log(colors.dim('  Private Key: ') + (hasKey ? colors.success('configured') : colors.warning('not set')))

      if (hasKey && vars.TEMPO_PRIVATE_KEY) {
        try {
          const address = wallet.deriveAddress(vars.TEMPO_PRIVATE_KEY as Hex)
          console.log(colors.dim('  Address:     ') + colors.accent(address))
        } catch {
          console.log(colors.dim('  Address:     ') + colors.error('invalid key'))
        }
      }

      console.log('')
    })

  // Update private key
  cmd
    .command('set-key')
    .description('Update private key (interactive, secure input)')
    .action(async () => {
      const envPath = join(process.cwd(), '.env')

      console.log(colors.accent.bold('\nUpdate Private Key\n'))
      console.log(colors.dim('  Your key will be entered securely (hidden) and saved to .env'))
      console.log('')

      const { key } = await prompts({
        type: 'password',
        name: 'key',
        message: 'Enter your private key:',
        validate: (value: string) => {
          if (!value) return 'Private key is required'
          const normalized = value.startsWith('0x') ? value : `0x${value}`
          if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
            return 'Invalid private key format. Must be 64 hex characters (with or without 0x prefix)'
          }
          return true
        },
      })

      if (!key) {
        console.log(colors.info('\nCancelled.'))
        return
      }

      const privateKey = (key.startsWith('0x') ? key : `0x${key}`) as Hex
      const address = wallet.deriveAddress(privateKey)

      // Confirm
      console.log('')
      console.log(colors.dim('  Derived address: ') + colors.accent(address))

      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: 'Save this key to .env?',
        initial: true,
      })

      if (!confirm) {
        console.log(colors.info('\nCancelled.'))
        return
      }

      // Read existing and merge
      const existing = readEnvFile(envPath)
      existing.TEMPO_PRIVATE_KEY = privateKey
      writeEnvFile(existing, envPath)

      console.log(colors.success('\n✓ Private key updated in .env'))
      console.log('')
    })

  // Set network
  cmd
    .command('set-network')
    .description('Update network configuration')
    .argument('[network]', 'Network (mainnet or testnet)')
    .action(async (network?: string) => {
      const envPath = join(process.cwd(), '.env')

      if (!network) {
        const { selectedNetwork } = await prompts({
          type: 'select',
          name: 'selectedNetwork',
          message: 'Select network:',
          choices: [
            { title: 'Mainnet', value: 'mainnet' },
            { title: 'Testnet', value: 'testnet' },
          ],
        })

        if (!selectedNetwork) {
          console.log(colors.info('\nCancelled.'))
          return
        }

        network = selectedNetwork
      }

      if (network !== 'mainnet' && network !== 'testnet') {
        console.error(colors.error('Invalid network. Use "mainnet" or "testnet"'))
        process.exit(1)
      }

      const existing = readEnvFile(envPath)
      existing.TEMPO_NETWORK = network
      writeEnvFile(existing, envPath)

      console.log(colors.success(`\n✓ Network set to ${network}`))
      console.log('')
    })

  // Interactive config menu
  cmd
    .action(async () => {
      const { action } = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to configure?',
        choices: [
          { title: 'View current configuration', value: 'show' },
          { title: 'Update private key', value: 'set-key' },
          { title: 'Change network', value: 'set-network' },
        ],
      })

      if (!action) {
        return
      }

      // Find and execute the subcommand
      const subCmd = cmd.commands.find((c) => c.name() === action)
      if (subCmd) {
        await subCmd.parseAsync([], { from: 'user' })
      }
    })

  return cmd
}
