/**
 * Utilitários para classes CSS com Tailwind
 * Combina classes com conflito de forma inteligente
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

















