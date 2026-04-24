import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Printer,
  Save,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
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

export default function ExportButtons({
  cliente,
  servicios,
  result,
  incluirDescriptivos,
  onSave,
  onClear,
}: Props) {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappNum, setWhatsappNum] = useState("");
  const [emailDest, setEmailDest] = useState("");
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
  .total-card{flex:1;min-width:140px;border:2px solid #38bdf8;border-radius:12px;padding:12px}
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

  const sendWhatsapp = () => {
    const num = whatsappNum.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(buildText());
    const url = num
      ? `https://wa.me/${num}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    setWhatsappOpen(false);
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

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(buildHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md p-5 space-y-2">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
          Compartir cotización
        </div>
        <button
          onClick={() => setWhatsappOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar por WhatsApp
        </button>
        <button
          onClick={() => setEmailOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" />
          Enviar por Email
        </button>
        <button
          onClick={handlePdf}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Generar PDF
        </button>

        <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5">
          <IconBtn onClick={handleCopyHtml} title={copied ? "Copiado" : "Copiar HTML"}>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
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
        open={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        title="Enviar por WhatsApp"
        subtitle="Opcional: número del destinatario con código país"
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Número (ej: 50760000000)
            </label>
            <input
              value={whatsappNum}
              onChange={(e) => setWhatsappNum(e.target.value)}
              placeholder="Déjalo vacío para enviar a tus contactos"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
            {buildText()}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={() => setWhatsappOpen(false)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={sendWhatsapp}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Abrir WhatsApp
          </button>
        </div>
      </Modal>

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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
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
