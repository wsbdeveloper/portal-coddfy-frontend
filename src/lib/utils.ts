/**
 * Utilitários para classes CSS com Tailwind
 * Combina classes com conflito de forma inteligente
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** URL absoluta para foto/arquivo retornado pela API (caminho relativo ou absoluto). */
export function resolveApiAssetUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const api = import.meta.env.VITE_API_URL || 'http://0.0.0.0:6543/api';
  const origin = api.replace(/\/api\/?$/, '');
  return `${origin}${u.startsWith('/') ? '' : '/'}${u}`;
}

















