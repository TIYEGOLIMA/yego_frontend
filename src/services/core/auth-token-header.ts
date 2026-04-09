import type { AxiosResponse } from 'axios'

/** Lee el JWT enviado por el backend en {@code X-Access-Token} (no va en el body). */
export function getAccessTokenFromResponse(response: AxiosResponse): string | undefined {
  const h = response.headers
  if (!h) return undefined
  const ax = h as { get?: (key: string) => string | undefined } & Record<string, string | undefined>
  const v =
    typeof ax.get === 'function'
      ? ax.get('x-access-token') ?? ax.get('X-Access-Token')
      : ax['x-access-token'] ?? ax['X-Access-Token']
  return typeof v === 'string' && v.length > 0 ? v : undefined
}
