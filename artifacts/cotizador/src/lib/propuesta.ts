import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioCalculado,
  ServicioSeleccionado,
} from "./types";
import { formatRegimen } from "./regimen";
import { fmt } from "./calc";
import { formatTrasladoNombre } from "./utils";
import { buildItinerario, type ItinerarioDia } from "@/components/Itinerario";
import type { ModoCotizacion } from "@/components/Guardadas";

export interface PropuestaInput {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto?: boolean;
  descriptivos?: Descriptivo[];
  numeroCotizacion?: string;
  /** Manual overrides for itinerary activity text, keyed by día number. */
  actividadesOverride?: Record<number, string>;
  /** When true, itinerary activity cells are rendered as contenteditable. */
  editable?: boolean;
  /** Optional intro text rendered at the very top of the body (used for emails). */
  intro?: string;
  /** Resolved observation strings to show at the bottom of the proposal */
  observaciones?: string[];
}

export interface PropuestaData {
  fechaEmision: string;
  destino: string;
  fechaViaje: string;
  pasajerosLabel: string;
  numeroCotizacion: string;
  validaHasta: string;
  tipoServicio: string;
  noches: string;
  agencia: string;
  agente: string;
  hoteles: ServicioCalculado[];
  traslados: ServicioCalculado[];
  tours: ServicioCalculado[];
  vuelos: ServicioCalculado[];
  acoms: Acomodacion[];
  primary: Acomodacion;
  isCalc: boolean;
  itinerario: ItinerarioDia[];
  result: CotizacionResult;
  cliente: Cliente;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto: boolean;
  descriptivosTours: Descriptivo[];
  editable: boolean;
  intro: string;
  observaciones: string[];
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function deriveTipoServicio(r: CotizacionResult): string {
  const relevantes = r.servicios.filter(
    (s) => s.tipo === "traslado" || s.tipo === "tour",
  );
  if (relevantes.length === 0) return "—";
  const tipos = new Set<"regular" | "privado">();
  for (const s of relevantes) {
    const isPrivado = s.tipoServicio
      ? s.tipoServicio === "Privado"
      : (s.detalle || "").toLowerCase().includes("privado");
    tipos.add(isPrivado ? "privado" : "regular");
  }
  if (tipos.size === 2) return "Mixto (Regular/Privado)";
  return tipos.has("privado") ? "Privado" : "Regular";
}

function deriveDestino(hoteles: ServicioCalculado[]): string {
  const ubic = Array.from(
    new Set(
      hoteles
        .map((h) => (h.ubicacion || "").trim())
        .filter(Boolean),
    ),
  );
  if (ubic.length === 0) return "—";
  return ubic.join(" · ");
}

export function buildPropuestaData(input: PropuestaInput): PropuestaData {
  const { cliente, servicios, result, modo, incluirItinerario } = input;
  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const traslados = result.servicios.filter((s) => s.tipo === "traslado");
  const tours = result.servicios.filter((s) => s.tipo === "tour");
  const vuelos = result.servicios.filter((s) => s.tipo === "vuelo");
  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const isCalc = modo === "calculo";

  const incluirDescriptivoCompleto = input.incluirDescriptivoCompleto === true;
  const descriptivosTours: Descriptivo[] = [];
  if (incluirDescriptivoCompleto && input.descriptivos?.length) {
    const norm = (s: string) => s.trim().toUpperCase();
    const byCode = new Map<string, Descriptivo>();
    for (const d of input.descriptivos) {
      if (d?.codigo) byCode.set(norm(d.codigo), d);
    }
    const seen = new Set<string>();
    for (const t of tours) {
      const raw = t.codigo || t.id;
      if (!raw) continue;
      const code = norm(raw);
      if (seen.has(code)) continue;
      const d = byCode.get(code);
      if (d) {
        seen.add(code);
        descriptivosTours.push(d);
      }
    }
  }

  const overrides = input.actividadesOverride ?? {};
  const itinerario = incluirItinerario
    ? buildItinerario(cliente, servicios).map((it) =>
        overrides[it.dia] !== undefined
          ? { ...it, actividad: overrides[it.dia] }
          : it,
      )
    : [];

  const pasajerosLabel = `${cliente.pasajeros} adulto${cliente.pasajeros === 1 ? "" : "s"}${
    cliente.ninos ? ` + ${cliente.ninos} niño${cliente.ninos === 1 ? "" : "s"}` : ""
  }`;

  const fechaViaje =
    cliente.fechaInicio && cliente.fechaFin
      ? `${fmtFecha(cliente.fechaInicio)} al ${fmtFecha(cliente.fechaFin)}`
      : cliente.fechaInicio
        ? fmtFecha(cliente.fechaInicio)
        : "—";

  const numero =
    input.numeroCotizacion ??
    `RGE-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  return {
    fechaEmision: fmtFecha(todayIso()),
    destino: deriveDestino(hoteles),
    fechaViaje,
    pasajerosLabel,
    numeroCotizacion: numero,
    validaHasta: cliente.vigencia ? fmtFecha(cliente.vigencia) : "—",
    tipoServicio: deriveTipoServicio(result),
    noches: cliente.noches ? `${cliente.noches}` : "—",
    agencia: (cliente.correo || "").trim() || "—",
    agente: (cliente.agente || "").trim() || "—",
    hoteles,
    traslados,
    tours,
    vuelos,
    acoms,
    primary,
    isCalc,
    itinerario,
    result,
    cliente,
    incluirDescriptivos: input.incluirDescriptivos,
    incluirDescriptivoCompleto,
    descriptivosTours,
    editable: input.editable === true,
    intro: input.intro?.trim() ? input.intro.trim() : "",
    observaciones: input.observaciones ?? [],
  };
}

const COLOR_AZUL = "#1E3A8A";
const COLOR_NARANJA = "#f97316";
const COLOR_VERDE = "#16a34a";
const COLOR_TEXTO = "#1f2937";
const COLOR_BORDE = "#e5e7eb";
const COLOR_LABEL = "#6b7280";

const STYLES = {
  pillBlue: `display:inline-block;background:${COLOR_AZUL};color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  pillOrange: `display:inline-block;background:${COLOR_NARANJA};color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  pillAmber: `display:inline-block;background:#fbbf23;color:#ffffff;padding:6px 14px;border-radius:20px;font-weight:600;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;`,
  divider: `height:2px;background:${COLOR_NARANJA};border:0;margin:16px 0 20px;`,
  th: `text-align:left;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thNum: `text-align:right;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thCenter: `text-align:center;color:#64748b;font-weight:700;font-size:10px;letter-spacing:0.6px;padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};text-transform:uppercase;background:#f8fafc;`,
  thEmpty: `padding:10px 12px;border-bottom:1px solid ${COLOR_BORDE};background:#f8fafc;`,
  td: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;`,
  tdNum: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;text-align:right;font-weight:600;`,
  tdCenter: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_TEXTO};font-size:13px;text-align:center;`,
  tdEmpty: `padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;`,
  cellTitle: `font-weight:600;color:${COLOR_TEXTO};font-size:14px;`,
  cellSub: `font-size:12px;color:${COLOR_LABEL};margin-top:3px;`,
  cellNote: `font-size:12px;color:${COLOR_LABEL};font-style:italic;margin-top:4px;`,
  cellGreen: `font-size:12px;color:${COLOR_VERDE};font-weight:600;margin-top:4px;`,
  infoLabel: `padding:4px 10px 4px 0;color:${COLOR_LABEL};font-weight:600;font-size:12px;white-space:nowrap;vertical-align:top;`,
  infoValue: `padding:4px 0;color:${COLOR_TEXTO};font-weight:500;font-size:12px;vertical-align:top;`,
  block: `margin-bottom:28px;`,
};

const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Like escape() but also converts newlines to <br /> for multi-line fields */
const escapeML = (s: unknown) => escape(s).replace(/\n/g, "<br />");

/** Full-width colored section header bar (replaces pill-style headers). */
function sectionBar(title: string, color: string = COLOR_AZUL): string {
  return `<div style="background:${color};color:#ffffff;padding:8px 14px;font-weight:700;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;border-radius:4px 4px 0 0;">${escape(title)}</div>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="${STYLES.infoLabel}">${escape(label)}:</td>
    <td style="${STYLES.infoValue}">${escape(value)}</td>
  </tr>`;
}

function groupByLocation<T extends { ubicacion?: string }>(
  items: T[],
): { label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  const indexMap = new Map<string, number>();
  for (const h of items) {
    const key = (h.ubicacion ?? "").trim().toUpperCase();
    const label = (h.ubicacion ?? "Sin ubicación").trim().toUpperCase();
    if (indexMap.has(key)) {
      groups[indexMap.get(key)!].items.push(h);
    } else {
      indexMap.set(key, groups.length);
      groups.push({ key, label, items: [h] });
    }
  }
  return groups;
}

function alojamientoTable(d: PropuestaData): string {
  if (d.hoteles.length === 0) return "";

  // In Totales mode: no NOCHES column, no TOTAL per row (totals live in the summary block)
  // In Tarifas mode: no NOCHES, an empty placeholder column (keeps Tarifas layout unchanged)
  const showNoches = false;
  const showTotalCol = !d.isCalc; // empty placeholder only in Tarifas mode

  const nochesSuffix = `<div style="font-weight:500;color:#94a3b8;text-transform:lowercase;font-size:9px;margin-top:2px;">/noche</div>`;
  const acomCols = d.acoms
    .map(
      (a) =>
        `<th style="${STYLES.thNum};width:10%;">${escape(String(a))}${nochesSuffix}</th>`,
    )
    .join("");

  const totalCols = 3 + d.acoms.length + (showTotalCol ? 1 : 0);
  const groups = groupByLocation(d.hoteles);

  const rows = groups
    .map(({ label, items }) => {
      const locationHeader = `<tr style="page-break-inside:avoid;">
        <td colspan="${totalCols}" style="padding:4px 12px 4px;background:linear-gradient(to right,#eff6ff,#f8fafc);border-top:2px solid #e2e8f0;border-bottom:1px solid #dbeafe;">
          <div style="font-size:11px;font-weight:700;color:${COLOR_AZUL};letter-spacing:0.8px;text-transform:uppercase;">${escape(label)}</div>
        </td>
      </tr>`;

      const hotelRows = items
        .map((h) => {
          const acomVals = d.acoms
            .map(
              (a) =>
                `<td style="${STYLES.tdNum};padding:8px 12px;">${escape(fmt(h.preciosPorAcomodacion[a]))}</td>`,
            )
            .join("");
          const lastCell = showTotalCol ? `<td style="${STYLES.tdEmpty};padding:8px 12px;width:10%;"></td>` : "";

          const regimenFmt = formatRegimen(h.desayuno);
          const regimenLine = regimenFmt
            ? `<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:3px;">${escape(regimenFmt)}</div>`
            : "";
          const notasHotelLine = h.notas
            ? `<div style="${STYLES.cellNote}">${escape(h.notas)}</div>`
            : "";

