const DEFAULT_BASE = 'https://rapidin.yego.pro/admin/login';

export function getFinanciatorBaseUrl(): string {
  const raw = import.meta.env.VITE_FINANCIATOR_URL as string | undefined;
  return (raw && raw.trim()) || DEFAULT_BASE;
}

export function getFinanciatorOrigin(): string {
  try {
    return new URL(getFinanciatorBaseUrl()).origin;
  } catch {
    return DEFAULT_BASE;
  }
}

export function buildFinanciatorUrl(): string {
  return getFinanciatorBaseUrl().replace(/\/$/, '');
}
