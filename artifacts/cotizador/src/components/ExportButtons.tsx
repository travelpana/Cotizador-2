import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Printer,
  Save,
  Trash2,
  Eye,
  Check,
} from "lucide-react";
import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { fmt } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  onSave: () => void;
  onClear: () => void;
  onPreview: () => void;
}

export default function ExportButtons({
  cliente,
  servicios,
  result,
  modo,
  incluirItinerario,
  incluirDescriptivos,
  onSave,
  onClear,
  onPreview,
}: Props) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDest, setEmailDest] = useState("");
  const [waCopied, setWaCopied] = useState(false);

  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const adicionales = result.servicios.filter((s) => s.tipo !== "hotel");
  const isCalc = modo === "calculo";

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`*Cotización RGE Style Travel*`);
    lines.push(
      isCalc
        ? `_Modo: cálculo total_`
        : `_Modo: solo tarifas (sin totales)_`,
    );
    if (cliente.nombre) lines.push(`Cliente: ${cliente.nombre}`);
    if (cliente.fechaInicio)
      lines.push(`Fechas: ${cliente.fechaInicio} → ${cliente.fechaFin}`);
    lines.push(
      `Pasajeros: ${cliente.pasajeros}${cliente.ninos ? ` + ${cliente.ninos} niños` : ""} · ${cliente.noches} noches`,
    );
    if (hoteles.length) {
      lines.push("");
      lines.push(`*Alojamiento:*`);
      for (const s of hoteles) {
        const meta = [s.ubicacion, s.estrellas].filter(Boolean).join(" · ");
        lines.push(`• ${s.nombre}${meta ? ` (${meta})` : ""}`);
        if (s.fechaInicio || s.fechaFin)
          lines.push(
            `   ${s.fechaInicio || ""} → ${s.fechaFin || ""} · ${s.noches ?? ""} noches`,
          );
        for (const a of acoms) {
          lines.push(
            `   ${a}: ${
              isCalc
                ? fmt(s.totalesPorAcomodacion[a])
                : `${fmt(s.preciosPorAcomodacion[a])}/noche`
            }`,
          );
        }
      }
    }
    if (adicionales.length) {
      lines.push("");
      lines.push(`*Servicios adicionales:*`);
      for (const s of adicionales) {
        lines.push(
          `• [${s.tipo.toUpperCase()}] ${s.codigo} · ${s.nombre}${s.fecha ? ` (${s.fecha})` : ""}`,
        );
        lines.push(
          `   ${
            isCalc
              ? `Total: ${fmt(s.totalesPorAcomodacion[primary])}`
              : `Tarifa: ${fmt(s.unitAplicado ?? 0)} p/p`
          }`,
        );
      }
    }
    if (isCalc) {
      lines.push("");
      lines.push(`*Resumen de costos (${primary}):*`);
      lines.push(`Alojamiento: ${fmt(result.subtotalesPorTipo.hotel[primary])}`);
      lines.push(
        `Traslados:   ${fmt(result.subtotalesPorTipo.traslado[primary])}`,
      );
      lines.push(`Tours:       ${fmt(result.subtotalesPorTipo.tour[primary])}`);
      lines.push("");
      for (const a of acoms) {
        lines.push(
          `*GRAN TOTAL ${a}:* ${fmt(result.totalesPorAcomodacion[a])}`,
        );
      }
    }
    const it = incluirItinerario ? buildItinerario(cliente, servicios) : [];
    if (it.length > 0) {
      lines.push("");
      lines.push(`*Itinerario:*`);
      for (const d of it) {
        lines.push(
          `Día ${d.dia}${d.fecha ? ` (${d.fecha})` : ""}: ${d.actividad}`,
        );
      }
    }
    return lines.join("\n");
  };

  const buildHtml = () => {
    const it = incluirItinerario ? buildItinerario(cliente, servicios) : [];
    return `<!doctype html><html><head><meta charset="utf-8"><title>Cotización ${cliente.nombre || ""}</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:920px;margin:24px auto;padding:0 32px;line-height:1.45}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:24px}
  h1{margin:0;font-size:26px;font-weight:700}
  .brand{color:#2563eb}
  .meta{font-size:13px;color:#475569;margin-top:4px}
  .right{text-align:right;font-size:13px}
  .modeTag{display:inline-block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:3px 8px;border-radius:4px;margin-top:6px}
  .modeTag.calc{background:#dbeafe;color:#1d4ed8}
  .modeTag.tarifas{background:#fef3c7;color:#a16207}
  h2{margin:28px 0 10px;font-size:13px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.06em}
  .grid{display:grid;${isCalc ? "grid-template-columns:1fr 260px" : "grid-template-columns:1fr"};gap:32px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead tr{border-bottom:2px solid #cbd5e1}
  th{text-align:left;padding:8px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;font-weight:600}
  td{padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  td.r,th.r{text-align:right}
  td.c,th.c{text-align:center}
  .code{font-size:10px;color:#2563eb;font-weight:700;text-transform:uppercase}
  .meta-line{font-size:11px;color:#64748b;margin-top:2px}
  .notas{font-size:11px;color:#64748b;font-style:italic;margin-top:2px}
  .summary{border:2px solid #dbeafe;background:#f8fafc;border-radius:16px;padding:20px}
  .summary .label{font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
  .sub{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}
  .totals-block{border-top:2px solid #bfdbfe;margin-top:16px;padding-top:14px}
  .total-line{display:flex;justify-content:space-between;align-items:baseline;margin-top:6px}
  .total-line .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:700}
  .total-line .val{font-size:15px;font-weight:700;color:#334155}
  .total-line.primary .val{font-size:26px;color:#2563eb}
  .typeTag{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;font-weight:700}
  .info{background:#fef3c7;border:1px solid #fde68a;color:#78350f;padding:14px;border-radius:12px;font-size:13px;margin-top:24px}
  .unitNote{font-size:9px;font-weight:400;color:#94a3b8;text-transform:none;letter-spacing:0;display:block}
</style></head><body>
<div class="header">
  <div>
    <h1>Cotización <span class="brand">de Viaje</span></h1>
    <div class="meta">RGE Style Travel · ${new Date().toLocaleDateString("es-ES")}</div>
    <div class="modeTag ${isCalc ? "calc" : "tarifas"}">${isCalc ? "Modo: cálculo total" : "Modo: solo tarifas"}</div>
  </div>
  <div class="right">
    ${cliente.nombre ? `<div><span style="color:#64748b">Cliente:</span> <strong>${cliente.nombre}</strong></div>` : ""}
    <div class="meta">${cliente.pasajeros} pax${cliente.ninos ? ` + ${cliente.ninos} niños` : ""} · ${cliente.noches} noches</div>
    ${cliente.fechaInicio ? `<div class="meta">${cliente.fechaInicio} → ${cliente.fechaFin}</div>` : ""}
  </div>
</div>

<div class="grid">
  <div>
    ${
      hoteles.length
        ? `<h2>Alojamiento</h2>
    <table>
      <thead><tr>
        <th>Hotel</th><th>Check-in</th><th>Check-out</th><th class="c">Noches</th>
        ${acoms.map((a) => `<th class="r">${a}${!isCalc ? `<span class="unitNote">/noche</span>` : ""}</th>`).join("")}
      </tr></thead>
      <tbody>
        ${hoteles
          .map(
            (s) => `<tr>
          <td>
            <div style="font-weight:600">${s.nombre}</div>
            <div class="meta-line">${[s.ubicacion, s.estrellas, s.vigencia].filter(Boolean).join(" · ")}</div>
            ${s.notas ? `<div class="notas">${s.notas}</div>` : ""}
          </td>
          <td>${s.fechaInicio || "—"}</td>
          <td>${s.fechaFin || "—"}</td>
          <td class="c">${s.noches ?? "—"}</td>
          ${acoms.map((a) => `<td class="r"><b>${isCalc ? fmt(s.totalesPorAcomodacion[a]) : fmt(s.preciosPorAcomodacion[a])}</b></td>`).join("")}
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
        : ""
    }

    ${
      adicionales.length
        ? `<h2>Servicios adicionales</h2>
    <table>
      <thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th><th class="r">${isCalc ? "Total" : "Tarifa p/p"}</th></tr></thead>
      <tbody>
        ${adicionales
          .map(
            (s) => `<tr>
          <td><span class="typeTag">${s.tipo}</span></td>
          <td>
            <div class="code">${s.codigo}</div>
            <div style="font-weight:600">${s.nombre}</div>
            ${s.notas ? `<div class="notas">${s.notas}</div>` : ""}
          </td>
          <td>${s.fecha || "—"}</td>
          <td class="r"><b>${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} p/p`}</b></td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
        : ""
    }

    ${
      it.length
        ? `<h2>Itinerario</h2>
    <table>
      <thead><tr><th>Día</th><th>Fecha</th><th>Actividad</th><th>Hotel</th></tr></thead>
      <tbody>
        ${it
          .map(
            (d) => `<tr>
          <td><b style="color:#2563eb">${d.dia}</b></td>
          <td>${d.fecha || "—"}</td>
          <td>
            <b>${d.actividad}</b>
            ${incluirDescriptivos && d.descripcion ? `<div class="notas">${d.descripcion}</div>` : ""}
          </td>
          <td>${d.hotel}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`
        : ""
    }

    ${!isCalc ? `<div class="info">Esta cotización se presenta en modo <b>solo tarifas</b>: los precios mostrados son unitarios (por noche / por persona) y no incluyen el cálculo de totales.</div>` : ""}
  </div>

  ${
    isCalc
      ? `<aside>
    <div class="summary">
      <div class="label">Resumen de costos</div>
      <div class="sub"><span>Alojamiento</span><b>${fmt(result.subtotalesPorTipo.hotel[primary])}</b></div>
      <div class="sub"><span>Traslados</span><b>${fmt(result.subtotalesPorTipo.traslado[primary])}</b></div>
      <div class="sub"><span>Tours</span><b>${fmt(result.subtotalesPorTipo.tour[primary])}</b></div>
      <div class="totals-block">
        ${acoms
          .map(
            (a) => `<div class="total-line ${a === primary ? "primary" : ""}">
          <span class="lbl">Total ${a}</span>
          <span class="val">${fmt(result.totalesPorAcomodacion[a])}</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </aside>`
      : ""
  }
</div>
</body></html>`;
  };

  const copyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const sendEmail = () => {
    const subject = encodeURIComponent(
      `Cotización ${cliente.nombre || ""} - RGE Style Travel`,
    );
    const body = encodeURIComponent(buildText());
    window.location.href = `mailto:${emailDest}?subject=${subject}&body=${body}`;
    setEmailOpen(false);
  };

  const handlePdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-2">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
          Acciones
        </div>
        <button
          onClick={onPreview}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
        >
          <Eye className="w-4 h-4" />
          Vista previa
        </button>
        <button
          onClick={copyWhatsapp}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          {waCopied ? (
            <>
              <Check className="w-4 h-4" />
              ¡Copiado!
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              Copiar WhatsApp
            </>
          )}
        </button>
        <button
          onClick={handlePdf}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Descargar PDF
        </button>

        <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5">
          <IconBtn onClick={() => setEmailOpen(true)} title="Email">
            <Mail className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={onSave} title="Guardar">
            <Save className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={onClear} title="Limpiar" danger>
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>
      </div>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Enviar por Email"
        subtitle="Se abrirá tu cliente de correo predeterminado"
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Email destinatario
            </label>
            <input
              type="email"
              value={emailDest}
              onChange={(e) => setEmailDest(e.target.value)}
              placeholder="cliente@correo.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={() => setEmailOpen(false)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={sendEmail}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Abrir correo
          </button>
        </div>
      </Modal>
    </>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
