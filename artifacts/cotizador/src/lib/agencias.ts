export interface Agencia {
  id: string;
  nombre: string;
  logoUrl?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  predeterminada?: boolean;
}

const STORAGE_KEY = "rge.agencias";

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
