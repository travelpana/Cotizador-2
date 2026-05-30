import {
  Settings2,
  Map,
  Clock,
  BookOpen,
  Tag,
  Calculator,
  Check,
} from "lucide-react";
import type { ModoCotizacion } from "./Guardadas";

interface Props {
  modo: ModoCotizacion;
  onModoChange: (m: ModoCotizacion) => void;
  incluirItinerario: boolean;
  onToggleItinerario: () => void;
  incluirDescriptivos: boolean;
  onToggleDescriptivos: () => void;
  incluirDescriptivoCompleto: boolean;
  onToggleDescriptivoCompleto: () => void;
}

export default function ConfiguracionPanel({
  modo,
  onModoChange,
  incluirItinerario,
  onToggleItinerario,
  incluirDescriptivos,
  onToggleDescriptivos,
  incluirDescriptivoCompleto,
  onToggleDescriptivoCompleto,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">
          Configuración de cotización
        </h3>
      </div>

      <div className="p-5 space-y-5">
        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Modo
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ModeCard
              active={modo === "tarifas"}
              icon={<Tag className="w-4 h-4" />}
              title="Tarifas"
              onClick={() => onModoChange("tarifas")}
            />
            <ModeCard
              active={modo === "calculo"}
              icon={<Calculator className="w-4 h-4" />}
              title="Totales"
              onClick={() => onModoChange("calculo")}
            />
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Opciones
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            <Toggle
              checked={incluirDescriptivos}
              onChange={onToggleDescriptivos}
              icon={<Clock className="w-4 h-4" />}
              label="Incluir horarios"
            />
            <Toggle
              checked={incluirItinerario}
              onChange={onToggleItinerario}
              icon={<Map className="w-4 h-4" />}
              label="Incluir itinerario"
            />
            <Toggle
              checked={incluirDescriptivoCompleto}
              onChange={onToggleDescriptivoCompleto}
              icon={<BookOpen className="w-4 h-4" />}
              label="Incluir descriptivo"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
      data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </span>
      )}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div
        className={`text-sm font-semibold leading-tight ${
          active ? "text-primary" : "text-slate-900"
        }`}
      >
        {title}
      </div>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  icon,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  label: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-3 transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          checked && !disabled
            ? "bg-primary/10 text-primary"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 leading-tight">
          {label}
        </div>
        {help && (
          <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
            {help}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange()}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${
          checked ? "bg-primary" : "bg-slate-300"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}
