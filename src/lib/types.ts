import type { Address, Hash, Hex } from 'viem'

// ============================================================================
// Core Types
// ============================================================================

export type TokenAddress = Address
export type AccountAddress = Address
export type TransactionHash = Hash

export interface TokenMetadata {
  address: TokenAddress
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}

export interface TokenBalance {
  token: TokenAddress
  symbol: string
  balance: bigint
  formatted: string
}

export interface TransactionResult {
  success: boolean
  transactionHash: TransactionHash
  blockNumber: bigint
  explorerUrl: string
}

// ============================================================================
// Account Types
// ============================================================================

export interface AccountInfo {
  address: AccountAddress
  nonce: bigint
  feeToken: TokenAddress | null
}

export interface GeneratedWallet {
  address: AccountAddress
  privateKey: Hex
  mnemonic?: string
}

// ============================================================================
// Token Operation Types
// ============================================================================

export interface TransferParams {
  token: TokenAddress
  to: AccountAddress
  amount: bigint
  memo?: Hex
}

export interface BatchTransferParams {
  token: TokenAddress
  transfers: Array<{
    to: AccountAddress
    amount: bigint
    memo?: Hex
  }>
}

export interface ApprovalParams {
  token: TokenAddress
  spender: AccountAddress
  amount: bigint
}

export interface MintParams {
  token: TokenAddress
  to: AccountAddress
  amount: bigint
}

export interface BurnParams {
  token: TokenAddress
  amount: bigint
}

// ============================================================================
// DEX Types
// ============================================================================

export interface SwapParams {
  tokenIn: TokenAddress
  tokenOut: TokenAddress
  amountIn: bigint
  minAmountOut?: bigint
  recipient?: AccountAddress
}

export interface SwapQuote {
  tokenIn: TokenAddress
  tokenOut: TokenAddress
  amountIn: bigint
  amountOut: bigint
  priceImpact: number
  route: TokenAddress[]
}

export interface OrderParams {
  token: TokenAddress
  amount: bigint
  tick: number
  isBuy: boolean
}

export interface OrderInfo {
  orderId: bigint
  owner: AccountAddress
  token: TokenAddress
  amount: bigint
  tick: number
  isBuy: boolean
  filled: bigint
}

// ============================================================================
// Fee Types
// ============================================================================

export interface FeeTokenInfo {
  token: TokenAddress
  symbol: string
  rate: bigint
}

export interface FeeLiquidityParams {
  token: TokenAddress
  amount: bigint
}

// ============================================================================
// Keychain Types
// ============================================================================

export interface AccessKeyParams {
  accessKey: AccountAddress
  permissions: AccessKeyPermissions
  expiry?: bigint
}

export interface AccessKeyPermissions {
  canTransfer: boolean
  canApprove: boolean
  canManageKeys: boolean
  allowedTokens: TokenAddress[]
}

export interface AccessKeyInfo {
  accessKey: AccountAddress
  owner: AccountAddress
  permissions: AccessKeyPermissions
  expiry: bigint
  isActive: boolean
}

// ============================================================================
// Policy Types (TIP-403)
// ============================================================================

export interface PolicyParams {
  policyId: bigint
  name: string
  rules: PolicyRule[]
}

export interface PolicyRule {
  ruleType: PolicyRuleType
  value: bigint | AccountAddress
}

export type PolicyRuleType =
  | 'MAX_AMOUNT'
  | 'DAILY_LIMIT'
  | 'ALLOWED_RECIPIENTS'
  | 'BLOCKED_RECIPIENTS'
  | 'TIME_LOCK'

export interface TransferPolicyParams {
  token: TokenAddress
  policyId: bigint
}

// ============================================================================
// Rewards Types
// ============================================================================

export interface RewardDistribution {
  token: TokenAddress
  recipients: AccountAddress[]
  amounts: bigint[]
}

export interface RewardInfo {
  token: TokenAddress
  claimable: bigint
  totalEarned: bigint
  lastClaimTime: bigint
}

// ============================================================================
// History Types
// ============================================================================

export interface TransferEvent {
  token: TokenAddress
  from: AccountAddress
  to: AccountAddress
  amount: bigint
  memo: Hex | null
  transactionHash: TransactionHash
  blockNumber: bigint
  timestamp: bigint
}

export interface TransactionInfo {
  hash: TransactionHash
  from: AccountAddress
  to: AccountAddress | null
  value: bigint
  data: Hex
  blockNumber: bigint
  timestamp: bigint
  status: 'success' | 'failed' | 'pending'
}

// ============================================================================
// Chain Types
// ============================================================================

export interface BlockInfo {
  number: bigint
  hash: Hash
  timestamp: bigint
  transactionCount: number
}

export interface ChainInfo {
  chainId: number
  name: string
  blockNumber: bigint
  gasPrice: bigint
}

// ============================================================================
// Contract Types
// ============================================================================

export interface ContractCallParams {
  address: Address
  abi: unknown[]
  functionName: string
  args?: unknown[]
}

export interface ContractWriteParams extends ContractCallParams {
  value?: bigint
}

// ============================================================================
// Config Types
// ============================================================================

export interface BatonConfig {
  rpcUrl: string
  explorerUrl: string
  network: 'mainnet' | 'testnet'
  privateKey?: Hex
}

// ============================================================================
// MCP Response Types
// ============================================================================

export interface McpToolResponse {
  content: Array<{
    type: 'text'
    text: string
  }>
  isError?: boolean
}
