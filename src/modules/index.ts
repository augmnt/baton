// Export all modules
export * as chain from './chain.js'
export * as wallet from './wallet.js'
export * as account from './account.js'
export * as token from './token.js'
export * as history from './history.js'
export * as dex from './dex.js'
export * as fees from './fees.js'
export * as feeAmm from './fee-amm.js'
export * as keychain from './keychain.js'
export * as policy from './policy.js'
export * as rewards from './rewards.js'
export * as faucet from './faucet.js'
export * as contracts from './contracts.js'

// Re-export commonly used functions at the top level
export {
  getBlockNumber,
  getBlock,
  getTransaction,
  getChainInfo,
  waitForTransaction,
} from './chain.js'

export {
  generateWallet,
  deriveAddress,
  deriveFromMnemonic,
} from './wallet.js'

export {
  getBalance,
  getBalances,
  getFormattedBalance,
  getNonce,
  getUserFeeToken,
  getAccountInfo,
} from './account.js'

export {
  getTokenMetadata,
  getAllowance,
  transfer,
  approve,
  mint,
  burn,
} from './token.js'

export {
  getTransferHistory,
  getIncomingTransfers,
  getOutgoingTransfers,
} from './history.js'

export {
  getSwapQuote,
  swap,
  placeOrder,
  cancelOrder,
  getOrder,
} from './dex.js'

export {
  getFeeToken,
  setFeeToken,
  getSupportedFeeTokens,
} from './fees.js'

export {
  getLiquidity,
  getTotalLiquidity,
  mintFeeLiquidity,
  burnFeeLiquidity,
} from './fee-amm.js'

export {
  getAccessKey,
  getAccessKeys,
  authorizeAccessKey,
  revokeAccessKey,
} from './keychain.js'

export {
  getPolicy,
  getTransferPolicy,
  createPolicy,
  setTransferPolicy,
} from './policy.js'

export {
  getClaimableRewards,
  distributeReward,
  claimRewards,
  setRewardRecipient,
} from './rewards.js'

export {
  fundAddress,
  isFaucetAvailable,
  getFaucetInfo,
} from './faucet.js'

export {
  readContract,
  writeContract,
  isContract,
} from './contracts.js'
