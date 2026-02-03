import type { Address } from 'viem'
import { getPublicClient } from '../lib/client.js'
import { Abis, Contracts, KnownTokensList, TokenSymbols } from '../lib/constants.js'
import type { AccountInfo, TokenBalance } from '../lib/types.js'
import { formatAmount, validateAddress } from '../lib/utils.js'

// Extended TokenBalance type that includes query status
export interface TokenBalanceWithStatus extends TokenBalance {
  queryStatus: 'success' | 'failed'
}

/**
 * Get the balance of a specific token for an address
 */
export async function getBalance(token: Address, address: Address): Promise<bigint> {
  const client = getPublicClient()

  const balance = await client.readContract({
    address: validateAddress(token),
    abi: Abis.tip20,
    functionName: 'balanceOf',
    args: [validateAddress(address)],
  })

  return balance as bigint
}

/**
 * Get formatted balance of a specific token
 */
export async function getFormattedBalance(
  token: Address,
  address: Address
): Promise<TokenBalance> {
  const client = getPublicClient()
  const validToken = validateAddress(token)
  const validAddress = validateAddress(address)

  // Get balance and symbol in parallel
  const [balance, symbol] = await Promise.all([
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'balanceOf',
      args: [validAddress],
    }) as Promise<bigint>,
    client.readContract({
      address: validToken,
      abi: Abis.tip20,
      functionName: 'symbol',
    }) as Promise<string>,
  ])

  return {
    token: validToken,
    symbol,
    balance,
    formatted: formatAmount(balance),
  }
}

/**
 * Get balances of all known tokens for an address using Multicall3
 */
export async function getBalances(address: Address): Promise<TokenBalanceWithStatus[]> {
  const client = getPublicClient()
  const validAddress = validateAddress(address)

  // Use multicall to get all balances in a single RPC call
  const results = await client.multicall({
    contracts: KnownTokensList.flatMap((token) => [
      {
        address: token,
        abi: Abis.tip20,
        functionName: 'balanceOf',
        args: [validAddress],
      },
      {
        address: token,
        abi: Abis.tip20,
        functionName: 'symbol',
      },
    ]),
  })

  const balances: TokenBalanceWithStatus[] = []

  for (let i = 0; i < KnownTokensList.length; i++) {
    const balanceResult = results[i * 2]
    const symbolResult = results[i * 2 + 1]

    const balanceQueryFailed = balanceResult.status !== 'success'
    const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n
    const symbol =
      symbolResult.status === 'success'
        ? (symbolResult.result as string)
        : TokenSymbols[KnownTokensList[i]] || 'UNKNOWN'

    balances.push({
      token: KnownTokensList[i],
      symbol,
      balance,
      formatted: formatAmount(balance),
      queryStatus: balanceQueryFailed ? 'failed' : 'success',
    })
  }

  return balances
}

/**
 * Get balances for specific tokens using Multicall3
 */
export async function getTokenBalances(
  address: Address,
  tokens: Address[]
): Promise<TokenBalanceWithStatus[]> {
  const client = getPublicClient()
  const validAddress = validateAddress(address)
  const validTokens = tokens.map(validateAddress)

  // Use multicall to get all balances and symbols in a single RPC call
  const results = await client.multicall({
    contracts: validTokens.flatMap((token) => [
      {
        address: token,
        abi: Abis.tip20,
        functionName: 'balanceOf',
        args: [validAddress],
      },
      {
        address: token,
        abi: Abis.tip20,
        functionName: 'symbol',
      },
    ]),
  })

  const balances: TokenBalanceWithStatus[] = []

  for (let i = 0; i < validTokens.length; i++) {
    const balanceResult = results[i * 2]
    const symbolResult = results[i * 2 + 1]

    const balanceQueryFailed = balanceResult.status !== 'success'
    const balance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : 0n
    const symbol =
      symbolResult.status === 'success'
        ? (symbolResult.result as string)
        : TokenSymbols[validTokens[i]] || 'UNKNOWN'

    balances.push({
      token: validTokens[i],
      symbol,
      balance,
      formatted: formatAmount(balance),
      queryStatus: balanceQueryFailed ? 'failed' : 'success',
    })
  }

  return balances
}

/**
 * Get the transaction nonce for an address
 */
export async function getNonce(address: Address): Promise<bigint> {
  const client = getPublicClient()
  const nonce = await client.getTransactionCount({
    address: validateAddress(address),
  })
  return BigInt(nonce)
}

/**
 * Get the fee token for an account
 */
export async function getUserFeeToken(address: Address): Promise<Address | null> {
  const client = getPublicClient()

  try {
    const feeToken = await client.readContract({
      address: Contracts.FEE_MANAGER,
      abi: Abis.feeManager,
      functionName: 'getFeeToken',
      args: [validateAddress(address)],
    })

    // Return null if zero address
    if (feeToken === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return feeToken as Address
  } catch {
    return null
  }
}

/**
 * Get complete account information
 */
export async function getAccountInfo(address: Address): Promise<AccountInfo> {
  const validAddress = validateAddress(address)

  const [nonce, feeToken] = await Promise.all([
    getNonce(validAddress),
    getUserFeeToken(validAddress),
  ])

  return {
    address: validAddress,
    nonce,
    feeToken,
  }
}

/**
 * Check if an address has any balance of known tokens
 */
export async function hasAnyBalance(address: Address): Promise<boolean> {
  const balances = await getBalances(address)
  return balances.some((b) => b.balance > 0n)
}

/**
 * Get all non-zero balances for an address
 */
export async function getNonZeroBalances(address: Address): Promise<TokenBalanceWithStatus[]> {
  const balances = await getBalances(address)
  return balances.filter((b) => b.balance > 0n)
}
