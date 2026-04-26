import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  ServicioCalculado,
  ServicioSeleccionado,
} from "./types";
import { fmt, entradaTipoLabel } from "./calc";
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
  numeroCotizacion?: string;
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
  asesor: string;
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
  return `${String(d).padStart(2, "0")} de ${MESES[m - 1]} ${y}`;
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function deriveTipoServicio(r: CotizacionResult): string {
  const tipos = new Set(r.servicios.map((s) => s.tipo));
  const tieneHotel = tipos.has("hotel");
  const tieneTour = tipos.has("tour");
  const tieneTraslado = tipos.has("traslado");
  if (tieneHotel && (tieneTour || tieneTraslado)) return "Paquete Turístico";
  if (tieneHotel) return "Alojamiento";
  if (tieneTour) return "Tours y Experiencias";
  if (tieneTraslado) return "Traslados";
  return "Servicios";
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

  const itinerario = incluirItinerario
    ? buildItinerario(cliente, servicios)
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
    asesor: cliente.correo || "—",
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
  };
}

const LOGO_SVG = `
<svg viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-label="Style Travel">
  <g transform="translate(4 6)">
    <rect x="0"  y="14" width="14" height="14" fill="#22c55e"/>
    <rect x="14" y="14" width="14" height="14" fill="#f59e0b"/>
    <rect x="0"  y="28" width="14" height="14" fill="#e11d48"/>
    <rect x="14" y="28" width="14" height="14" fill="#2563eb"/>
    <rect x="9" y="0"  width="10" height="14" fill="#0ea5e9"/>
    <rect x="9" y="42" width="10" height="14" fill="#1d4ed8"/>
  </g>
  <text x="44" y="32" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="800"
    font-size="22" fill="#1e3a8a" letter-spacing="0.5">Style</text>
  <text x="44" y="54" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="700"
    font-style="italic" font-size="20" fill="#2563eb" letter-spacing="0.3">travel</text>
</svg>`.trim();

export const PROPUESTA_LOGO_SVG = LOGO_SVG;

const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function infoRow(label: string, value: string) {
  return `<tr>
    <td class="info-label">${escape(label)}:</td>
    <td class="info-value">${escape(value)}</td>
  </tr>`;
}

