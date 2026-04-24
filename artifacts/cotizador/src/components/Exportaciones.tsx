import { useState } from "react";
import {
  MessageCircle,
  Mail,
  FileDown,
  Save,
  Trash2,
  Copy,
  Printer,
} from "lucide-react";
import type { Cliente, CotizacionResult, ServicioSeleccionado } from "@/lib/types";
import { fmt } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  incluirDescriptivos: boolean;
  onSave: () => void;
  onClear: () => void;
}

export default function Exportaciones({
  cliente,
  servicios,
  result,
  incluirDescriptivos,
  onSave,
  onClear,
}: Props) {
  const [emailDest, setEmailDest] = useState("");
  const [whatsappNum, setWhatsappNum] = useState("");
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`*Cotización RGE Style Travel*`);
    if (cliente.nombre) lines.push(`Cliente: ${cliente.nombre}`);
    if (cliente.fechaInicio)
      lines.push(`Fechas: ${cliente.fechaInicio} → ${cliente.fechaFin}`);
    lines.push(
      `Pasajeros: ${cliente.pasajeros}${cliente.ninos ? ` + ${cliente.ninos} niños` : ""} · ${cliente.noches} noches`,
    );
    lines.push("");
    lines.push(`*Servicios:*`);
    for (const s of result.servicios) {
      lines.push(`• ${s.nombre} (${s.detalle})`);
      for (const a of result.acomodaciones) {
        lines.push(`   ${a}: ${fmt(s.totalesPorAcomodacion[a])}`);
      }
    }
    lines.push("");
    lines.push(`*Totales por acomodación:*`);
    for (const a of result.acomodaciones) {
      lines.push(`${a}: ${fmt(result.totalesPorAcomodacion[a])}`);
    }
    return lines.join("\n");
  };

  const buildHtml = () => {
    const it = buildItinerario(cliente, servicios);
    return `<!doctype html><html><head><meta charset="utf-8"><title>Cotización ${cliente.nombre || ""}</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:780px;margin:24px auto;padding:0 24px;line-height:1.45}
  h1{margin:0 0 4px 0;font-size:22px}
  h2{margin:24px 0 8px;font-size:16px;border-bottom:2px solid #38bdf8;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0}
  th{background:#f1f5f9;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .totales{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
  .total-card{flex:1;min-width:140px;border:2px solid #38bdf8;border-radius:8px;padding:12px}
  .total-card .label{font-size:11px;color:#64748b;text-transform:uppercase}
  .total-card .val{font-size:22px;font-weight:700}
  .meta{color:#64748b;font-size:13px}
  .brand{color:#38bdf8;font-weight:700}
</style></head><body>
<h1>Cotización <span class="brand">RGE Style Travel</span></h1>
<div class="meta">${cliente.nombre ? `Cliente: <b>${cliente.nombre}</b> · ` : ""}${cliente.fechaInicio ? `Fechas: ${cliente.fechaInicio} → ${cliente.fechaFin} · ` : ""}${cliente.pasajeros} pax${cliente.ninos ? ` + ${cliente.ninos} niños` : ""} · ${cliente.noches} noches</div>

<h2>Servicios</h2>
<table>
  <thead><tr><th>Servicio</th><th>Detalle</th>${result.acomodaciones.map((a) => `<th>${a}</th>`).join("")}</tr></thead>
  <tbody>
    ${result.servicios
      .map(
        (s) => `<tr>
      <td><b>${s.nombre}</b></td>
      <td>${s.detalle}</td>
      ${result.acomodaciones.map((a) => `<td>${fmt(s.totalesPorAcomodacion[a])}</td>`).join("")}
    </tr>`,
      )
      .join("")}
    <tr style="background:#f8fafc;font-weight:700">
      <td colspan="2">TOTAL</td>
      ${result.acomodaciones.map((a) => `<td>${fmt(result.totalesPorAcomodacion[a])}</td>`).join("")}
    </tr>
  </tbody>
</table>

<h2>Totales por acomodación</h2>
<div class="totales">
${result.acomodaciones
  .map(
    (a) => `<div class="total-card"><div class="label">${a}</div><div class="val">${fmt(result.totalesPorAcomodacion[a])}</div></div>`,
  )
  .join("")}
</div>

<h2>Itinerario</h2>
<table>
  <thead><tr><th>Día</th><th>Fecha</th><th>Actividad</th><th>Hotel</th></tr></thead>
  <tbody>
    ${it
      .map(
        (d) => `<tr>
      <td>${d.dia}</td>
      <td>${d.fecha || "—"}</td>
      <td><b>${d.actividad}</b>${incluirDescriptivos && d.descripcion ? `<br><span style="color:#64748b;font-size:12px">${d.descripcion}</span>` : ""}</td>
      <td>${d.hotel}</td>
    </tr>`,
      )
      .join("")}
  </tbody>
</table>
</body></html>`;
  };

  const handleWhatsapp = () => {
    const num = whatsappNum.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(buildText());
    const url = num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(
      `Cotización ${cliente.nombre || ""} - RGE Style Travel`,
    );
    const body = encodeURIComponent(buildText());
    const url = `mailto:${emailDest}?subject=${subject}&body=${body}`;
    window.location.href = url;
  };

  const handlePdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(buildHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="card-white p-6">
      <h2 className="text-lg font-semibold mb-4">Exportar y compartir</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={whatsappNum}
            onChange={(e) => setWhatsappNum(e.target.value)}
            placeholder="WhatsApp (con código país, opcional)"
            className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleWhatsapp}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            value={emailDest}
            onChange={(e) => setEmailDest(e.target.value)}
            placeholder="Email destinatario"
            className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleEmail}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePdf}
          className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          PDF / Imprimir
        </button>
        <button
          onClick={handleCopyHtml}
          className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? "¡HTML copiado!" : "Copiar HTML"}
        </button>
        <button
          onClick={handlePdf}
          className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          Vista previa
        </button>
        <div className="flex-1" />
        <button
          onClick={onSave}
          className="px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Guardar cotización
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Limpiar
        </button>
      </div>
    </div>
  );
}
