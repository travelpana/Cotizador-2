import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Printer,
  Save,
  Trash2,
  Eye,
  Check,
  Loader2,
} from "lucide-react";
import html2pdfImport from "html2pdf.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const html2pdf = html2pdfImport as unknown as (...args: any[]) => any;
import type {
  Cliente,
  CotizacionResult,
  Descriptivo,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { fmt } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";
import { buildPropuestaHtml } from "@/lib/propuesta";

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  incluirDescriptivoCompleto: boolean;
  descriptivos: Descriptivo[];
  actividadesOverride?: Record<number, string>;
  onSave: () => void;
  onClear: () => void;
  onPreview: () => void;
  onAutoSave?: () => void;
  /** Returns true when the form is valid; otherwise it should highlight the invalid fields and surface a message. */
  validateBeforeAction: () => boolean;
  /**
   * Returns the cotización number to use for every export (PDF, email, WhatsApp,
   * preview). The same value is reused across actions so the code shown in the
   * preview, the PDF header and the Seguimiento table all match.
   */
  getNumeroCotizacion: () => string;
}

const EMAIL_INTRO =
  "Hola,\n\nUn gusto saludarte. Conforme a lo solicitado, te comparto la cotización de los servicios de su interés:";

/** Formats an ISO date (YYYY-MM-DD) as DD-MM-YYYY (e.g. 28-05-2026). */
function fmtDMA(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
}

