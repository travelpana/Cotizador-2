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
import { tr as getT, type Idioma, type Traducciones } from "./i18n";

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
  /** Output language for all section labels and table headers */
  idioma?: Idioma;
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
  catamarans: ServicioCalculado[];
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
  idioma: Idioma;
  T: Traducciones;
}

const MESES_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
void MESES_ES;

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtFechaCompacta(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${String(y).slice(2)}`;
}

function formatNotasLineas(text: string, style: string): string {
  if (!text.trim()) return "";
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const part of trimmed.split(/(?<=\.)\s+|(?<=;)\s+/)) {
      const p = part.trim();
      if (p) lines.push(p);
    }
  }
  return lines.map((l) => `<div style="${style}">${escape(l)}</div>`).join("");
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

/** Pick the right language variant for a descriptivo field. Falls back to ES. */
function pickDesc(
  es: string | undefined,
  en: string | undefined,
  pt: string | undefined,
  idioma: Idioma,
): string | undefined {
  if (idioma === "en") return en || es;
  if (idioma === "pt") return pt || es;
  return es;
}

/** Pick the right array variant for a descriptivo field. Falls back to ES array. */
function pickDescArr(
  es: string[] | undefined,
  en: string[] | undefined,
  pt: string[] | undefined,
  idioma: Idioma,
): string[] | undefined {
  if (idioma === "en") return (en && en.length > 0 ? en : es);
  if (idioma === "pt") return (pt && pt.length > 0 ? pt : es);
  return es;
}

export function buildPropuestaData(input: PropuestaInput): PropuestaData {
  const { cliente, servicios, result, modo, incluirItinerario } = input;
  const idioma: Idioma = input.idioma ?? "es";
  const T = getT(idioma);

  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const traslados = result.servicios.filter((s) => s.tipo === "traslado");
  const tours = result.servicios.filter((s) => s.tipo === "tour");
  const vuelos = result.servicios.filter((s) => s.tipo === "vuelo");
  const catamarans = result.servicios.filter((s) => s.tipo === "catamaran");
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

  // Passenger label uses the output language
  const pax = cliente.pasajeros;
  const ninos = cliente.ninos ?? 0;
  const pasajerosLabel = `${pax} ${pax === 1 ? T.adulto : T.adultos}${
    ninos ? ` + ${ninos} ${ninos === 1 ? T.nino : T.ninoPlural}` : ""
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
    catamarans,
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
    idioma,
    T,
  };
}

const COLOR_AZUL = "#1E3A8A";
const COLOR_NARANJA = "#f97316";
const COLOR_VERDE = "#16a34a";
const COLOR_TEXTO = "#1f2937";
const COLOR_BORDE = "#e5e7eb";
const COLOR_LABEL = "#6b7280";

const C_TOT_ALOJAMIENTO = "#2F3D90";
const C_TOT_TRASLADOS = "#2F3D90";
const C_TOT_TOURS = "#363765";
const C_TOT_VUELOS = "#1780C0";
const C_TOT_OBSERVACIONES = "#F7CB17";
const C_TOT_OBSERVACIONES_TEXT = "#041941";
const C_TOT_ITINERARIO = "#EF7B15";
const C_TOT_DESCRIPTIVOS = "#363765";

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

