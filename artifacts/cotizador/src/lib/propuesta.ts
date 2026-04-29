import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioCalculado,
  ServicioSeleccionado,
} from "./types";
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
    const isPrivado = (s.detalle || "").toLowerCase().includes("privado");
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

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="${STYLES.infoLabel}">${escape(label)}:</td>
    <td style="${STYLES.infoValue}">${escape(value)}</td>
  </tr>`;
}

function alojamientoTable(d: PropuestaData): string {
  if (d.hoteles.length === 0) return "";
  const showNoches = d.isCalc;
  const acomSuffix = d.isCalc
    ? ""
    : `<div style="font-weight:500;color:#94a3b8;text-transform:lowercase;font-size:9px;margin-top:2px;">/noche</div>`;
  const acomCols = d.acoms
    .map(
      (a) =>
        `<th style="${STYLES.thNum};width:10%;">${escape(a)}${acomSuffix}</th>`,
    )
    .join("");

  const rows = d.hoteles
    .map((h) => {
      const meta = [h.ubicacion].filter(Boolean).join(" · ");
      const acomVals = d.acoms
        .map(
          (a) =>
            `<td style="${STYLES.tdNum}">${escape(fmt(h.preciosPorAcomodacion[a]))}</td>`,
        )
        .join("");
      return `<tr style="page-break-inside:avoid;">
        <td style="${STYLES.td};width:50%;">
          <div style="${STYLES.cellTitle}">${escape(h.nombre)}</div>
          ${meta ? `<div style="${STYLES.cellSub}">${escape(meta)}</div>` : ""}
          ${h.notas ? `<div style="${STYLES.cellNote}">${escape(h.notas)}</div>` : ""}
        </td>
        <td style="${STYLES.tdCenter};width:15%;">${escape(h.estrellas || "—")}</td>
        <td style="${STYLES.td};width:15%;">${escape(h.tipoHabitacion || "Standard")}</td>
        ${showNoches ? `<td style="${STYLES.tdCenter};width:10%;">${escape(h.noches ?? d.cliente.noches ?? "—")}</td>` : ""}
        ${acomVals}
        <td style="${STYLES.tdEmpty};width:10%;"></td>
      </tr>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    <div style="${STYLES.pillBlue}">ALOJAMIENTO</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:50%;">HOTEL</th>
          <th style="${STYLES.thCenter};width:15%;">CATEGORÍA</th>
          <th style="${STYLES.th};width:15%;">TIPO HAB.</th>
          ${showNoches ? `<th style="${STYLES.thCenter};width:10%;">NOCHES</th>` : ""}
          ${acomCols}
          <th style="${STYLES.thEmpty};width:10%;"></th>
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
        s.tipo === "traslado"
          ? s.detalle?.includes("Privado")
            ? "Privado"
            : "Regular"
          : s.tipo === "tour"
            ? "Regular"
            : s.tipo === "vuelo"
              ? "Vuelo"
              : "—";

      const tarifa = d.isCalc
        ? escape(fmt(s.totalesPorAcomodacion[d.primary]))
        : escape(fmt(s.unitAplicado ?? 0));

      const displayName =
        s.tipo === "traslado" ? formatTrasladoNombre(s.nombre) : s.nombre;

      const ticketsLine =
        s.tipo === "tour" &&
        s.tickets?.enabled &&
        s.tickets.adultPrice > 0
          ? `<div style="${STYLES.cellNote}">Costo adicional por entradas: ${escape(s.tickets.label || "Entradas")} ${escape(fmt(s.tickets.adultPrice))} p/p</div>`
          : "";

      const horarioLine =
        s.tipo === "tour" && d.incluirDescriptivos && s.horario
          ? `<div style="${STYLES.cellNote}">Horario: ${escape(s.horario)}</div>`
          : "";

      return `<tr style="page-break-inside:avoid;">
        <td style="${STYLES.td};width:65%;">
          <div style="${STYLES.cellTitle}">${escape(displayName)}</div>
          ${ticketsLine}
          ${horarioLine}
          ${s.notas ? `<div style="${STYLES.cellNote}">${escape(s.notas)}</div>` : ""}
        </td>
        <td style="${STYLES.td};width:15%;">${escape(tipo)}</td>
        <td style="${STYLES.tdNum};width:10%;">${tarifa}</td>
        <td style="${STYLES.tdEmpty};width:10%;"></td>
      </tr>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    <div style="${STYLES.pillBlue}">${escape(title)}</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th style="${STYLES.th};width:65%;">DESCRIPCIÓN</th>
          <th style="${STYLES.th};width:15%;">TIPO</th>
          <th style="${STYLES.thNum};width:10%;">${d.isCalc ? "TOTAL" : "TARIFA P/P"}</th>
          <th style="${STYLES.thEmpty};width:10%;"></th>
        </tr>
      </thead>
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
    <div style="${STYLES.pillOrange}">ITINERARIO SUGERIDO</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:12px;">
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
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escape(t.incluye)}</div>
          </div>`
        : "";

      const observaciones = t.observaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fff7ed;border-left:3px solid ${COLOR_NARANJA};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_NARANJA};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Observaciones</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escape(t.observaciones)}</div>
          </div>`
        : "";

      const recomendaciones = t.recomendaciones
        ? `<div style="margin-top:8px;padding:10px 12px;background:#eff6ff;border-left:3px solid ${COLOR_AZUL};border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:${COLOR_AZUL};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Recomendaciones</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escape(t.recomendaciones)}</div>
          </div>`
        : "";

      const nota = t.notaImportante
        ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;">
            <div style="font-size:10px;font-weight:bold;color:#dc2626;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:4px;">Nota importante</div>
            <div style="font-size:11px;color:${COLOR_TEXTO};line-height:1.5;">${escape(t.notaImportante)}</div>
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
    <div style="${STYLES.pillAmber}">DESCRIPTIVOS</div>
    <div style="margin-top:10px;">${items}</div>
  </div>`;
}

function totalsBlock(d: PropuestaData): string {
  if (!d.isCalc) return "";
  const rows = d.acoms
    .map((a) => {
      const isPrimary = a === d.primary;
      const valStyle = isPrimary
        ? `font-weight:700;color:${COLOR_AZUL};font-size:20px;text-align:right;padding:10px 16px;`
        : `font-weight:700;color:#334155;font-size:14px;text-align:right;padding:10px 16px;`;
      return `<tr style="page-break-inside:avoid;">
        <td style="font-weight:700;color:#475569;font-size:11px;letter-spacing:0.6px;padding:10px 16px;border-top:1px dashed ${COLOR_BORDE};text-transform:uppercase;">TOTAL ${escape(a)}</td>
        <td style="${valStyle};border-top:1px dashed ${COLOR_BORDE};">${escape(fmt(d.result.totalesPorAcomodacion[a]))}</td>
        <td style="padding:10px 16px;border-top:1px dashed ${COLOR_BORDE};width:10%;"></td>
      </tr>`;
    })
    .join("");

  return `
  <div style="${STYLES.block}">
    <div style="${STYLES.pillBlue}">RESUMEN DE COSTOS</div>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f8fafc;margin-top:12px;border-collapse:collapse;border:1px solid ${COLOR_BORDE};">
      <tbody>${rows}</tbody>
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