function alojamientoTable(d: PropuestaData): string {
  if (d.hoteles.length === 0) return "";
  const acomCols = d.acoms
    .map(
      (a) => `<th class="num">${escape(a)}<span class="unit">/noche</span></th>`,
    )
    .join("");

  const rows = d.hoteles
    .map((h) => {
      const meta = [h.ubicacion, h.estrellas].filter(Boolean).join(" · ");
      const acomVals = d.acoms
        .map(
          (a) =>
            `<td class="num"><strong>${escape(fmt(h.preciosPorAcomodacion[a]))}</strong></td>`,
        )
        .join("");
      return `<tr>
        <td>
          <div class="cell-title">${escape(h.nombre)}</div>
          ${meta ? `<div class="cell-sub">${escape(meta)}</div>` : ""}
          ${h.notas ? `<div class="cell-note">${escape(h.notas)}</div>` : ""}
        </td>
        <td>${escape(h.tipoHabitacion || "Standard")}</td>
        <td class="center">${escape(h.noches ?? d.cliente.noches ?? "—")}</td>
        ${acomVals}
      </tr>`;
    })
    .join("");

  return `
  <section class="block">
    <div class="pill pill-blue">ALOJAMIENTO</div>
    <table class="grid">
      <thead>
        <tr>
          <th>HOTEL</th>
          <th>TIPO HAB.</th>
          <th class="center">NOCHES</th>
          ${acomCols}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
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
        ? `<strong>${escape(fmt(s.totalesPorAcomodacion[d.primary]))}</strong>`
        : `<strong>${escape(fmt(s.unitAplicado ?? 0))}</strong> p/p`;

      const entradaNote =
        s.tipo === "tour" && s.entrada && s.entrada.precio > 0
          ? `<div class="cell-green">Entrada adicional${
              s.entrada.tipo
                ? ` (${escape(entradaTipoLabel(s.entrada.tipo))})`
                : ""
            }: ${escape(fmt(s.entrada.precio))} por persona${
              s.entrada.notas ? ` · ${escape(s.entrada.notas)}` : ""
            }</div>`
          : "";

      const displayName =
        s.tipo === "traslado" ? formatTrasladoNombre(s.nombre) : s.nombre;
      return `<tr>
        <td>
          <div class="cell-title">${escape(displayName)}</div>
          ${entradaNote}
          ${s.notas ? `<div class="cell-note">${escape(s.notas)}</div>` : ""}
        </td>
        <td>${escape(tipo)}</td>
        <td class="num">${tarifa}</td>
      </tr>`;
    })
    .join("");

  return `
  <section class="block">
    <div class="pill pill-blue">${escape(title)}</div>
    <table class="grid">
      <thead>
        <tr>
          <th>DESCRIPCIÓN</th>
          <th>TIPO</th>
          <th class="num">${d.isCalc ? "TOTAL" : "TARIFA P/P"}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function itinerarioTable(d: PropuestaData): string {
  if (d.itinerario.length === 0) return "";
  const rows = d.itinerario
    .map(
      (it) => `<tr>
        <td class="dia">${escape(it.dia)}</td>
        <td class="fecha">${escape(it.fecha || "—")}</td>
        <td>
          <div class="cell-title">${escape(it.actividad)}</div>
          ${
            d.incluirDescriptivos && it.descripcion
              ? `<div class="cell-note">${escape(it.descripcion)}</div>`
              : ""
          }
        </td>
      </tr>`,
    )
    .join("");

  return `
  <section class="block">
    <div class="pill pill-orange">ITINERARIO SUGERIDO</div>
    <table class="grid">
      <thead>
        <tr>
          <th class="w-narrow">DÍA</th>
          <th class="w-fecha">FECHA</th>
          <th>ACTIVIDAD</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function totalsBlock(d: PropuestaData): string {
  if (!d.isCalc) return "";
  const lines = d.acoms
    .map(
      (a) => `<div class="total-row ${a === d.primary ? "primary" : ""}">
        <span class="total-lbl">TOTAL ${escape(a)}</span>
        <span class="total-val">${escape(fmt(d.result.totalesPorAcomodacion[a]))}</span>
      </div>`,
    )
    .join("");

  return `
  <section class="block totals">
    <div class="pill pill-blue">RESUMEN DE COSTOS</div>
    <div class="totals-card">
      ${lines}
    </div>
  </section>`;
}

export const PROPUESTA_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    line-height: 1.45;
    font-size: 12px;
  }
  .doc {
    max-width: 820px;
    margin: 0 auto;
    padding: 36px 44px 56px;
    background: #ffffff;
  }
  /* Header */
  .doc-head {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 22px;
  }
  .doc-head .logo { width: 170px; flex-shrink: 0; }
  .doc-head .title-pill {
    flex: 1;
    background: #1e3a8a;
    color: #ffffff;
    text-align: center;
    border-radius: 999px;
    padding: 16px 28px;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1.2px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 48px;
    margin-bottom: 14px;
  }
  .info-grid table { width: 100%; border-collapse: collapse; }
  .info-grid td { padding: 4px 0; vertical-align: top; font-size: 12px; }
  .info-label { color: #475569; font-weight: 600; width: 44%; white-space: nowrap; }
  .info-value { color: #0f172a; font-weight: 500; }
  .divider {
    height: 2px;
    background: #f97316;
    margin: 14px 0 26px;
    border-radius: 2px;
  }

  /* Section pills */
  .pill {
    display: inline-block;
    padding: 8px 22px;
    border-radius: 999px;
    color: #ffffff;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 1.2px;
    margin-bottom: 12px;
  }
  .pill-blue { background: #1e3a8a; }
  .pill-orange { background: #f97316; }

  .block { margin-bottom: 26px; page-break-inside: avoid; }

  /* Tables */
  table.grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  table.grid thead th {
    text-align: left;
    color: #64748b;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.8px;
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    text-transform: uppercase;
  }
  table.grid thead th .unit {
    display: block;
    font-weight: 500;
    color: #94a3b8;
    text-transform: lowercase;
    letter-spacing: 0;
    font-size: 9px;
    margin-top: 2px;
  }
  table.grid tbody td {
    padding: 14px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
    color: #0f172a;
  }
  table.grid tbody tr:last-child td { border-bottom: none; }
  table.grid .num { text-align: right; }
  table.grid .center { text-align: center; }
  table.grid th.num { text-align: right; }
  table.grid th.center { text-align: center; }

  .cell-title { font-weight: 600; color: #0f172a; }
  .cell-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cell-note { font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; }
  .cell-green { font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 4px; }

  .dia { font-weight: 800; color: #2563eb; font-size: 13px; }
  .fecha { color: #64748b; font-size: 11px; white-space: nowrap; }
  .w-narrow { width: 50px; }
  .w-fecha { width: 110px; }

  /* Totals */
  .totals-card {
    border: 1px solid #dbeafe;
    border-radius: 14px;
    padding: 16px 22px;
    background: #f8fafc;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 0;
  }
  .total-row + .total-row { border-top: 1px dashed #e2e8f0; }
  .total-lbl { font-weight: 700; color: #475569; font-size: 11px; letter-spacing: 0.6px; }
  .total-val { font-weight: 700; color: #334155; font-size: 14px; }
  .total-row.primary .total-val { color: #1e3a8a; font-size: 22px; }

  @media print {
    body { background: #ffffff; }
    .doc { padding: 24px 32px; }
  }
`;

export function buildPropuestaBody(d: PropuestaData): string {
  return `
  <div class="doc">
    <div class="doc-head">
      <div class="logo">${LOGO_SVG}</div>
      <div class="title-pill">PROPUESTA DE SERVICIOS</div>
    </div>

    <div class="info-grid">
      <table>
        <tbody>
          ${infoRow("Fecha de Emisión", d.fechaEmision)}
          ${infoRow("Destino", d.destino)}
          ${infoRow("Fecha de Viaje", d.fechaViaje)}
          ${infoRow("Pasajeros", d.pasajerosLabel)}
        </tbody>
      </table>
      <table>
        <tbody>
          ${infoRow("Nº de Cotización", d.numeroCotizacion)}
          ${infoRow("Válida hasta", d.validaHasta)}
          ${infoRow("Tipo de Servicio", d.tipoServicio)}
          ${infoRow("Noche(s)", d.noches)}
          ${infoRow("Asesor", d.asesor)}
        </tbody>
      </table>
    </div>

    <div class="divider"></div>

    ${alojamientoTable(d)}
    ${adicionalesTable("TRASLADOS", d.traslados, d)}
    ${adicionalesTable("TOUR Y EXPERIENCIAS", d.tours, d)}
    ${adicionalesTable("VUELOS", d.vuelos, d)}
    ${itinerarioTable(d)}
    ${totalsBlock(d)}
  </div>`;
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