          return `<tr style="page-break-inside:avoid;">
            <td style="${STYLES.td};padding:8px 12px;width:50%;">
              <div style="${STYLES.cellTitle}">${escape(h.nombre)}</div>
              ${regimenLine}
              ${notasHotelLine}
            </td>
            <td style="${STYLES.tdCenter};padding:8px 12px;width:15%;">${escape(h.estrellas || "—")}</td>
            <td style="${STYLES.td};padding:8px 12px;width:15%;">${escape(h.tipoHabitacion || "—")}</td>
            ${acomVals}
            ${lastCell}
          </tr>`;
        })
        .join("");

      return locationHeader + hotelRows;
    })
    .join("");

  const lastHeader = showTotalCol ? `<th style="${STYLES.thEmpty};width:10%;"></th>` : "";

  return `
  <div style="${STYLES.block}">
    ${sectionBar("ALOJAMIENTO")}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50%;">HOTEL</th>
          <th style="${STYLES.thCenter};width:15%;">CATEGORÍA</th>
          <th style="${STYLES.th};width:15%;">TIPO HAB.</th>
          ${acomCols}
          ${lastHeader}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function adicionalesTable(
  title: string,
  items: ServicioCalculado[],
  d: PropuestaData,
): string {
  if (items.length === 0) return "";
  const rows = items
    .map((s) => {
      const tipo =
        s.tipo === "vuelo"
          ? "Vuelo"
          : s.tipoServicio
            ? s.tipoServicio
            : s.tipo === "traslado"
              ? s.detalle?.includes("Privado")
                ? "Privado"
                : "Regular"
              : "Regular";

      const displayName =
        s.tipo === "traslado" ? formatTrasladoNombre(s.nombre) : s.nombre;

      const ticketsLine = (() => {
        if (s.tipo !== "tour" || !s.tickets?.enabled || s.tickets.adultPrice <= 0) return "";
        const t = s.tickets;
        const labelPart = t.label ? `${escape(t.label)} · ` : "";
        const adultPart = `Adultos ${escape(fmt(t.adultPrice))} p/p`;
        const childPart =
          t.childPrice !== undefined && t.childPrice > 0
            ? ` · Niños ${escape(fmt(t.childPrice))} p/p`
            : "";
        return `<div style="font-size:12px;color:#d97706;font-weight:500;margin-top:4px;">Costo adicional por entradas: ${labelPart}${adultPart}${childPart}</div>`;
      })();

      const horarioLine =
        s.tipo === "tour" && d.incluirDescriptivos && s.horario
          ? `<div style="${STYLES.cellNote}">Horario: ${escape(s.horario)}</div>`
          : "";

      const notasLine = s.notas
        ? `<div style="${STYLES.cellNote}">${escape(s.notas)}</div>`
        : "";

      // Totales mode: show only name, type, and unit price — no PAX/TOTAL columns
      // (calculations live in the Resumen de costos block)
      if (d.isCalc) {
        return `<tr style="page-break-inside:avoid;">
          <td style="${STYLES.td};width:65%;">
            <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
            ${ticketsLine}
            ${horarioLine}
            ${notasLine}
          </td>
          <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
          <td style="${STYLES.tdNum};width:20%;">${escape(fmt(s.unitAplicado ?? 0))}</td>
        </tr>`;
      }

      // Tarifas mode: unchanged layout
      return `<tr style="page-break-inside:avoid;">
        <td style="${STYLES.td};width:65%;">
          <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
          ${ticketsLine}
          ${horarioLine}
          ${notasLine}
        </td>
        <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
        <td style="${STYLES.tdNum};width:10%;">${escape(fmt(s.unitAplicado ?? 0))}</td>
        <td style="${STYLES.tdEmpty};width:10%;"></td>
      </tr>`;
    })
    .join("");

  const thead = d.isCalc
    ? `<tr>
        <th style="${STYLES.th};width:65%;">DESCRIPCIÓN</th>
        <th style="${STYLES.th};width:15%;">MODALIDAD</th>
        <th style="${STYLES.thNum};width:20%;">TARIFA P/P</th>
      </tr>`
    : `<tr>
        <th style="${STYLES.th};width:65%;">DESCRIPCIÓN</th>
        <th style="${STYLES.th};width:15%;">TIPO</th>
        <th style="${STYLES.thNum};width:10%;">TARIFA P/P</th>
        <th style="${STYLES.thEmpty};width:10%;"></th>
      </tr>`;

  return `
  <div style="${STYLES.block}">
    ${sectionBar(title)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>${thead}</thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function itinerarioTable(d: PropuestaData): string {
  if (d.itinerario.length === 0) return "";
  const editAttrs = (dia: number) =>
    d.editable
      ? ` contenteditable="true" data-edit-actividad="${dia}" spellcheck="false" style="${STYLES.cellTitle};outline:none;border-radius:4px;padding:2px 4px;margin:-2px -4px;cursor:text;" title="Click para editar"`
      : ` style="${STYLES.cellTitle}"`;

  const rows = d.itinerario
    .map(
      (it) => `<tr style="page-break-inside:avoid;">
        <td style="padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;font-weight:700;color:${COLOR_AZUL};font-size:13px;width:50px;">${escape(it.dia)}</td>
        <td style="padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;color:${COLOR_LABEL};font-size:12px;white-space:nowrap;width:110px;">${escape(it.fecha ? fmtFecha(it.fecha) : "—")}</td>
        <td style="${STYLES.td}">
          <div${editAttrs(it.dia)}>${escape(it.actividad)}</div>
          ${
            d.incluirDescriptivos && it.esTour && it.horario
              ? `<div style="${STYLES.cellNote}">Horario: ${escape(it.horario)}</div>`
              : ""
          }
        </td>
      </tr>`,
    )
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar("ITINERARIO SUGERIDO", COLOR_NARANJA)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50px;">DÍA</th>
          <th style="${STYLES.th};width:110px;">FECHA</th>
          <th style="${STYLES.th}">ACTIVIDAD</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function descriptivosBlock(d: PropuestaData): string {
  if (!d.incluirDescriptivoCompleto || d.descriptivosTours.length === 0) {
    return "";
  }

  const items = d.descriptivosTours
    .map((t) => {
      const infoBits: string[] = [];
      if (t.info) infoBits.push(t.info);
      if (t.horarioExtra) infoBits.push(t.horarioExtra);
      const infoLine = infoBits.length
        ? `<div style="font-size:11px;color:${COLOR_LABEL};margin:4px 0 10px;">${escape(infoBits.join(" · "))}</div>`
        : "";

      const parrafos = (t.parrafos ?? [])
        .map(
          (p) =>
            `<p style="margin:0 0 8px;color:${COLOR_TEXTO};font-size:12px;line-height:1.5;">${escape(p)}</p>`,
        )
        .join("");

      const incluyeList = t.incluye
        ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:3px solid ${COLOR_VERDE};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_VERDE};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Incluye</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(t.incluye)}</div>
          </div>`
        : "";

      const observaciones = t.observaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid ${COLOR_NARANJA};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_NARANJA};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Observaciones</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(t.observaciones)}</div>
          </div>`
        : "";

      const recomendaciones = t.recomendaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#eff6ff;border-left:3px solid ${COLOR_AZUL};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_AZUL};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Recomendaciones</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(t.recomendaciones)}</div>
          </div>`
        : "";

      const nota = t.notaImportante
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:#dc2626;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Nota importante</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(t.notaImportante)}</div>
          </div>`
        : "";

      return `<div style="padding:18px 0;border-bottom:1px solid ${COLOR_BORDE};">
        <div style="font-weight:bold;color:${COLOR_AZUL};font-size:14px;line-height:1.3;">${escape(t.titulo)}</div>
        ${infoLine}
        ${parrafos}
        ${incluyeList}
        ${observaciones}
        ${recomendaciones}
        ${nota}
      </div>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar("DESCRIPTIVOS", "#d97706")}
    <div style="margin-top:6px;">${items}</div>
  </div>`;
}

function totalsBlock(d: PropuestaData): string {
  if (!d.isCalc) return "";

  const C = 6; // total column count for colspan purposes
  const secHdr = `padding:8px 14px;background:#eff6ff;font-weight:700;color:${COLOR_AZUL};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;border-top:2px solid #dbeafe;border-bottom:1px solid ${COLOR_BORDE};`;
  const tdBase = `padding:9px 14px;border-top:1px solid ${COLOR_BORDE};color:${COLOR_TEXTO};font-size:12px;vertical-align:middle;`;
  const tdNum = `${tdBase}text-align:right;font-weight:600;`;
  const tdCtr = `${tdBase}text-align:center;`;

  let rows = "";

  // ── ALOJAMIENTO ───────────────────────────────────────
  if (d.hoteles.length > 0) {
    rows += `<tr><td colspan="${C}" style="${secHdr}">ALOJAMIENTO</td></tr>`;
    rows += `<tr>
      <th style="${STYLES.th};padding:7px 14px;">CONCEPTO</th>
      <th style="${STYLES.thCenter};padding:7px 14px;width:11%;">ACOM.</th>
      <th style="${STYLES.thNum};padding:7px 14px;width:13%;">TARIFA/NOC</th>
      <th style="${STYLES.thCenter};padding:7px 14px;width:7%;">PAX</th>
      <th style="${STYLES.thCenter};padding:7px 14px;width:7%;">NOC.</th>
      <th style="${STYLES.thNum};padding:7px 14px;width:13%;color:${COLOR_AZUL};">TOTAL</th>
    </tr>`;
    for (const h of d.hoteles) {
      const hotelNoches = h.noches ?? d.cliente.noches ?? 1;
      const validAcoms = d.acoms.filter((a) => (h.preciosPorAcomodacion[a] ?? 0) > 0);
      for (const a of validAcoms) {
        const tarifa = h.preciosPorAcomodacion[a];
        const pax = String(a).toUpperCase() === "CHD"
          ? (d.cliente.ninos ?? 0)
          : d.result.pasajeros;
        const total = h.totalesPorAcomodacion[a];
        rows += `<tr>
          <td style="${tdBase};font-weight:600;">${escape(h.nombre)}</td>
          <td style="${tdCtr};font-weight:700;color:#475569;">${escape(String(a))}</td>
          <td style="${tdNum}">${escape(fmt(tarifa))}</td>
          <td style="${tdCtr}">${escape(String(pax))}</td>
          <td style="${tdCtr}">${escape(String(hotelNoches))}</td>
          <td style="${tdNum};color:${COLOR_AZUL};">${escape(fmt(total))}</td>
        </tr>`;
      }
    }
  }

  // Helper for service sections (Traslados / Tours / Vuelos)
  const serviceSection = (
    label: string,
    items: ServicioCalculado[],
    getTipo: (s: ServicioCalculado) => string,
    getName: (s: ServicioCalculado) => string,
  ) => {
    if (items.length === 0) return "";
    let r = `<tr><td colspan="${C}" style="${secHdr}">${escape(label)}</td></tr>`;
    r += `<tr>
      <th style="${STYLES.th};padding:7px 14px;" colspan="2">CONCEPTO</th>
      <th style="${STYLES.th};padding:7px 14px;width:13%;">MODALIDAD</th>
      <th style="${STYLES.thNum};padding:7px 14px;width:13%;">TARIFA P/P</th>
      <th style="${STYLES.thCenter};padding:7px 14px;width:7%;">PAX</th>
      <th style="${STYLES.thNum};padding:7px 14px;width:13%;color:${COLOR_AZUL};">TOTAL</th>
    </tr>`;
    for (const s of items) {
      const pax = s.paxAplicados ?? d.result.pasajeros;
      const total = s.totalesPorAcomodacion[d.primary];
      r += `<tr>
        <td style="${tdBase};font-weight:600;" colspan="2">${escape(getName(s))}</td>
        <td style="${tdBase}">${escape(getTipo(s))}</td>
        <td style="${tdNum}">${escape(fmt(s.unitAplicado ?? 0))}</td>
        <td style="${tdCtr}">${escape(String(pax))}</td>
        <td style="${tdNum};color:${COLOR_AZUL};">${escape(fmt(total))}</td>
      </tr>`;
    }
    return r;
  };

  rows += serviceSection(
    "TRASLADOS",
    d.traslados,
    (s) => s.tipoServicio ?? (s.detalle?.includes("Privado") ? "Privado" : "Regular"),
    (s) => formatTrasladoNombre(s.nombre),
  );
  rows += serviceSection(
    "TOURS Y EXPERIENCIAS",
    d.tours,
    (s) => s.tipoServicio ?? "Regular",
    (s) => s.nombre,
  );
  rows += serviceSection(
    "VUELOS",
    d.vuelos,
    () => "Vuelo",
    (s) => s.nombre,
  );

  // ── GRAND TOTALS — uniform style for all acomodaciones ──
  const totalLabelStyle = `padding:12px 14px;border-top:2px solid ${COLOR_AZUL};font-weight:700;color:${COLOR_AZUL};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;background:#f0f4ff;`;
  const totalValStyle = `padding:12px 14px;border-top:2px solid ${COLOR_AZUL};text-align:right;font-weight:700;color:${COLOR_AZUL};font-size:14px;background:#f0f4ff;`;
  const totalRows = d.acoms
    .map(
      (a) => `<tr>
        <td colspan="${C - 1}" style="${totalLabelStyle}">TOTAL ${escape(String(a))}</td>
        <td style="${totalValStyle}">${escape(fmt(d.result.totalesPorAcomodacion[a]))}</td>
      </tr>`,
    )
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar("RESUMEN DE COSTOS")}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;border-collapse:collapse;border:1px solid ${COLOR_BORDE};">
      <tbody>${rows}</tbody>
      <tfoot>${totalRows}</tfoot>
    </table>
  </div>`;
}

function observacionesBlock(d: PropuestaData): string {
  if (!d.observaciones || d.observaciones.length === 0) return "";
  const items = d.observaciones
    .map(
      (o) =>
        `<tr><td style="padding:5px 14px 5px 16px;color:${COLOR_TEXTO};font-size:12px;line-height:1.6;border-left:3px solid ${COLOR_NARANJA};border-bottom:1px solid #fde8d8;">• ${escape(o)}</td></tr>`,
    )
    .join("");
  return `
  <div style="${STYLES.block}">
    ${sectionBar("OBSERVACIONES", COLOR_NARANJA)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#fff8f5;">
      <tbody>${items}</tbody>
    </table>
  </div>`;
}

export const PROPUESTA_CSS = `
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body {
    font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
    line-height: 1.45;
    font-size: 13px;
  }
`;

function introBlock(d: PropuestaData): string {
  if (!d.intro) return "";
  const paragraphs = d.intro
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 10px;color:${COLOR_TEXTO};font-size:13px;line-height:1.55;">${escape(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
  return `<tr><td style="padding:0 0 16px 0;">${paragraphs}</td></tr>`;
}

export function buildPropuestaBody(d: PropuestaData): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="700" align="center" style="width:700px;margin:0 auto;background:#ffffff;font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_TEXTO};font-size:13px;line-height:1.45;">
          <tbody>

            ${introBlock(d)}

            <tr>
              <td style="text-align:center;padding-bottom:18px;">
                <span style="${STYLES.pillBlue};padding:10px 25px;font-size:16px;">PROPUESTA DE SERVICIOS</span>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom:12px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;width:50%;padding-right:20px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                        <tbody>
                          ${infoRow("Destino", d.destino)}
                          ${infoRow("Fechas de estadía", d.fechaViaje)}
                          ${infoRow("Pasajeros", d.pasajerosLabel)}
                        </tbody>
                      </table>
                    </td>
                    <td style="vertical-align:top;width:50%;padding-left:20px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                        <tbody>
                          ${infoRow("Noches", d.noches)}
                          ${infoRow("Válida hasta", d.validaHasta)}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="margin-bottom:16px;">
                <hr style="${STYLES.divider}" />
              </td>
            </tr>

            <tr><td>${alojamientoTable(d)}</td></tr>
            <tr><td>${adicionalesTable("TRASLADOS", d.traslados, d)}</td></tr>
            <tr><td>${adicionalesTable("TOUR Y EXPERIENCIAS", d.tours, d)}</td></tr>
            <tr><td>${adicionalesTable("VUELOS", d.vuelos, d)}</td></tr>
            <tr><td>${itinerarioTable(d)}</td></tr>
            <tr><td>${descriptivosBlock(d)}</td></tr>
            <tr><td>${totalsBlock(d)}</td></tr>
            <tr><td>${observacionesBlock(d)}</td></tr>

            <tr>
              <td style="padding-top:24px;text-align:right;color:#9ca3af;font-size:11px;line-height:1.5;">
                <div>Cotización N°: ${escape(d.numeroCotizacion)}</div>
                <div>Fecha de emisión: ${escape(d.fechaEmision)}</div>
              </td>
            </tr>

          </tbody>
        </table>
      </td>
    </tr>
  </table>`;
}

export function buildPropuestaHtml(input: PropuestaInput): string {
  const d = buildPropuestaData(input);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Propuesta de Servicios · ${escape(d.cliente.nombre || "RGE Style Travel")}</title>
  <style>${PROPUESTA_CSS}</style>
</head>
<body>
${buildPropuestaBody(d)}
</body>
</html>`;
}
