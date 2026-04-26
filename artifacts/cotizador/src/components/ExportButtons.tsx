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
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { fmt, entradaTipoLabel } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";
import { buildPropuestaHtml } from "@/lib/propuesta";

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
  onAutoSave?: () => void;
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
  onAutoSave,
}: Props) {
  const [waCopied, setWaCopied] = useState(false);
  const [mailCopied, setMailCopied] = useState(false);

  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const adicionales = result.servicios.filter((s) => s.tipo !== "hotel");
  const isCalc = modo === "calculo";

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`*PROPUESTA DE SERVICIOS · RGE Style Travel*`);
    if (cliente.nombre) lines.push(`Cliente: ${cliente.nombre}`);
    if (cliente.fechaInicio)
      lines.push(`Fecha de viaje: ${cliente.fechaInicio} → ${cliente.fechaFin}`);
    lines.push(
      `Pasajeros: ${cliente.pasajeros}${cliente.ninos ? ` + ${cliente.ninos} niños` : ""} · ${cliente.noches} noche(s)`,
    );
    if (hoteles.length) {
      lines.push("");
      lines.push(`*ALOJAMIENTO*`);
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
    const traslados = adicionales.filter((s) => s.tipo === "traslado");
    const tours = adicionales.filter((s) => s.tipo === "tour");
    const vuelos = adicionales.filter((s) => s.tipo === "vuelo");

    const block = (title: string, items: typeof adicionales) => {
      if (items.length === 0) return;
      lines.push("");
      lines.push(`*${title}*`);
      for (const s of items) {
        lines.push(`• ${s.nombre}${s.fecha ? ` (${s.fecha})` : ""}`);
        if (s.tipo === "tour" && s.entrada && s.entrada.precio > 0) {
          lines.push(
            `   Entrada adicional (${entradaTipoLabel(s.entrada.tipo)}): ${fmt(s.entrada.precio)} por persona${s.entrada.notas ? ` · ${s.entrada.notas}` : ""}`,
          );
        }
        lines.push(
          `   ${
            isCalc
              ? `Total: ${fmt(s.totalesPorAcomodacion[primary])}`
              : `Tarifa: ${fmt(s.unitAplicado ?? 0)} p/p`
          }`,
        );
      }
    };

    block("TRASLADOS", traslados);
    block("TOUR Y EXPERIENCIAS", tours);
    block("VUELOS", vuelos);

    if (isCalc) {
      lines.push("");
      lines.push(`*RESUMEN DE COSTOS*`);
      for (const a of acoms) {
        lines.push(`Total ${a}: ${fmt(result.totalesPorAcomodacion[a])}`);
      }
    }

    const it = incluirItinerario ? buildItinerario(cliente, servicios) : [];
    if (it.length > 0) {
      lines.push("");
      lines.push(`*ITINERARIO SUGERIDO*`);
      for (const d of it) {
        lines.push(
          `Día ${d.dia}${d.fecha ? ` (${d.fecha})` : ""}: ${d.actividad}`,
        );
      }
    }
    return lines.join("\n");
  };

  const buildHtml = () =>
    buildPropuestaHtml({
      cliente,
      servicios,
      result,
      modo,
      incluirItinerario,
      incluirDescriptivos,
    });

  const copyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setWaCopied(true);
      setTimeout(() => setWaCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(buildHtml());
      setMailCopied(true);
      setTimeout(() => setMailCopied(false), 2000);
      onAutoSave?.();
    } catch {
      // noop
    }
  };

  const handlePdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    setTimeout(() => w.print(), 350);
    onAutoSave?.();
  };

  return (
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
        title="Copia el HTML del correo (mismo diseño que el PDF) listo para pegar en tu cliente de email"
      >
        {mailCopied ? (
          <>
            <Check className="w-4 h-4" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            Copiar correo (HTML)
          </>
        )}
      </button>
      <button
        onClick={handlePdf}
        style={{ backgroundColor: "#2c4294" }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:brightness-110"
      >
        <Printer className="w-4 h-4" />
        Descargar PDF
      </button>

      <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
        <IconBtn onClick={onSave} title="Guardar">
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