export default function ExportButtons({
  cliente,
  servicios,
  result,
  modo,
  incluirItinerario,
  incluirDescriptivos,
  incluirDescriptivoCompleto,
  descriptivos,
  actividadesOverride,
  onSave,
  onClear,
  onPreview,
  onAutoSave,
  validateBeforeAction,
  getNumeroCotizacion,
}: Props) {
  const [waCopied, setWaCopied] = useState(false);
  const [mailCopied, setMailCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const adicionales = result.servicios.filter((s) => s.tipo !== "hotel");
  const isCalc = modo === "calculo";

  const SEP = "━━━━━━━━━━━━━━━━━━";

  const buildText = () => {
    const lines: string[] = [];

    // ── Encabezado ──────────────────────────────────────────────
    lines.push("Hola! Un gusto saludarte ✨");
    lines.push("");
    lines.push("A continuación comparto los detalles de su cotización:");
    lines.push("");

    if (cliente.fechaInicio) {
      const inicio = fmtDMA(cliente.fechaInicio);
      const fin = cliente.fechaFin ? fmtDMA(cliente.fechaFin) : "";
      lines.push(`📅 *Fechas:* ${inicio}${fin ? ` al ${fin}` : ""}`);
    }
    const pasajerosStr = `${cliente.pasajeros} adulto${cliente.pasajeros === 1 ? "" : "s"}${
      cliente.ninos ? ` + ${cliente.ninos} niño${cliente.ninos === 1 ? "" : "s"}` : ""
    }`;
    lines.push(`👥 *Pasajeros:* ${pasajerosStr}`);

    // ── Alojamiento ──────────────────────────────────────────────
    if (hoteles.length) {
      lines.push("");
      lines.push(SEP);
      lines.push("🏨 *ALOJAMIENTO*");
      lines.push(SEP);
      lines.push("");

      for (const s of hoteles) {
        const starsLabel = s.estrellas ? ` · ${s.estrellas}` : "";
        lines.push(`• *${s.nombre}*${starsLabel}`);

        if (s.fechaInicio || s.fechaFin) {
          const start = s.fechaInicio ? fmtDMA(s.fechaInicio) : "";
          const end = s.fechaFin ? fmtDMA(s.fechaFin) : "";
          const n = s.noches ?? cliente.noches ?? "";
          const nochesLabel = n === 1 ? "1 noche" : `${n} noches`;
          lines.push(`📍 ${start}${end ? ` → ${end}` : ""} · ${nochesLabel}`);
        }

        if (s.tipoHabitacion) {
          lines.push(`🛏 Habitación: ${s.tipoHabitacion}`);
        }

        for (const a of acoms) {
          if (isCalc) {
            lines.push(`💲 ${a}: ${fmt(s.totalesPorAcomodacion[a])}`);
          } else {
            lines.push(`💲 ${a}: ${fmt(s.preciosPorAcomodacion[a])}`);
          }
        }

        if (s.notas) {
          lines.push(`🍽 ${s.notas}`);
        }

        lines.push("");
      }

      lines.push("ℹ️ Tarifas netas por persona y por noche.");
      lines.push("ℹ️ Disponibilidad sujeta al momento de la reserva.");
    }

    const traslados = adicionales.filter((s) => s.tipo === "traslado");
    const tours = adicionales.filter((s) => s.tipo === "tour");
    const vuelos = adicionales.filter((s) => s.tipo === "vuelo");

    // ── Traslados ────────────────────────────────────────────────
    if (traslados.length) {
      lines.push("");
      lines.push(SEP);
      lines.push("🚐 *TRASLADOS*");
      lines.push(SEP);
      lines.push("");

      for (const s of traslados) {
        lines.push(`• ${s.nombre}`);
        const modalidad = s.tipoServicio
          ? s.tipoServicio
          : s.detalle?.toLowerCase().includes("privado")
            ? "Privado"
            : "Regular";
        lines.push(`🚐 Modalidad: ${modalidad}`);
        lines.push(
          `💲 Tarifa: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} por persona`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notas}`);
        lines.push("");
      }
    }

    // ── Tours ────────────────────────────────────────────────────
    if (tours.length) {
      lines.push("");
      lines.push(SEP);
      lines.push("🌴 *TOURS Y EXPERIENCIAS*");
      lines.push(SEP);
      lines.push("");

      for (const s of tours) {
        lines.push(`• *${s.nombre}*`);
        if (s.horario) {
          lines.push(`🕒 ${s.horario}`);
        }
        if (s.tickets?.enabled && s.tickets.adultPrice > 0) {
          const label = s.tickets.label || "Entradas";
          const childPart =
            s.tickets.childPrice && s.tickets.childPrice > 0
              ? ` · Niños ${fmt(s.tickets.childPrice)} p/p`
              : "";
          lines.push(`🎟 Costo adicional entradas: ${label} ${fmt(s.tickets.adultPrice)} p/p${childPart}`);
        } else {
          lines.push("🎟 No incluye entradas");
        }
        lines.push(
          `💲 Tarifa: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} por persona`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notas}`);
        lines.push("");
      }
    }

    // ── Vuelos ───────────────────────────────────────────────────
    if (vuelos.length) {
      lines.push("");
      lines.push(SEP);
      lines.push("✈️ *VUELOS*");
      lines.push(SEP);
      lines.push("");

      for (const s of vuelos) {
        lines.push(`• ${s.nombre}`);
        lines.push(
          `💲 Tarifa: ${isCalc ? fmt(s.totalesPorAcomodacion[primary]) : `${fmt(s.unitAplicado ?? 0)} por persona`}`,
        );
        if (s.notas) lines.push(`ℹ️ ${s.notas}`);
        lines.push("");
      }
    }

    // ── Resumen de costos (modo cálculo) ─────────────────────────
    if (isCalc) {
      lines.push("");
      lines.push(SEP);
      lines.push("💰 *RESUMEN DE COSTOS*");
      lines.push(SEP);
      lines.push("");
      for (const a of acoms) {
        lines.push(`• ${a}: *${fmt(result.totalesPorAcomodacion[a])}* por persona`);
      }
    }

    // ── Itinerario ───────────────────────────────────────────────
    const overrides = actividadesOverride ?? {};
    const it = incluirItinerario
      ? buildItinerario(cliente, servicios).map((d) =>
          overrides[d.dia] !== undefined
            ? { ...d, actividad: overrides[d.dia] }
            : d,
        )
      : [];
    if (it.length > 0) {
      lines.push("");
      lines.push(SEP);
      lines.push("🗓 *ITINERARIO SUGERIDO*");
      lines.push(SEP);
      lines.push("");
      for (const d of it) {
        const fechaLabel = d.fecha ? ` · ${d.fecha}` : "";
        lines.push(`*Día ${d.dia}*${fechaLabel}`);
        lines.push(d.actividad);
        lines.push("");
      }
    }

    // ── Descriptivos ─────────────────────────────────────────────
    if (incluirDescriptivoCompleto && descriptivos.length) {
      const seen = new Set<string>();
      const tourDescs: Descriptivo[] = [];
      for (const t of tours) {
        const code = t.codigo || t.id;
        if (!code || seen.has(code)) continue;
        const d = descriptivos.find((x) => x.codigo === code);
        if (d) {
          seen.add(code);
          tourDescs.push(d);
        }
      }
      if (tourDescs.length) {
        lines.push("");
        lines.push(SEP);
        lines.push("📋 *DESCRIPTIVOS*");
        lines.push(SEP);
        for (const t of tourDescs) {
          lines.push("");
          lines.push(`*${t.titulo}*`);
          const infoBits: string[] = [];
          if (t.info) infoBits.push(t.info);
          if (t.horarioExtra) infoBits.push(t.horarioExtra);
          if (infoBits.length) lines.push(`_${infoBits.join(" · ")}_`);
          lines.push("");
          for (const p of t.parrafos ?? []) {
            lines.push(p);
          }
          if (t.incluye) {
            lines.push("");
            lines.push(`*✅ Incluye:*`);
            lines.push(t.incluye);
          }
          if (t.observaciones) {
            lines.push("");
            lines.push(`*⚠️ Observaciones:*`);
            lines.push(t.observaciones);
          }
          if (t.recomendaciones) {
            lines.push("");
            lines.push(`*💡 Recomendaciones:*`);
            lines.push(t.recomendaciones);
          }
          if (t.notaImportante) {
            lines.push("");
            lines.push(`*🔴 Nota importante:*`);
            lines.push(t.notaImportante);
          }
        }
      }
    }

    // Trim trailing blank lines
    while (lines.length && lines[lines.length - 1] === "") lines.pop();

    return lines.join("\n");
  };

  const buildHtml = (numeroCotizacion: string, intro?: string) =>
    buildPropuestaHtml({
      cliente,
      servicios,
      result,
      modo,
      incluirItinerario,
      incluirDescriptivos,
      incluirDescriptivoCompleto,
      descriptivos,
      actividadesOverride,
      numeroCotizacion,
      intro,
    });

  const sanitizeForFilename = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .slice(0, 40) || "Cliente";

  const copyWhatsapp = async () => {
    if (!validateBeforeAction()) return;
    try {
      await navigator.clipboard.writeText(buildText());
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const copyEmail = async () => {
    if (!validateBeforeAction()) return;
    try {
      const numero = getNumeroCotizacion();
      const html = buildHtml(numero, EMAIL_INTRO);
      const text = `${EMAIL_INTRO}\n\n${buildText()}`;

      let copied = false;
      const w = window as unknown as {
        ClipboardItem?: typeof ClipboardItem;
      };
      if (
        w.ClipboardItem &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        try {
          const item = new w.ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          });
          await navigator.clipboard.write([item]);
          copied = true;
        } catch {
          // fall through to legacy method
        }
      }

      if (!copied) {
        const container = document.createElement("div");
        container.setAttribute("contenteditable", "true");
        container.style.position = "fixed";
        container.style.left = "-10000px";
        container.style.top = "0";
        container.style.opacity = "0";
        container.innerHTML = html;
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNodeContents(container);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand("copy");
        sel?.removeAllRanges();
        document.body.removeChild(container);
        copied = true;
      }

      if (copied) {
        setMailCopied(true);
        setTimeout(() => setMailCopied(false), 2000);
        onAutoSave?.();
      }
    } catch (err) {
      console.error("Copy email failed:", err);
    }
  };

  const handlePdf = async () => {
    if (pdfLoading) return;
    if (!validateBeforeAction()) return;
    setPdfError(false);
    setPdfLoading(true);

    const numero = getNumeroCotizacion();
    const clienteSafe = sanitizeForFilename(cliente.nombre || "");
    const filename = `Cotizacion-${numero}-${clienteSafe}.pdf`;

    let iframe: HTMLIFrameElement | null = null;

    try {
      const html = buildHtml(numero);

      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "816px";
      iframe.style.height = "1056px";
      iframe.style.border = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("No iframe document");
      doc.open();
      doc.write(html);
      doc.close();

      await new Promise<void>((resolve) => {
        if (doc.readyState === "complete") {
          resolve();
        } else {
          iframe!.onload = () => resolve();
          setTimeout(() => resolve(), 1500);
        }
      });

      const images = Array.from(doc.images);
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      );

      const target = doc.body;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: 816,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(target)
        .save();

      onAutoSave?.();
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfError(true);
      setTimeout(() => setPdfError(false), 3000);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setPdfLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-2">
      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
        Acciones
      </div>
      <button
        onClick={() => onPreview()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
      >
        <Eye className="w-4 h-4" />
        Vista previa
      </button>
      <button
        onClick={copyWhatsapp}
        style={{ backgroundColor: "#1a87c5" }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-95"
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
        onClick={copyEmail}
        style={{ backgroundColor: "#f07e14" }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-95"
        title="Copia el correo (mismo diseño que el PDF) listo para pegar en tu cliente de email"
      >
        {mailCopied ? (
          <>
            <Check className="w-4 h-4" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            Copiar correo
          </>
        )}
      </button>
      <button
        onClick={handlePdf}
        disabled={pdfLoading}
        style={{ backgroundColor: pdfError ? "#b91c1c" : "#2c4294" }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-110 disabled:opacity-70 disabled:cursor-wait"
      >
        {pdfLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando PDF…
          </>
        ) : pdfError ? (
          <>
            <Printer className="w-4 h-4" />
            Error al generar PDF
          </>
        ) : (
          <>
            <Printer className="w-4 h-4" />
            Descargar PDF
          </>
        )}
      </button>

      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
        <IconBtn
          onClick={() => {
            if (!validateBeforeAction()) return;
            onSave();
          }}
          title="Guardar"
        >
          <Save className="w-4 h-4" />
          Guardar
        </IconBtn>
        <IconBtn onClick={onClear} title="Limpiar" danger>
          <Trash2 className="w-4 h-4" />
          Limpiar
        </IconBtn>
      </div>
    </div>
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
