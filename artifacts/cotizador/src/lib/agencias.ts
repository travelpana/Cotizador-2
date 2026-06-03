export interface Agencia {
  id: string;
  nombre: string;
  logoUrl?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  predeterminada?: boolean;
}

export interface AgenteAgencia {
  id: string;
  agenciaId: string;
  nombre: string;
  correo?: string;
  telefono?: string;
}

const STORAGE_KEY = "rge.agencias";
const AGENTES_KEY = "rge.agentes";

export function loadAgencias(): Agencia[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Agencia[]) : [];
  } catch {
    return [];
  }
}

export function saveAgencias(list: Agencia[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getAgenciaByNombre(nombre: string): Agencia | undefined {
  if (!nombre?.trim()) return undefined;
  const q = nombre.trim().toLowerCase();
  return loadAgencias().find((a) => a.nombre.toLowerCase() === q);
}

export function getAgenciaPredeterminada(): Agencia | undefined {
  return loadAgencias().find((a) => a.predeterminada === true);
}

export function loadAgentes(): AgenteAgencia[] {
  try {
    const raw = localStorage.getItem(AGENTES_KEY);
    return raw ? (JSON.parse(raw) as AgenteAgencia[]) : [];
  } catch {
    return [];
  }
}

export function saveAgentes(list: AgenteAgencia[]): void {
  localStorage.setItem(AGENTES_KEY, JSON.stringify(list));
}

export function getAgentesByAgenciaId(agenciaId: string): AgenteAgencia[] {
  return loadAgentes().filter((a) => a.agenciaId === agenciaId);
}

// ─── Counters ─────────────────────────────────────────────────────────────────

export interface Counter {
  id: string;
  nombre: string;
}

const COUNTERS_KEY = "rge.counters";

export function loadCounters(): Counter[] {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY);
    return raw ? (JSON.parse(raw) as Counter[]) : [];
  } catch {
    return [];
  }
}

export function saveCounters(list: Counter[]): void {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(list));
}

/** Extract unique counter names from saved quotes as fallback suggestions */
export function loadCounterSuggestions(): string[] {
  const dedicated = loadCounters().map((c) => c.nombre);
  if (dedicated.length > 0) return dedicated;
  try {
    const raw = localStorage.getItem("cotizador.guardadas");
    if (!raw) return [];
    const items = JSON.parse(raw) as Array<{ counterName?: string }>;
    const unique = Array.from(
      new Set(items.map((i) => i.counterName ?? "").filter(Boolean))
    );
    return unique;
  } catch {
    return [];
  }
}
