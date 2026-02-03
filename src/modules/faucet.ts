import type { Address } from 'viem'
import { getPublicClient } from '../lib/client.js'
import { buildExplorerTxUrl } from '../lib/config.js'
import type { FaucetResult } from '../lib/types.js'
import { validateAddress } from '../lib/utils.js'

// Type for custom RPC request with unknown method
interface CustomRpcRequest {
  method: string
  params?: unknown[]
}

/**
 * Fund an address via the testnet faucet
 * Uses the tempo_fundAddress RPC method which returns an array of transaction hashes,
 * one for each token funded (pathUSD, AlphaUSD, BetaUSD, ThetaUSD - 1M each)
 */
export async function fundAddress(address: Address): Promise<FaucetResult> {
  const client = getPublicClient()
  const validAddress = validateAddress(address)

  try {
    // Result is an array of transaction hashes (one per token)
    const result = await (client.request as (req: CustomRpcRequest) => Promise<unknown>)({
      method: 'tempo_fundAddress',
      params: [validAddress],
    }) as string[]

    return {
      success: true,
      transactionHashes: result as `0x${string}`[],
      explorerUrls: result.map(hash => buildExplorerTxUrl(hash)),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Faucet request failed: ${message}`)
  }
}
