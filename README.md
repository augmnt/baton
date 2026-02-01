# Baton

CLI toolkit and MCP server for the Tempo blockchain.

## Features

- **~95 MCP Tools** - Complete blockchain operations accessible via Model Context Protocol
- **CLI Interface** - Command-line interface for all operations
- **TIP-20 Token Operations** - Transfer, approve, mint, burn, and role management
- **DEX Integration** - Swap, limit orders, and price calculations
- **Account Management** - Balances, nonces, fee tokens
- **Access Key Management** - Authorize and revoke access keys
- **Policy System** - Create and manage transfer policies (TIP-403)
- **Rewards Distribution** - Claim and distribute rewards
- **Testnet Faucet** - Fund addresses on testnet

## Installation

```bash
npm install baton
```

Or clone and build:

```bash
git clone <repo>
cd baton
npm install
npm run build
```

## Configuration

Create a `.env` file or set environment variables:

```bash
# Private key for signing transactions (required for write operations)
TEMPO_PRIVATE_KEY=0x...

# RPC endpoint (defaults to Tempo Moderato mainnet)
TEMPO_RPC_URL=https://rpc.tempo.xyz

# Block explorer URL
TEMPO_EXPLORER_URL=https://explorer.tempo.xyz

# Network: mainnet or testnet
TEMPO_NETWORK=mainnet
```

## CLI Usage

### Wallet Operations

```bash
# Generate a new wallet
baton wallet new

# Generate with mnemonic
baton wallet new --mnemonic

# Derive address from private key
baton wallet derive <privateKey>

# Derive from mnemonic
baton wallet from-mnemonic "word1 word2 ..."
```

### Account Operations

```bash
# Get all balances
baton balances <address>

# Get specific token balance
baton account balance <address> --token <tokenAddress>

# Get account info
baton account info <address>

# Get nonce
baton account nonce <address>
```

### Token Operations

```bash
# Get token info
baton token info <tokenAddress>

# Transfer tokens
baton token transfer <tokenAddress> <to> <amount>

# Transfer with memo
baton token transfer <tokenAddress> <to> <amount> --memo "Payment for services"

# Approve spender
baton token approve <tokenAddress> <spender> <amount>

# Get allowance
baton token allowance <tokenAddress> <owner> <spender>

# Mint tokens (requires MINTER_ROLE)
baton token mint <tokenAddress> <to> <amount>

# Burn tokens
baton token burn <tokenAddress> <amount>
```

### DEX Operations

```bash
# Get swap quote
baton dex quote <tokenIn> <tokenOut> <amountIn>

# Execute swap
baton dex swap <tokenIn> <tokenOut> <amountIn>

# Place limit order
baton dex order <token> <amount> <tick> --buy
baton dex order <token> <amount> <tick> --sell

# Cancel order
baton dex cancel <orderId>

# Get order info
baton dex order-info <orderId>

# Price utilities
baton dex price --tick 100
baton dex price --price 1.01
```

### Chain Operations

```bash
# Get chain info
baton chain info

# Get block number
baton chain block-number

# Get block
baton chain block <blockNumber>

# Get transaction
baton chain tx <txHash>
```

### Faucet (Testnet)

```bash
# Fund address
baton faucet fund <address>

# Check faucet status
baton faucet status

# Check cooldown
baton faucet cooldown <address>
```

### Global Options

```bash
# Use testnet
baton --network testnet <command>

# Use custom RPC
baton --rpc https://custom-rpc.example.com <command>

# JSON output
baton <command> -o json
```

## MCP Server

### Starting the Server

```bash
baton mcp
```

### Integration with Claude Code

```bash
claude mcp add baton -- npx baton mcp
```

### Available Tools

The MCP server provides ~95 tools organized by domain:

| Domain | Tools | Description |
|--------|-------|-------------|
| Chain | 5 | Block and transaction queries |
| Wallet | 6 | Wallet generation and derivation |
| Account | 7 | Balance and account info |
| Token | 12 | TIP-20 token operations |
| DEX | 10 | Swap and order management |
| Fees | 8 | Fee token management |
| Fee AMM | 5 | Fee liquidity operations |
| Keychain | 9 | Access key management |
| Policy | 8 | Transfer policy management |
| Rewards | 7 | Rewards distribution |
| History | 4 | Transfer history |
| Faucet | 5 | Testnet faucet |
| Contracts | 8 | Generic contract operations |
| Utils | 10 | Utility functions |

### Resources

- `tempo://tokens/known` - Known token addresses
- `tempo://contracts/addresses` - Contract addresses
- `tempo://contracts/abis/tip20` - TIP-20 ABI
- `tempo://config/network` - Current network config

### Prompts

- `transfer-tokens` - Guided token transfer workflow
- `swap-tokens` - Guided swap workflow
- `check-account` - Complete account overview
- `new-wallet` - Generate and fund new wallet

## Programmatic Usage

```typescript
import {
  generateWallet,
  getBalances,
  transfer,
  getSwapQuote,
  swap,
} from 'baton'

// Generate wallet
const wallet = generateWallet()
console.log(wallet.address)

// Get balances
const balances = await getBalances('0x...')

// Transfer tokens
const result = await transfer({
  token: '0x20c0000000000000000000000000000000000001',
  to: '0x...',
  amount: 100000000n, // 100 tokens (6 decimals)
})

// Swap tokens
const quote = await getSwapQuote({
  tokenIn: '0x20c0000000000000000000000000000000000000',
  tokenOut: '0x20c0000000000000000000000000000000000001',
  amountIn: 100000000n,
})

const swapResult = await swap({
  tokenIn: '0x20c0000000000000000000000000000000000000',
  tokenOut: '0x20c0000000000000000000000000000000000001',
  amountIn: 100000000n,
})
```

## Key Concepts

### 6 Decimal Places

All TIP-20 tokens use 6 decimal places. Amounts in the CLI are human-readable:

```bash
# Transfer 100.5 tokens
baton token transfer <token> <to> 100.5
```

In code, use the smallest unit:

```typescript
import { parseAmount, formatAmount } from 'baton'

const amount = parseAmount('100.5') // 100500000n
const formatted = formatAmount(100500000n) // "100.5"
```

### Memo Encoding

Memos are encoded as bytes32:

```bash
# String memo (max 31 chars)
baton token transfer <token> <to> 100 --memo "Payment"

# Or hex bytes32
baton token transfer <token> <to> 100 --memo "0x..."
```

### Tick Pricing

DEX prices use tick values:

```typescript
import { priceToTick, tickToPrice } from 'baton'

const tick = priceToTick(1.0001) // Get tick for price
const price = tickToPrice(100)   // Get price from tick
```

## Known Tokens

| Token | Address |
|-------|---------|
| pathUSD | `0x20c0000000000000000000000000000000000000` |
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |

## Contract Addresses

| Contract | Address |
|----------|---------|
| TIP20_FACTORY | `0x20fc000000000000000000000000000000000000` |
| STABLECOIN_DEX | `0xdec0000000000000000000000000000000000000` |
| FEE_MANAGER | `0xfeec000000000000000000000000000000000000` |
| ACCOUNT_KEYCHAIN | `0xAAAAAAAA00000000000000000000000000000000` |

## Security

- **Never share your private key**
- Private keys are read from `TEMPO_PRIVATE_KEY` environment variable
- Keys are never logged or stored
- Use access keys for delegated permissions

## License

MIT
