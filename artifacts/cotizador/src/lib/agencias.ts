import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

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

export interface Counter {
  id: string;
  nombre: string;
}

// ─── Sync load (from React Query cache) ──────────────────────────────────────

export function loadAgencias(): Agencia[] {
  return queryClient.getQueryData<Agencia[]>(["agencias"]) ?? [];
}

export function loadAgentes(): AgenteAgencia[] {
  return queryClient.getQueryData<AgenteAgencia[]>(["agentes"]) ?? [];
}

export function loadCounters(): Counter[] {
  return queryClient.getQueryData<Counter[]>(["counters"]) ?? [];
}

// ─── Async load (from API, updates cache) ────────────────────────────────────

export async function loadAgenciasAsync(): Promise<Agencia[]> {
  const cached = queryClient.getQueryData<Agencia[]>(["agencias"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.agencias.list() as Agencia[];
    queryClient.setQueryData(["agencias"], data);
    return data;
  } catch (err) {
    console.error("[agencias] Error cargando:", err);
    return [];
  }
}

export async function loadAgentesAsync(): Promise<AgenteAgencia[]> {
  const cached = queryClient.getQueryData<AgenteAgencia[]>(["agentes"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.agentes.list() as AgenteAgencia[];
    queryClient.setQueryData(["agentes"], data);
    return data;
  } catch (err) {
    console.error("[agentes] Error cargando:", err);
    return [];
  }
}

export async function loadCountersAsync(): Promise<Counter[]> {
  const cached = queryClient.getQueryData<Counter[]>(["counters"]);
  if (cached) return cached;
  try {
    const data = await apiAuth.counters.list() as Counter[];
    queryClient.setQueryData(["counters"], data);
    return data;
  } catch (err) {
    console.error("[counters] Error cargando:", err);
    return [];
  }
}

// ─── Save individual (API + cache) ───────────────────────────────────────────

export async function saveAgencia(a: Agencia): Promise<void> {
  const list = loadAgencias();
  const next = list.some((x) => x.id === a.id)
    ? list.map((x) => (x.id === a.id ? a : x))
    : [a, ...list];
  if (a.predeterminada) {
    next.forEach((x) => { if (x.id !== a.id) x.predeterminada = false; });
  }
  queryClient.setQueryData(["agencias"], next);
  try { await apiAuth.agencias.save(a); } catch (err) { console.error(err); }
}

export async function deleteAgencia(id: string): Promise<void> {
  queryClient.setQueryData(["agencias"], loadAgencias().filter((x) => x.id !== id));
  queryClient.setQueryData(["agentes"], loadAgentes().filter((x) => x.agenciaId !== id));
  try { await apiAuth.agencias.remove(id); } catch (err) { console.error(err); }
}

export async function saveAgente(a: AgenteAgencia): Promise<void> {
  const list = loadAgentes();
  const next = list.some((x) => x.id === a.id)
    ? list.map((x) => (x.id === a.id ? a : x))
    : [...list, a];
  queryClient.setQueryData(["agentes"], next);
  try { await apiAuth.agentes.save(a); } catch (err) { console.error(err); }
}

export async function deleteAgente(id: string): Promise<void> {
  queryClient.setQueryData(["agentes"], loadAgentes().filter((x) => x.id !== id));
  try { await apiAuth.agentes.remove(id); } catch (err) { console.error(err); }
}

export async function saveCounter(c: Counter): Promise<void> {
  const list = loadCounters();
  const next = list.some((x) => x.id === c.id)
    ? list.map((x) => (x.id === c.id ? c : x))
    : [...list, c];
  queryClient.setQueryData(["counters"], next);
  try { await apiAuth.counters.save(c); } catch (err) { console.error(err); }
}

export async function deleteCounter(id: string): Promise<void> {
  queryClient.setQueryData(["counters"], loadCounters().filter((x) => x.id !== id));
  try { await apiAuth.counters.remove(id); } catch (err) { console.error(err); }
}

// ─── Bulk save (for backup import) ───────────────────────────────────────────

export async function saveAgencias(list: Agencia[]): Promise<void> {
  queryClient.setQueryData(["agencias"], list);
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: list, agentes: [] });
  } catch (err) { console.error(err); }
}

export async function saveAgentes(list: AgenteAgencia[]): Promise<void> {
  queryClient.setQueryData(["agentes"], list);
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: [], agentes: list });
  } catch (err) { console.error(err); }
}

export async function saveCounters(list: Counter[]): Promise<void> {
  queryClient.setQueryData(["counters"], list);
  try {
    for (const c of list) await apiAuth.counters.save(c);
  } catch (err) { console.error(err); }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAgenciaByNombre(nombre: string): Agencia | undefined {
  if (!nombre?.trim()) return undefined;
  const q = nombre.trim().toLowerCase();
  return loadAgencias().find((a) => a.nombre.toLowerCase() === q);
}

export function getAgenciaPredeterminada(): Agencia | undefined {
  return loadAgencias().find((a) => a.predeterminada === true);
}

export function getAgentesByAgenciaId(agenciaId: string): AgenteAgencia[] {
  return loadAgentes().filter((a) => a.agenciaId === agenciaId);
}

export function loadCounterSuggestions(): string[] {
  const dedicated = loadCounters().map((c) => c.nombre);
  if (dedicated.length > 0) return dedicated;
  const guardadas = queryClient.getQueryData<Array<{ counterName?: string }>>(["guardadas"]);
  if (!guardadas) return [];
  return Array.from(new Set(guardadas.map((i) => i.counterName ?? "").filter(Boolean)));
}
