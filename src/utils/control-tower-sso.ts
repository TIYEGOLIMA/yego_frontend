/**
 * URLs para abrir Control Tower con la misma sesión JWT que Integral.
 * Control Tower debe leer en el cliente, por ejemplo en /login:
 *   const p = new URLSearchParams(window.location.hash.slice(1));
 *   const t = p.get('access_token');
 *   if (t) { localStorage.setItem('token', t); ... }
 * Y opcionalmente escuchar: window.addEventListener('message', ...) con type YEGO_INTEGRAL_SSO.
 */

const DEFAULT_BASE = 'http://5.161.86.63';

export function getControlTowerBaseUrl(): string {
  const raw = import.meta.env.VITE_CONTROL_TOWER_URL as string | undefined;
  return (raw && raw.trim()) || DEFAULT_BASE;
}

export function getControlTowerOrigin(): string {
  try {
    return new URL(getControlTowerBaseUrl()).origin;
  } catch {
    return DEFAULT_BASE;
  }
}

/** Login de CT con token en hash (no se envía en la petición HTTP al servidor). */
export function buildControlTowerSsoLoginUrl(accessToken: string): string {
  const base = getControlTowerBaseUrl().replace(/\/$/, '');
  const hash = `access_token=${encodeURIComponent(accessToken)}&from=integral`;
  return `${base}/login#${hash}`;
}

export const INTEGRAL_SSO_MESSAGE_TYPE = 'YEGO_INTEGRAL_SSO' as const;
