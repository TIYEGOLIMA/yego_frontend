const DEFAULT_BASE = 'https://betaleads.yego.pro/login';

export function getControlLoopBaseUrl(): string {
  const raw = import.meta.env.VITE_CONTROL_LOOP_URL as string | undefined;
  return (raw && raw.trim()) || DEFAULT_BASE;
}

export function getControlLoopOrigin(): string {
  try {
    return new URL(getControlLoopBaseUrl()).origin;
  } catch {
    return DEFAULT_BASE;
  }
}

/** URL directa a Control Loop sin token. */
export function buildControlLoopUrl(): string {
  return getControlLoopBaseUrl().replace(/\/$/, '');
}
