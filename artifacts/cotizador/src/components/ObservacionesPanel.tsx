import { useMemo } from "react";
import { FileText, Sparkles, Check } from "lucide-react";
import {
  loadObservaciones,
  getSugeridos,
  type ObservacionRapida,
} from "@/lib/observaciones";
import type { ServicioSeleccionado } from "@/lib/types";

interface Props {
  servicios: ServicioSeleccionado[];
  seleccionadas: string[];
  onSeleccionadasChange: (ids: string[]) => void;
  manual: string;
  onManualChange: (text: string) => void;
}

export default function ObservacionesPanel({
  servicios,
  seleccionadas,
  onSeleccionadasChange,
  manual,
  onManualChange,
}: Props) {
  const catalog = useMemo(() => loadObservaciones(), []);
  const activas = useMemo(
    () => catalog.filter((o) => o.activo).sort((a, b) => a.orden - b.orden),
    [catalog],
  );
  const sugeridos = useMemo(() => getSugeridos(servicios), [servicios]);

  const toggle = (id: string) => {
    onSeleccionadasChange(
      seleccionadas.includes(id)
        ? seleccionadas.filter((s) => s !== id)
        : [...seleccionadas, id],
    );
  };

  const selectedSet = new Set(seleccionadas);
  const countSelected = seleccionadas.length + (manual.trim() ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              Observaciones generales
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Añade condiciones y notas importantes para el cliente
            </p>
          </div>
        </div>
        {countSelected > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            <Check className="w-3 h-3" />
            {countSelected}
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Sugeridas section */}
        {sugeridos.size > 0 && (
          <SuggestionBar
            activas={activas}
            sugeridos={sugeridos}
            selectedSet={selectedSet}
            onToggle={toggle}
          />
        )}

        {/* All pills */}
        <div className="flex flex-wrap gap-2">
          {activas.map((obs) => {
            const isSelected = selectedSet.has(obs.id);
            const isSugerido = sugeridos.has(obs.id);
            return (
              <Pill
                key={obs.id}
                obs={obs}
                selected={isSelected}
                suggested={isSugerido}
                onToggle={() => toggle(obs.id)}
              />
            );
          })}
        </div>

        {/* Manual textarea */}
        <div className="relative">
          <textarea
            value={manual}
            onChange={(e) => onManualChange(e.target.value)}
            placeholder="Agregar observación personalizada…"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

function SuggestionBar({
  activas,
  sugeridos,
  selectedSet,
  onToggle,
}: {
  activas: ObservacionRapida[];
  sugeridos: Set<string>;
  selectedSet: Set<string>;
  onToggle: (id: string) => void;
}) {
  const suggestions = activas.filter(
    (o) => sugeridos.has(o.id) && !selectedSet.has(o.id),
  );
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
          Sugeridas según los servicios
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((obs) => (
          <button
            key={obs.id}
            type="button"
            onClick={() => onToggle(obs.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 hover:border-amber-400 transition-all"
          >
            <span>+ {obs.texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Pill({
  obs,
  selected,
  suggested,
  onToggle,
}: {
  obs: ObservacionRapida;
  selected: boolean;
  suggested: boolean;
  onToggle: () => void;
}) {
  const _ = suggested; // used for potential future styling

  return (
    <button
      type="button"
      onClick={onToggle}
      title={obs.texto}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
        selected
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      {selected && <Check className="w-3 h-3 shrink-0" />}
      <span className="max-w-[280px] truncate">{obs.texto}</span>
    </button>
  );
}
