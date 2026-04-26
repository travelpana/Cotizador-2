import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a traslado name from the catalog into a clean, arrow-based route.
 *
 * - Strips the leading "Traslado(s)" prefix.
 * - Replaces " – ", " — " and " - " separators with " → ".
 * - Leaves parenthetical clarifications and trailing notes untouched so we
 *   don't drop information that may matter to the client.
 */
export function formatTrasladoNombre(nombre: string | undefined | null): string {
  if (!nombre) return ""
  let s = String(nombre).trim()
  s = s.replace(/^traslados?\s+/i, "")
  s = s.replace(/\s*\/\s*one\s*way\b\.?/gi, "")
  s = s.replace(/\s*[–—-]\s*/g, " → ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}
