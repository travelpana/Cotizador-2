import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveExcelPath(): string {
  if (process.env["TARIFARIO_PATH"]) return process.env["TARIFARIO_PATH"];
  const candidates = [
    path.resolve(__dirname, "..", "..", "TARIFARIO.xlsx"),
    path.resolve(__dirname, "..", "TARIFARIO.xlsx"),
    path.resolve(process.cwd(), "TARIFARIO.xlsx"),
    path.resolve(process.cwd(), "artifacts/api-server/TARIFARIO.xlsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]!;
}

export interface Hotel {
  id: string;
  nombre: string;
  categoria: string;
  estrellas: string;
  tipoHabitacion: string;
  ubicacion: string;
  desayuno: string;
  vigencia: string;
  precios: { SGL: number; DBL: number; TPL: number; CHD: number };
}

export interface Tour {
  id: string;
  nombre: string;
  categoria: string;
  seccion: string;
  horario: string;
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
  descripcion: string;
}

export interface Traslado {
  id: string;
  nombre: string;
  categoria: string;
  tipo: "Regular" | "Privado";
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
}

export interface Catalog {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  loadedAt: string;
}

let cache: Catalog | null = null;

const EXCEL_PATH = resolveExcelPath();

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function isCode(v: unknown): boolean {
  return typeof v === "string" && /^RGE-/i.test(v.trim());
}

type Row = Record<string, unknown>;

function rowsOf(wb: XLSX.WorkBook, sheet: string): Row[] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
}

function parseHoteles(rows: Row[]): Hotel[] {
  const hoteles: Hotel[] = [];
  let ubicacion = "";
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!code) continue;
    if (!isCode(code)) {
      // Section header (e.g. "CIUDAD DE PANAMÁ")
      const restEmpty = vals
        .slice(1)
        .every((v) => v == null || String(v).trim() === "");
      if (restEmpty && code.length > 0 && !/^Código/i.test(code)) {
        ubicacion = code;
      }
      continue;
    }
    const nombre = str(vals[1]);
    const estrellas = str(vals[2]);
    const tipoHab = str(vals[3]);
    const sgl = num(vals[4]);
    const dbl = num(vals[5]);
    const tpl = num(vals[6]);
    const chd = num(vals[7]);
    const desayuno = str(vals[8]);
    const vigencia = str(vals[9]);
    if (!nombre) continue;
    hoteles.push({
      id: code,
      nombre,
      categoria: "hotel",
      estrellas,
      tipoHabitacion: tipoHab,
      ubicacion,
      desayuno,
      vigencia,
      precios: { SGL: sgl, DBL: dbl, TPL: tpl, CHD: chd },
    });
  }
  return hoteles;
}

function parseTours(rows: Row[]): Tour[] {
  const tours: Tour[] = [];
  let seccion = "";
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!code) continue;
    if (!isCode(code)) {
      const restEmpty = vals
        .slice(1)
        .every((v) => v == null || String(v).trim() === "");
      if (restEmpty && code.length > 0 && !/^Código/i.test(code)) {
        seccion = code;
      }
      continue;
    }
    const nombre = str(vals[1]);
    const horario = str(vals[2]);
    const p1 = num(vals[3]);
    const p2_5 = num(vals[4]);
    const p6_10 = num(vals[5]);
    const chd = num(vals[6]);
    const cat = str(vals[7]) || "Tour";
    if (!nombre) continue;
    tours.push({
      id: code,
      nombre,
      categoria: cat,
      seccion,
      horario,
      precio_por_persona: p2_5 || p1,
      precios: { p1, p2_5, p6_10, chd },
      descripcion: nombre,
    });
  }
  return tours;
}

function parseTraslados(rows: Row[], tipo: "Regular" | "Privado"): Traslado[] {
  const items: Traslado[] = [];
  for (const r of rows) {
    const vals = Object.values(r);
    const code = str(vals[0]);
    if (!isCode(code)) continue;
    const nombre = str(vals[1]);
    const p1 = num(vals[2]);
    const p2_5 = num(vals[3]);
    const p6_10 = num(vals[4]);
    const chd = num(vals[5]);
    const cat = str(vals[6]) || tipo;
    if (!nombre) continue;
    items.push({
      id: `${tipo === "Privado" ? "PRV-" : ""}${code}`,
      nombre,
      categoria: cat,
      tipo,
      precio_por_persona: p2_5 || p1,
      precios: { p1, p2_5, p6_10, chd },
    });
  }
  return items;
}

export function loadCatalog(): Catalog {
  if (cache) return cache;
  return reloadCatalog();
}

export function reloadCatalog(): Catalog {
  const wb = XLSX.readFile(EXCEL_PATH);
  const hoteles = parseHoteles(rowsOf(wb, "Hotelería"));
  const tours = parseTours(rowsOf(wb, "Tours"));
  const trasladosReg = parseTraslados(
    rowsOf(wb, "Traslados Regulares"),
    "Regular",
  );
  const trasladosPriv = parseTraslados(
    rowsOf(wb, "Traslados Privados"),
    "Privado",
  );
  cache = {
    hoteles,
    tours,
    traslados: [...trasladosReg, ...trasladosPriv],
    loadedAt: new Date().toISOString(),
  };
  return cache;
}

export function getFileInfo(): { filename: string; loadedAt: string | null } {
  if (cache) {
    return { filename: path.basename(EXCEL_PATH), loadedAt: cache.loadedAt };
  }
  try {
    const stat = fs.statSync(EXCEL_PATH);
    return {
      filename: path.basename(EXCEL_PATH),
      loadedAt: stat.mtime.toISOString(),
    };
  } catch {
    return { filename: path.basename(EXCEL_PATH), loadedAt: null };
  }
}

const REQUIRED_SHEETS = [
  "Hotelería",
  "Tours",
  "Traslados Regulares",
  "Traslados Privados",
];

export function replaceAndReload(buffer: Buffer): Catalog {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("El archivo no es un Excel válido (.xlsx)");
  }
  for (const sheet of REQUIRED_SHEETS) {
    if (!wb.SheetNames.includes(sheet)) {
      throw new Error(`El archivo no contiene la hoja requerida: "${sheet}"`);
    }
  }
  fs.writeFileSync(EXCEL_PATH, buffer);
  return reloadCatalog();
}
