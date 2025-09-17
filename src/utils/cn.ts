/**
 * Utilidad para combinar clases de Tailwind de manera eficiente
 * Utiliza clsx y tailwind-merge para evitar conflictos
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina múltiples clases de Tailwind evitando conflictos
 * @param inputs Clases a combinar
 * @returns String con las clases combinadas y optimizadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}