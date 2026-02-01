import type { Address } from 'viem'

// ============================================================================
// Contract Addresses
// ============================================================================

export const Contracts = {
  TIP20_FACTORY: '0x20fc000000000000000000000000000000000000' as Address,
  STABLECOIN_DEX: '0xdec0000000000000000000000000000000000000' as Address,
  FEE_MANAGER: '0xfeec000000000000000000000000000000000000' as Address,
  ACCOUNT_KEYCHAIN: '0xAAAAAAAA00000000000000000000000000000000' as Address,
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  FEE_AMM: '0xfee0000000000000000000000000000000000000' as Address,
  POLICY_REGISTRY: '0x403000000000000000000000000000000000000' as Address,
  REWARDS_DISTRIBUTOR: '0xreee000000000000000000000000000000000000' as Address,
} as const

// ============================================================================
// Known Tokens
// ============================================================================

export const KnownTokens = {
  pathUSD: '0x20c0000000000000000000000000000000000000' as Address,
  AlphaUSD: '0x20c0000000000000000000000000000000000001' as Address,
} as const

export const KnownTokensList: Address[] = Object.values(KnownTokens)

export const TokenSymbols: Record<Address, string> = {
  [KnownTokens.pathUSD]: 'pathUSD',
  [KnownTokens.AlphaUSD]: 'AlphaUSD',
}

// ============================================================================
// Network Configuration
// ============================================================================

export const Networks = {
  mainnet: {
    rpcUrl: 'https://rpc.tempo.xyz',
    explorerUrl: 'https://explorer.tempo.xyz',
    chainId: 1, // Update with actual chain ID
  },
  testnet: {
    rpcUrl: 'https://rpc.testnet.tempo.xyz',
    explorerUrl: 'https://explorer.testnet.tempo.xyz',
    chainId: 2, // Update with actual chain ID
  },
} as const

// ============================================================================
// Default Values
// ============================================================================

export const Defaults = {
  DECIMALS: 6,
  GAS_LIMIT: 500_000n,
  SLIPPAGE_BPS: 50, // 0.5%
  ORDER_EXPIRY_HOURS: 24,
} as const

// ============================================================================
// ABIs
// ============================================================================

export const Abis = {
  tip20: [
    {
      type: 'function',
      name: 'name',
      inputs: [],
      outputs: [{ type: 'string' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'symbol',
      inputs: [],
      outputs: [{ type: 'string' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'decimals',
      inputs: [],
      outputs: [{ type: 'uint8' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'totalSupply',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'allowance',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'transferWithMemo',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'memo', type: 'bytes32' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'mint',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'burn',
      inputs: [{ name: 'amount', type: 'uint256' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'hasRole',
      inputs: [
        { name: 'role', type: 'bytes32' },
        { name: 'account', type: 'address' },
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'grantRole',
      inputs: [
        { name: 'role', type: 'bytes32' },
        { name: 'account', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'revokeRole',
      inputs: [
        { name: 'role', type: 'bytes32' },
        { name: 'account', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'Approval',
      inputs: [
        { name: 'owner', type: 'address', indexed: true },
        { name: 'spender', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    },
  ],

  feeManager: [
    {
      type: 'function',
      name: 'getFeeToken',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'setFeeToken',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getSupportedTokens',
      inputs: [],
      outputs: [{ type: 'address[]' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getFeeRate',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ],

  accountKeychain: [
    {
      type: 'function',
      name: 'authorizeAccessKey',
      inputs: [
        { name: 'accessKey', type: 'address' },
        { name: 'permissions', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'revokeAccessKey',
      inputs: [{ name: 'accessKey', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getAccessKey',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'accessKey', type: 'address' },
      ],
      outputs: [
        { name: 'permissions', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'isActive', type: 'bool' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getAccessKeys',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ type: 'address[]' }],
      stateMutability: 'view',
    },
  ],

  stablecoinDex: [
    {
      type: 'function',
      name: 'swap',
      inputs: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'minAmountOut', type: 'uint256' },
        { name: 'recipient', type: 'address' },
      ],
      outputs: [{ name: 'amountOut', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getQuote',
      inputs: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
      ],
      outputs: [{ name: 'amountOut', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'placeOrder',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'tick', type: 'int24' },
        { name: 'isBuy', type: 'bool' },
      ],
      outputs: [{ name: 'orderId', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'cancelOrder',
      inputs: [{ name: 'orderId', type: 'uint256' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getOrder',
      inputs: [{ name: 'orderId', type: 'uint256' }],
      outputs: [
        { name: 'owner', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'tick', type: 'int24' },
        { name: 'isBuy', type: 'bool' },
        { name: 'filled', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
  ],

  feeAmm: [
    {
      type: 'function',
      name: 'mintLiquidity',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: 'liquidity', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'burnLiquidity',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'liquidity', type: 'uint256' },
      ],
      outputs: [{ name: 'amount', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getLiquidity',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'provider', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getTotalLiquidity',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ],

  policyRegistry: [
    {
      type: 'function',
      name: 'createPolicy',
      inputs: [
        { name: 'name', type: 'string' },
        { name: 'rules', type: 'bytes' },
      ],
      outputs: [{ name: 'policyId', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getPolicy',
      inputs: [{ name: 'policyId', type: 'uint256' }],
      outputs: [
        { name: 'name', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'rules', type: 'bytes' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'setTransferPolicy',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'policyId', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getTransferPolicy',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ name: 'policyId', type: 'uint256' }],
      stateMutability: 'view',
    },
  ],

  rewardsDistributor: [
    {
      type: 'function',
      name: 'distributeReward',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'recipients', type: 'address[]' },
        { name: 'amounts', type: 'uint256[]' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'claimRewards',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ name: 'amount', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getClaimable',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'account', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'setRewardRecipient',
      inputs: [{ name: 'recipient', type: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],

  multicall3: [
    {
      type: 'function',
      name: 'aggregate3',
      inputs: [
        {
          name: 'calls',
          type: 'tuple[]',
          components: [
            { name: 'target', type: 'address' },
            { name: 'allowFailure', type: 'bool' },
            { name: 'callData', type: 'bytes' },
          ],
        },
      ],
      outputs: [
        {
          name: 'returnData',
          type: 'tuple[]',
          components: [
            { name: 'success', type: 'bool' },
            { name: 'returnData', type: 'bytes' },
          ],
        },
      ],
      stateMutability: 'payable',
    },
  ],
} as const

// ============================================================================
// Role Constants
// ============================================================================

export const Roles = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
  BURNER_ROLE: '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848',
  PAUSER_ROLE: '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
} as const
