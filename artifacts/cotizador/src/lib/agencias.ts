import { apiAuth } from "@/lib/api-auth";
import { queryClient } from "@/lib/queryClient";

const _norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

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

// ─── Async load (always from API, keeps cache fresh) ─────────────────────────

export async function loadAgenciasAsync(): Promise<Agencia[]> {
  try {
    const data = await apiAuth.agencias.list() as Agencia[];
    queryClient.setQueryData(["agencias"], data);
    return data;
  } catch (err) {
    console.error("[agencias] Error cargando:", err);
    return queryClient.getQueryData<Agencia[]>(["agencias"]) ?? [];
  }
}

export async function loadAgentesAsync(): Promise<AgenteAgencia[]> {
  try {
    const data = await apiAuth.agentes.list() as AgenteAgencia[];
    queryClient.setQueryData(["agentes"], data);
    return data;
  } catch (err) {
    console.error("[agentes] Error cargando:", err);
    return queryClient.getQueryData<AgenteAgencia[]>(["agentes"]) ?? [];
  }
}

export async function loadCountersAsync(): Promise<Counter[]> {
  try {
    const data = await apiAuth.counters.list() as Counter[];
    queryClient.setQueryData(["counters"], data);
    return data;
  } catch (err) {
    console.error("[counters] Error cargando:", err);
    return queryClient.getQueryData<Counter[]>(["counters"]) ?? [];
  }
}

// ─── Save individual (API → invalidate cache so all users see fresh data) ────

export async function saveAgencia(a: Agencia): Promise<void> {
  await apiAuth.agencias.save(a);
  await queryClient.invalidateQueries({ queryKey: ["agencias"] });
}

export async function deleteAgencia(id: string): Promise<void> {
  await apiAuth.agencias.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["agencias"] });
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function saveAgente(a: AgenteAgencia): Promise<void> {
  await apiAuth.agentes.save(a);
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function deleteAgente(id: string): Promise<void> {
  await apiAuth.agentes.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["agentes"] });
}

export async function saveCounter(c: Counter): Promise<void> {
  await apiAuth.counters.save(c);
  await queryClient.invalidateQueries({ queryKey: ["counters"] });
}

export async function deleteCounter(id: string): Promise<void> {
  await apiAuth.counters.remove(id);
  await queryClient.invalidateQueries({ queryKey: ["counters"] });
}

// ─── Bulk save (for backup import only) ──────────────────────────────────────

export async function saveAgencias(list: Agencia[]): Promise<void> {
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: list, agentes: [] });
    await queryClient.invalidateQueries({ queryKey: ["agencias"] });
  } catch (err) { console.error(err); }
}

export async function saveAgentes(list: AgenteAgencia[]): Promise<void> {
  try {
    await apiAuth.post("/agencias/bulk-sync", { agencias: [], agentes: list });
    await queryClient.invalidateQueries({ queryKey: ["agentes"] });
  } catch (err) { console.error(err); }
}

export async function saveCounters(list: Counter[]): Promise<void> {
  try {
    for (const c of list) await apiAuth.counters.save(c);
    await queryClient.invalidateQueries({ queryKey: ["counters"] });
  } catch (err) { console.error(err); }
}

// ─── Auto-sync: create/update agencia+agente from cotizador fields ────────────

/**
 * Called automatically when a quote is saved, emailed, or exported to PDF.
 * Rules:
 *  1. Agencia not found → create it.
 *  2. Agencia found, agent not found → add agent (with email).
 *  3. Agencia + agent found, email is the same → no-op.
 *  4. Agencia + agent found, email changed:
 *       - agent had no email → update silently.
 *       - agent had a different email → ask user via confirm().
 *  5. No duplicates: compare names case-insensitively, normalize whitespace.
 *  6. No duplicate emails within the same agency.
 */
export async function syncAgenciaAgenteFromCliente(
  agenciaNombreRaw: string,
  agenteNombreRaw: string,
  emailClienteRaw?: string,
): Promise<void> {
  const agenciaNombre = agenciaNombreRaw.trim();
  const agenteNombre = agenteNombreRaw.trim();
  if (!agenciaNombre || !agenteNombre) return;

  const agenciaNorm = _norm(agenciaNombre);
  const agenteNorm = _norm(agenteNombre);
  const emailNuevo = emailClienteRaw?.trim() ?? "";

  // Always fetch fresh data so we work with the latest state
  const [agencias, agentes] = await Promise.all([
    loadAgenciasAsync(),
    loadAgentesAsync(),
  ]);

  // ── 1. Find or create the agency ─────────────────────────────────────────
  let agencia = agencias.find((a) => _norm(a.nombre) === agenciaNorm);
  if (!agencia) {
    const newAgencia: Agencia = { id: `AGC-${Date.now()}`, nombre: agenciaNombre };
    await saveAgencia(newAgencia);
    const refreshed = await loadAgenciasAsync();
    agencia = refreshed.find((a) => _norm(a.nombre) === agenciaNorm) ?? newAgencia;
  }

  // ── 2. Find or create/update the agent ───────────────────────────────────
  const agentesDeAgencia = agentes.filter((a) => a.agenciaId === agencia!.id);
  const agenteExistente = agentesDeAgencia.find((a) => _norm(a.nombre) === agenteNorm);

  if (!agenteExistente) {
    // Check no other agent in this agency already owns that email
    const emailYaEnUso =
      !!emailNuevo &&
      agentesDeAgencia.some(
        (a) => (a.correo ?? "").trim().toLowerCase() === emailNuevo.toLowerCase(),
      );
    await saveAgente({
      id: `AGT-${Date.now()}`,
      agenciaId: agencia!.id,
      nombre: agenteNombre,
      correo: emailYaEnUso ? undefined : (emailNuevo || undefined),
    });
  } else if (emailNuevo) {
    const emailActual = (agenteExistente.correo ?? "").trim();
    if (emailNuevo.toLowerCase() !== emailActual.toLowerCase()) {
      if (!emailActual) {
        // Agent had no email → update silently
        await apiAuth.agentes.update(agenteExistente.id, { correo: emailNuevo });
        await queryClient.invalidateQueries({ queryKey: ["agentes"] });
      } else {
        // Agent has a different email → ask for confirmation
        const confirmar = window.confirm(
          `El agente "${agenteExistente.nombre}" tiene registrado el correo:\n"${emailActual}"\n\n¿Desea actualizarlo a:\n"${emailNuevo}"?`,
        );
        if (confirmar) {
          await apiAuth.agentes.update(agenteExistente.id, { correo: emailNuevo });
          await queryClient.invalidateQueries({ queryKey: ["agentes"] });
        }
      }
    }
  }
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
