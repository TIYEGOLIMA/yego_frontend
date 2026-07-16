export type TicketeraErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN'

export class TicketeraError extends Error {
  constructor(
    public readonly code: TicketeraErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'TicketeraError'
  }
}

export function getTicketeraErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage
  return error instanceof Error && error.message ? error.message : fallback
}

export function getTicketeraErrorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

export function isCancelledRequest(error: unknown): boolean {
  const value = error as { name?: string; code?: string }
  return value.name === 'CanceledError' || value.name === 'AbortError' || value.code === 'ERR_CANCELED'
}
