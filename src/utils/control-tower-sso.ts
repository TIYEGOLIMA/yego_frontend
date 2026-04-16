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

/** URL directa a Control Tower sin token. */
export function buildControlTowerUrl(): string {
  return getControlTowerBaseUrl().replace(/\/$/, '');
}

export const INTEGRAL_SSO_MESSAGE_TYPE = 'YEGO_INTEGRAL_SSO' as const;
