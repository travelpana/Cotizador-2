import { useEffect, useRef, useState } from "react";
import { X, Plus, Sparkles } from "lucide-react";
import type { Acomodacion, ServicioSeleccionado } from "@/lib/types";

type CustomTipo = "hotel" | "traslado" | "tour" | "otro";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (s: ServicioSeleccionado) => void;
  globalFechaInicio?: string;
  globalFechaFin?: string;
}

const TIPO_OPTIONS: { value: CustomTipo; label: string }[] = [
  { value: "hotel", label: "Alojamiento" },
  { value: "traslado", label: "Traslado" },
  { value: "tour", label: "Tours" },
  { value: "otro", label: "Otro" },
];

const ALL_ACOM: Acomodacion[] = ["SGL", "DBL", "TPL", "CHD"];

export default function CustomItemModal({
  open,
  onClose,
  onSave,
  globalFechaInicio,
  globalFechaFin,
}: Props) {
  const [tipo, setTipo] = useState<CustomTipo>("otro");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [notas, setNotas] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTipo("otro");
      setNombre("");
      setPrecio("");
      setNotas("");
      window.setTimeout(() => nombreRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = nombre.trim();
    if (!trimmed) {
      nombreRef.current?.focus();
      return;
    }
    const value = Number(precio) || 0;
    const baseId = `MAN-${Date.now()}`;

    const internalTipo: ServicioSeleccionado["tipo"] =
      tipo === "hotel" ? "hotel" : tipo === "traslado" ? "traslado" : "tour";

    const precios: ServicioSeleccionado["precios"] =
      tipo === "hotel"
        ? Object.fromEntries(ALL_ACOM.map((a) => [a, value]))
        : { p1: value, p2_5: value, p6_10: value, chd: value };

    const displayName = tipo === "otro" ? `[Otro] ${trimmed}` : trimmed;

    const servicio: ServicioSeleccionado = {
      id: baseId,
      codigo: baseId,
      tipo: internalTipo,
      nombre: displayName,
      precios,
      manual: true,
      notas: notas.trim() || undefined,
      ...(tipo === "hotel"
        ? {
            fechaInicio: globalFechaInicio || undefined,
            fechaFin: globalFechaFin || undefined,
          }
        : {}),
    };

    onSave(servicio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">
                Ítem personalizado
              </h2>
              <p className="text-[11px] text-slate-500">
                Agrega un servicio que no está en el tarifario
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Tipo de servicio
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CustomTipo)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Nombre del servicio
            </label>
            <input
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cena especial en restaurante"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Precio (USD)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 tabular-nums"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {tipo === "hotel"
                ? "Se aplicará el mismo valor a todas las acomodaciones"
                : "Precio por persona, igual para todos los rangos"}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales que aparecerán en la cotización"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200/60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </footer>
      </form>
    </div>
  );
}
