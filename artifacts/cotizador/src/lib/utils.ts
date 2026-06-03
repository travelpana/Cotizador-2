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

// ─── Traslado personalisation ───────────────────────────────────────────────

/** Normalise a string for zone-key matching (strip accents, lowercase). */
const normZone = (s: string): string =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

const CIUDAD_KEYS   = ["ciudad de panama", "panama city", "ciudad panama"]
const PLAYA_KEYS    = [
  "riviera pacifica", "playa blanca", "farallon", "coronado",
  "buenaventura", "bijao", "santa clara", "decameron",
]
const BOCAS_KEYS    = ["bocas del toro", "bocas town", "isla colon"]
const TIERRAS_KEYS  = ["boquete", "volcan", "cerro punta", "tierras altas"]

function zoneMatch(ubicacion: string | undefined | null, keys: string[]): boolean {
  if (!ubicacion) return false
  const u = normZone(ubicacion)
  return keys.some((k) => u.includes(k))
}

function firstHotelInZone(
  hoteles: ReadonlyArray<{ nombre?: string | null; ubicacion?: string | null }>,
  keys: string[],
): string | null {
  return hoteles.find((h) => zoneMatch(h.ubicacion, keys))?.nombre ?? null
}

/**
 * Replace generic hotel placeholders in a (already-formatted) traslado name
 * with the actual hotel names present in the current quote.
 *
 * Only substitutes when a unique hotel can be identified for the zone.
 * If the hotel cannot be determined, the original text is returned unchanged.
 *
 * Recognised placeholders: "Hotel Ciudad", "Hotel Playa", "Hotel Bocas",
 * "Hotel Tierras Altas".
 *
 * @param displayName  The formatted traslado name (after formatTrasladoNombre).
 * @param hoteles      Hotel services in the current quote (tipo === "hotel").
 * @param enabled      When false the function is a no-op.
 */
export function personalizarNombreTraslado(
  displayName: string,
  hoteles: ReadonlyArray<{ nombre?: string | null; ubicacion?: string | null }>,
  enabled: boolean,
): string {
  if (!enabled || !displayName || hoteles.length === 0) return displayName

  let s = displayName

  if (/hotel\s+ciudad/i.test(s)) {
    const h = firstHotelInZone(hoteles, CIUDAD_KEYS)
    if (h) s = s.replace(/hotel\s+ciudad/gi, h)
  }

  if (/hotel\s+playa/i.test(s)) {
    // Per spec: Bocas behaves like a playa destination for this replacement
    const h = firstHotelInZone(hoteles, [...PLAYA_KEYS, ...BOCAS_KEYS])
    if (h) s = s.replace(/hotel\s+playa/gi, h)
  }

  if (/hotel\s+bocas/i.test(s)) {
    const h = firstHotelInZone(hoteles, BOCAS_KEYS)
    if (h) s = s.replace(/hotel\s+bocas/gi, h)
  }

  if (/hotel\s+tierras\s+altas/i.test(s)) {
    const h = firstHotelInZone(hoteles, TIERRAS_KEYS)
    if (h) s = s.replace(/hotel\s+tierras\s+altas/gi, h)
  }

  return s
}
