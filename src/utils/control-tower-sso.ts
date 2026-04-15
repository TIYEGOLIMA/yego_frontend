/** Base de Control Tower; CT debe leer #access_token en /login o postMessage YEGO_INTEGRAL_SSO. */
const DEFAULT_BASE = 'https://5.161.86.63';

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
