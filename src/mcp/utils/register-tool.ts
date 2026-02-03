import { getErrorMessage } from '../../lib/utils.js'

/**
 * MCP tool response type
 */
export type McpToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

/**
 * Format a successful result as MCP tool response
 */
export function formatSuccess<T>(data: T): McpToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, bigintReplacer, 2),
      },
    ],
  }
}

/**
 * Format an error as MCP tool response
 */
export function formatError(error: unknown): McpToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${getErrorMessage(error)}`,
      },
    ],
    isError: true,
  }
}

/**
 * JSON replacer that handles bigint serialization
 */
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

/**
 * Wrap an async handler with standardized error handling.
 * Returns a function that catches errors and formats them as MCP error responses.
 *
 * @param handler - Async function that processes the request and returns data
 * @returns A wrapped handler function with error handling
 *
 * @example
 * server.tool(
 *   'tempo_getBalance',
 *   'Get token balance',
 *   { address: z.string() },
 *   wrapHandler(async ({ address }) => {
 *     const balance = await getBalance(address)
 *     return { balance: balance.toString() }
 *   })
 * )
 */
export function wrapHandler<TParams, TResult>(
  handler: (params: TParams) => Promise<TResult>
): (params: TParams) => Promise<McpToolResult> {
  return async (params: TParams): Promise<McpToolResult> => {
    try {
      const result = await handler(params)
      return formatSuccess(result)
    } catch (error) {
      return formatError(error)
    }
  }
}