/** Full-width colored section header bar. Pass textColor="#1f2937" for light-colored bars. */
function sectionBar(title: string, color: string = COLOR_AZUL, textColor = "#ffffff"): string {
  return `<div style="background:${color};color:${textColor};padding:8px 14px;font-weight:700;font-size:11px;letter-spacing:0.8px;text-transform:uppercase;border-radius:4px 4px 0 0;">${escape(title)}</div>`;
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
  if (d.isCalc) return "";
  if (d.hoteles.length === 0) return "";
  const { T } = d;

  const showTotalCol = !d.isCalc;

  const nochesSuffix = `<div style="font-weight:500;color:#94a3b8;text-transform:lowercase;font-size:9px;margin-top:2px;">${escape(T.porNoche)}</div>`;
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
        <td colspan="${totalCols}" style="padding:8px 12px;background:#EEF1F8;border-top:1px solid #D8DFF0;border-bottom:1px solid #D8DFF0;">
          <div style="font-size:11px;font-weight:700;color:#363765;letter-spacing:1px;text-transform:uppercase;">${escape(label)}</div>
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
            ? `<div style="font-size:11px;color:#4B4C7A;font-weight:600;margin-top:8px;">${escape(regimenFmt)}</div>`
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
    ${sectionBar(T.alojamiento, C_TOT_ALOJAMIENTO)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50%;">${escape(T.hotel)}</th>
          <th style="${STYLES.thCenter};width:15%;">${escape(T.categoria)}</th>
          <th style="${STYLES.th};width:15%;">${escape(T.tipoHab)}</th>
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
  barColor = COLOR_AZUL,
): string {
  if (d.isCalc) return "";
  if (items.length === 0) return "";
  const { T } = d;
  const hasCHD = d.acoms.some((a) => String(a) === "CHD");
  const onlyCHD = hasCHD && d.acoms.length === 1;
  const rows = items
    .map((s) => {
      const chdUnit = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
      const mainUnit = onlyCHD
        ? (chdUnit > 0 ? chdUnit : (s.unitAplicado ?? 0))
        : (s.unitAplicado ?? 0);
      const chdSubLine =
        hasCHD && !onlyCHD && chdUnit > 0
          ? `<div style="font-size:11px;color:#475569;margin-top:3px;">CHD: ${escape(fmt(chdUnit))}</div>`
          : "";
      const tipo =
        s.tipo === "vuelo"
          ? T.tipoVuelo
          : s.tipoServicio
            ? s.tipoServicio
            : s.tipo === "traslado"
              ? s.detalle?.includes("Privado")
                ? T.privado
                : T.regular
              : T.regular;

      const displayName =
        s.tipo === "traslado" ? formatTrasladoNombre(s.nombre) : s.nombre;

      const ticketsLine = (() => {
        if (s.tipo !== "tour" || !s.tickets?.enabled || s.tickets.adultPrice <= 0) return "";
        const tk = s.tickets;
        const labelPart = tk.label ? `${escape(tk.label)} · ` : "";
        const adultPart = `${T.adultosCap} ${escape(fmt(tk.adultPrice))} p/p`;
        const childPart =
          tk.childPrice !== undefined && tk.childPrice > 0
            ? ` · ${T.ninosCap} ${escape(fmt(tk.childPrice))} p/p`
            : "";
        return `<div style="font-size:12px;color:#d97706;font-weight:500;margin-top:4px;">${escape(T.costoAdicionalEntradas)}: ${labelPart}${adultPart}${childPart}</div>`;
      })();

      const horarioLine =
        s.tipo === "tour" && d.incluirDescriptivos && s.horario
          ? `<div style="${STYLES.cellNote}">${escape(T.horario)}: ${escape(s.horario)}</div>`
          : "";

      const notasLine = s.notas
        ? `<div style="${STYLES.cellNote}">${escape(s.notas)}</div>`
        : "";

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

      return `<tr style="page-break-inside:avoid;">
        <td style="${STYLES.td};width:65%;">
          <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
          ${ticketsLine}
          ${horarioLine}
          ${notasLine}
        </td>
        <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
        <td style="${STYLES.tdNum};width:10%;">${escape(fmt(mainUnit))}${chdSubLine}</td>
        <td style="${STYLES.tdEmpty};width:10%;"></td>
      </tr>`;
    })
    .join("");

  const tarifaHeader = onlyCHD ? "TARIFA CHD" : T.tarifaPP;
  const thead = d.isCalc
    ? `<tr>
        <th style="${STYLES.th};width:65%;">${escape(T.descripcion)}</th>
        <th style="${STYLES.th};width:15%;">${escape(T.modalidad)}</th>
        <th style="${STYLES.thNum};width:20%;">${escape(tarifaHeader)}</th>
      </tr>`
    : `<tr>
        <th style="${STYLES.th};width:65%;">${escape(T.descripcion)}</th>
        <th style="${STYLES.th};width:15%;">${escape(T.tipo)}</th>
        <th style="${STYLES.thNum};width:10%;">${escape(tarifaHeader)}</th>
        <th style="${STYLES.thEmpty};width:10%;"></th>
      </tr>`;

  return `
  <div style="${STYLES.block}">
    ${sectionBar(title, barColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>${thead}</thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function itinerarioTable(d: PropuestaData, barColor = C_TOT_ITINERARIO, barTextColor = "#ffffff"): string {
  if (d.itinerario.length === 0) return "";
  const { T } = d;
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
              ? `<div style="${STYLES.cellNote}">${escape(T.horario)}: ${escape(it.horario)}</div>`
              : ""
          }
        </td>
      </tr>`,
    )
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.itinerarioSugerido, barColor, barTextColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50px;">${escape(T.dia)}</th>
          <th style="${STYLES.th};width:110px;">${escape(T.fecha)}</th>
          <th style="${STYLES.th}">${escape(T.actividad)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function descriptivosBlock(d: PropuestaData, barColor = C_TOT_DESCRIPTIVOS): string {
  if (!d.incluirDescriptivoCompleto || d.descriptivosTours.length === 0) {
    return "";
  }
  const { T, idioma } = d;

  const items = d.descriptivosTours
    .map((desc) => {
      const titulo = pickDesc(desc.titulo, desc.titulo_en, desc.titulo_pt, idioma) ?? desc.titulo;
      const parrafos = pickDescArr(desc.parrafos, desc.parrafos_en, desc.parrafos_pt, idioma) ?? [];
      const incluye = pickDesc(desc.incluye, desc.incluye_en, desc.incluye_pt, idioma);
      const observaciones = pickDesc(desc.observaciones, desc.observaciones_en, desc.observaciones_pt, idioma);
      const recomendaciones = pickDesc(desc.recomendaciones, desc.recomendaciones_en, desc.recomendaciones_pt, idioma);
      const nota = pickDesc(desc.notaImportante, desc.notaImportante_en, desc.notaImportante_pt, idioma);

      const infoBits: string[] = [];
      if (desc.info) infoBits.push(desc.info);
      if (desc.horarioExtra) infoBits.push(desc.horarioExtra);
      const infoLine = infoBits.length
        ? `<div style="font-size:11px;color:${COLOR_LABEL};margin:4px 0 10px;">${escape(infoBits.join(" · "))}</div>`
        : "";

      const parrafosHtml = parrafos
        .map(
          (p) =>
            `<p style="margin:0 0 8px;color:${COLOR_TEXTO};font-size:12px;line-height:1.5;">${escape(p)}</p>`,
        )
        .join("");

      const incluyeList = incluye
        ? `<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:3px solid ${COLOR_VERDE};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_VERDE};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.incluye)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(incluye)}</div>
          </div>`
        : "";

      const obsHtml = observaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid ${COLOR_NARANJA};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_NARANJA};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.observacionesSub)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(observaciones)}</div>
          </div>`
        : "";

      const recHtml = recomendaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#eff6ff;border-left:3px solid ${COLOR_AZUL};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_AZUL};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.recomendaciones)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(recomendaciones)}</div>
          </div>`
        : "";

      const notaHtml = nota
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:#dc2626;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">${escape(T.notaImportante)}</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escapeML(nota)}</div>
          </div>`
        : "";

      return `<div style="padding:18px 0;border-bottom:1px solid ${COLOR_BORDE};">
        <div style="font-weight:bold;color:${COLOR_AZUL};font-size:14px;line-height:1.3;">${escape(titulo)}</div>
        ${infoLine}
        ${parrafosHtml}
        ${incluyeList}
        ${obsHtml}
        ${recHtml}
        ${notaHtml}
      </div>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.descriptivos, barColor)}
    <div style="margin-top:6px;">${items}</div>
  </div>`;
}

function buildTotalesView(d: PropuestaData): string {
  const { T } = d;

  const tdBase = `padding:9px 14px;border-top:1px solid ${COLOR_BORDE};color:${COLOR_TEXTO};font-size:12px;vertical-align:middle;`;
  const tdNum = `${tdBase}text-align:right;font-weight:600;`;
  const tdCtr = `${tdBase}text-align:center;`;

  let html = "";

  // ── 1. ALOJAMIENTO ──────────────────────────────────────────────
  if (d.hoteles.length > 0) {
    const groups = groupByLocation(d.hoteles);
    let rows = "";
    for (const { label, items } of groups) {
      rows += `<tr style="page-break-inside:avoid;">
        <td colspan="8" style="padding:8px 12px;background:#EEF1F8;border-top:1px solid #D8DFF0;border-bottom:1px solid #D8DFF0;">
          <div style="font-size:11px;font-weight:700;color:#363765;letter-spacing:1px;text-transform:uppercase;">${escape(label)}</div>
        </td>
      </tr>`;
      for (const h of items) {
        const hotelNoches = h.noches ?? d.cliente.noches ?? 1;
        const validAcoms = d.acoms.filter((a) => (h.preciosPorAcomodacion[a] ?? 0) > 0);
        for (const a of validAcoms) {
          const tarifa = h.preciosPorAcomodacion[a];
          const pax =
            String(a).toUpperCase() === "CHD"
              ? (d.cliente.ninos ?? 0)
              : d.result.pasajeros;
          const total = h.totalesPorAcomodacion[a];
          const regimenFmt = formatRegimen(h.desayuno);
          const regimenLine = regimenFmt
            ? `<div style="font-size:11px;color:#4B4C7A;font-weight:600;margin-top:4px;">${escape(regimenFmt)}</div>`
            : "";
          const fechaHotelLine = h.fechaInicio || h.fechaFin
            ? `<div style="font-size:11px;color:#64748B;font-weight:500;margin-top:4px;">${h.fechaInicio ? fmtFechaCompacta(h.fechaInicio) : "?"} → ${h.fechaFin ? fmtFechaCompacta(h.fechaFin) : "?"}</div>`
            : "";
          const notasHotelLines = h.notas
            ? formatNotasLineas(h.notas, STYLES.cellNote)
            : "";
          rows += `<tr style="page-break-inside:avoid;">
            <td style="${tdBase};font-weight:600;width:30%;">${escape(h.nombre)}${fechaHotelLine}${regimenLine}${notasHotelLines}</td>
            <td style="${tdCtr};width:9%;">${escape(h.estrellas || "—")}</td>
            <td style="${tdBase};width:11%;">${escape(h.tipoHabitacion || "—")}</td>
            <td style="${tdCtr};width:8%;font-weight:700;color:#475569;">${escape(String(a))}</td>
            <td style="${tdNum};width:11%;">${escape(fmt(tarifa))}</td>
            <td style="${tdCtr};width:6%;">${escape(String(pax))}</td>
            <td style="${tdCtr};width:6%;">${escape(String(hotelNoches))}</td>
            <td style="${tdNum};width:15%;color:${C_TOT_ALOJAMIENTO};">${escape(fmt(total))}</td>
          </tr>`;
        }
      }
    }
    html += `
    <div style="${STYLES.block}">
      ${sectionBar(T.alojamiento, C_TOT_ALOJAMIENTO)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${STYLES.th};width:30%;">${escape(T.hotel)}</th>
            <th style="${STYLES.thCenter};width:9%;">${escape(T.categoria)}</th>
            <th style="${STYLES.th};width:11%;">${escape(T.tipoHab)}</th>
            <th style="${STYLES.thCenter};width:8%;">${escape(T.acom)}</th>
            <th style="${STYLES.thNum};width:11%;">${escape(T.tarifaNoc)}</th>
            <th style="${STYLES.thCenter};width:6%;">${escape(T.pax)}</th>
            <th style="${STYLES.thCenter};width:6%;">${escape(T.noc)}</th>
            <th style="${STYLES.thNum};width:15%;color:${C_TOT_ALOJAMIENTO};">${escape(T.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // ── 2. SERVICE SECTIONS ─────────────────────────────────────────
  const hasCHDTot = d.acoms.some((a) => String(a) === "CHD");
  const onlyCHDTot = hasCHDTot && d.acoms.length === 1;

  const serviceSectionHtml = (
    color: string,
    label: string,
    items: ServicioCalculado[],
    getTipo: (s: ServicioCalculado) => string,
    getName: (s: ServicioCalculado) => string,
  ): string => {
    if (items.length === 0) return "";
    let rows = "";
    for (const s of items) {
      const pax = s.paxAplicados ?? d.result.pasajeros;
      const total = s.totalesPorAcomodacion[d.primary];
      const chdUnit = (s.preciosPorAcomodacion as Record<string, number>)["CHD"] ?? 0;
      const mainUnit = onlyCHDTot
        ? (chdUnit > 0 ? chdUnit : (s.unitAplicado ?? 0))
        : (s.unitAplicado ?? 0);
      const chdSubLine =
        hasCHDTot && !onlyCHDTot && chdUnit > 0
          ? `<div style="font-size:11px;color:#475569;margin-top:3px;">CHD: ${escape(fmt(chdUnit))}</div>`
          : "";
      const ticketsLine = (() => {
        if (s.tipo !== "tour" || !s.tickets?.enabled || s.tickets.adultPrice <= 0) return "";
        const tk = s.tickets;
        const labelPart = tk.label ? `${escape(tk.label)} · ` : "";
        const adultPart = `${T.adultosCap} ${escape(fmt(tk.adultPrice))} p/p`;
        const childPart =
          tk.childPrice !== undefined && tk.childPrice > 0
            ? ` · ${T.ninosCap} ${escape(fmt(tk.childPrice))} p/p`
            : "";
        return `<div style="font-size:12px;color:#d97706;font-weight:500;margin-top:4px;">${escape(T.costoAdicionalEntradas)}: ${labelPart}${adultPart}${childPart}</div>`;
      })();
      const notasLine = s.notas
        ? `<div style="${STYLES.cellNote}">${escape(s.notas)}</div>`
        : "";
      rows += `<tr style="page-break-inside:avoid;">
        <td style="${tdBase};width:48%;font-weight:600;">${escape(getName(s))}${ticketsLine}${notasLine}</td>
        <td style="${tdBase};width:17%;">${escape(getTipo(s))}</td>
        <td style="${tdNum};width:13%;">${escape(fmt(mainUnit))}${chdSubLine}</td>
        <td style="${tdCtr};width:8%;">${escape(String(pax))}</td>
        <td style="${tdNum};width:14%;color:${color};">${escape(fmt(total))}</td>
      </tr>`;
    }
    const tarifaHeaderTot = onlyCHDTot ? "TARIFA CHD" : T.tarifaPP;
    return `
    <div style="${STYLES.block}">
      ${sectionBar(label, color)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="${STYLES.th};width:48%;">${escape(T.descripcion)}</th>
            <th style="${STYLES.th};width:17%;">${escape(T.modalidad)}</th>
            <th style="${STYLES.thNum};width:13%;">${escape(tarifaHeaderTot)}</th>
            <th style="${STYLES.thCenter};width:8%;">${escape(T.pax)}</th>
            <th style="${STYLES.thNum};width:14%;color:${color};">${escape(T.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  };

  html += serviceSectionHtml(
    C_TOT_TRASLADOS, T.traslados, d.traslados,
    (s) => s.tipoServicio ?? (s.detalle?.includes("Privado") ? T.privado : T.regular),
    (s) => formatTrasladoNombre(s.nombre),
  );
  html += serviceSectionHtml(
    C_TOT_TOURS, T.toursYExperiencias, d.tours,
    (s) => s.tipoServicio ?? T.regular,
    (s) => s.nombre,
  );
  html += serviceSectionHtml(
    C_TOT_VUELOS, T.vuelos, d.vuelos,
    () => T.tipoVuelo,
    (s) => s.nombre,
  );

  // ── 3. TOTALES SEGÚN ACOMODACIÓN ────────────────────────────────
  const totalLabelStyle = `padding:14px 20px;border-top:2px solid ${COLOR_AZUL};font-weight:700;color:${COLOR_AZUL};font-size:14px;text-transform:uppercase;letter-spacing:0.5px;background:#f0f4ff;`;
  const totalValStyle = `padding:14px 20px;border-top:2px solid ${COLOR_AZUL};text-align:right;font-weight:800;color:${COLOR_AZUL};font-size:16px;background:#f0f4ff;`;
  const totalRows = d.acoms
    .map(
      (a) => `<tr>
        <td style="${totalLabelStyle}">${escape(String(a))}</td>
        <td style="${totalValStyle}">${escape(fmt(d.result.totalesPorAcomodacion[a]))}</td>
      </tr>`,
    )
    .join("");

  html += `
  <div style="${STYLES.block}">
    ${sectionBar(T.totalesSegunAcomodacion)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;border-collapse:collapse;border:2px solid ${COLOR_AZUL};border-radius:4px;">
      <tfoot>${totalRows}</tfoot>
    </table>
  </div>`;

  // ── 4. OBSERVACIONES ────────────────────────────────────────────
  html += observacionesBlock(d, C_TOT_OBSERVACIONES);

  // ── 5. ITINERARIO ───────────────────────────────────────────────
  html += itinerarioTable(d, C_TOT_ITINERARIO, "#ffffff");

  // ── 6. DESCRIPTIVOS ─────────────────────────────────────────────
  html += descriptivosBlock(d, C_TOT_DESCRIPTIVOS);

  return html;
}

function observacionesBlock(d: PropuestaData, barColor = C_TOT_OBSERVACIONES, barTextColor = C_TOT_OBSERVACIONES_TEXT): string {
  if (!d.observaciones || d.observaciones.length === 0) return "";
  const { T } = d;
  const items = d.observaciones
    .map(
      (o) =>
        `<tr><td style="padding:7px 14px 7px 16px;color:#041941;font-size:12px;line-height:1.6;border-left:3px solid #F1D45A;border-bottom:1px solid #F1D45A;background:#FFF8D6;">• ${escape(o)}</td></tr>`,
    )
    .join("");
  return `
  <div style="${STYLES.block}">
    ${sectionBar(T.observaciones, barColor, barTextColor)}
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#FFF8D6;border:1px solid #F1D45A;border-top:none;">
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
  const { T } = d;
  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;">
    <tr>
      <td align="center" style="padding:20px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#ffffff;font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLOR_TEXTO};font-size:13px;line-height:1.45;">
          <tbody>

            ${introBlock(d)}

            <tr>
              <td style="text-align:center;padding-bottom:18px;">
                <span style="${STYLES.pillBlue};padding:10px 25px;font-size:16px;">${escape(T.propuestaDeServicios)}</span>
              </td>
            </tr>

            <tr>
              <td style="padding-bottom:12px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;width:50%;padding-right:20px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                        <tbody>
                          ${infoRow(T.destino, d.destino)}
                          ${infoRow(T.fechasDeEstadia, d.fechaViaje)}
                          ${infoRow(T.pasajeros, d.pasajerosLabel)}
                        </tbody>
                      </table>
                    </td>
                    <td style="vertical-align:top;width:50%;padding-left:20px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;">
                        <tbody>
                          ${infoRow(T.noches, d.noches)}
                          ${infoRow(T.validaHasta, d.validaHasta)}
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

            ${d.isCalc
              ? `<tr><td>${buildTotalesView(d)}</td></tr>`
              : `<tr><td>${alojamientoTable(d)}</td></tr>
            <tr><td>${adicionalesTable(T.traslados, d.traslados, d, C_TOT_TRASLADOS)}</td></tr>
            <tr><td>${adicionalesTable(T.toursYExperiencias, d.tours, d, C_TOT_TOURS)}</td></tr>
            <tr><td>${adicionalesTable(T.catamaranYNavegacion, d.catamarans, d, C_TOT_VUELOS)}</td></tr>
            <tr><td>${adicionalesTable(T.vuelos, d.vuelos, d, C_TOT_VUELOS)}</td></tr>
            <tr><td>${itinerarioTable(d)}</td></tr>
            <tr><td>${descriptivosBlock(d)}</td></tr>
            <tr><td>${observacionesBlock(d)}</td></tr>`
            }

            <tr>
              <td style="padding-top:24px;text-align:right;color:#9ca3af;font-size:11px;line-height:1.5;">
                <div>${escape(T.numeroCotizacion)}: ${escape(d.numeroCotizacion)}</div>
                <div>${escape(T.fechaEmision)}: ${escape(d.fechaEmision)}</div>
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
  const lang = d.idioma === "pt" ? "pt-BR" : d.idioma === "en" ? "en" : "es";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(d.T.propuestaDeServicios)} · ${escape(d.cliente.nombre || "RGE Style Travel")}</title>
  <style>${PROPUESTA_CSS}</style>
</head>
<body>
${buildPropuestaBody(d)}
</body>
</html>`;
}
