/**
 * Normalizes a raw meal-plan value from the tarifario (e.g. "Buffet", "All Inclusive")
 * into a clean display string for proposals, PDFs, WhatsApp, and the UI.
 *
 * Returns "" when the value indicates no meal plan (so callers can skip rendering).
 */
export function formatRegimen(raw: string | null | undefined): string {
  if (!raw) return "";

  const s = raw.trim();
  if (!s) return "";

  const lo = s.toLowerCase();

  // ── Negative / suppress ──────────────────────────────────────────
  if (
    lo === "no" ||
    lo === "n/a" ||
    lo === "ninguno" ||
    lo === "ninguna" ||
    lo === "sin régimen" ||
    lo === "sin regimen" ||
    lo === "sin desayuno" ||
    lo === "no incluido" ||
    lo === "no incluye" ||
    lo === "solo alojamiento" ||
    lo === "room only" ||
    lo === "incluido" // generic "Incluido" from old Tarifas select — ambiguous, suppress
  ) {
    return "";
  }

  // ── Already well-formed (user typed a complete phrase) ───────────
  if (
    lo.startsWith("incluye ") ||
    lo.startsWith("todo incluido") ||
    lo.startsWith("alimentación completa") ||
    lo.startsWith("alimentacion completa") ||
    lo.startsWith("desayuno ") ||
    lo.startsWith("desayuno buffet") ||
    lo.startsWith("desayuno continental")
  ) {
    return s;
  }

  // ── All-inclusive ────────────────────────────────────────────────
  if (lo.includes("all inclusive") || lo.includes("all-inclusive") || lo === "todo incluido") {
    return "Todo incluido";
  }

  // ── Alimentación completa ────────────────────────────────────────
  if (lo.includes("alimentaci") && lo.includes("completa")) {
    return "Alimentación completa incluida";
  }

  // ── Breakfast keywords ───────────────────────────────────────────
  if (lo.includes("buffet")) {
    return "Incluye desayuno buffet";
  }

  if (lo.includes("continental")) {
    return "Incluye desayuno continental";
  }

  if (lo === "desayuno" || lo === "con desayuno" || lo === "breakfast") {
    return "Desayuno incluido";
  }

  // ── Raw value contains "desayuno" but didn't match above ─────────
  if (lo.includes("desayuno")) {
    // Avoid double "Incluye" prefix
    if (lo.includes("incluye") || lo.includes("incluido")) {
      return s;
    }
    return `Incluye ${s.charAt(0).toLowerCase() + s.slice(1)}`;
  }

  // ── Fallback: return as-is (custom free-text) ────────────────────
  return s;
}
