import { Settings2, Map, FileText } from "lucide-react";
import type { ModoCotizacion } from "./Guardadas";

interface Props {
  modo: ModoCotizacion;
  onModoChange: (m: ModoCotizacion) => void;
  incluirItinerario: boolean;
  onToggleItinerario: () => void;
  incluirDescriptivos: boolean;
  onToggleDescriptivos: () => void;
}

export default function ConfiguracionPanel({
  modo,
  onModoChange,
  incluirItinerario,
  onToggleItinerario,
  incluirDescriptivos,
  onToggleDescriptivos,
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
          <button
            type="button"
            role="switch"
            aria-checked={modo === "calculo"}
            onClick={() =>
              onModoChange(modo === "calculo" ? "tarifas" : "calculo")
            }
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold text-slate-900">
                {modo === "calculo" ? "Calcular total" : "Solo tarifas"}
              </span>
              <span className="text-[11px] text-slate-500 leading-snug">
                {modo === "calculo"
                  ? "Calcular noches × pasajeros y gran total"
                  : "Sólo precios unitarios, sin totales"}
              </span>
            </div>
            <span
              className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${
                modo === "calculo" ? "bg-primary" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modo === "calculo" ? "translate-x-4" : ""
                }`}
              />
            </span>
          </button>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
            Opciones
          </div>
          <div className="space-y-2">
            <Toggle
              checked={incluirItinerario}
              onChange={onToggleItinerario}
              icon={<Map className="w-3.5 h-3.5 text-slate-400" />}
              label="Incluir itinerario"
              help="Tabla día a día en preview, PDF y WhatsApp"
            />
            <Toggle
              checked={incluirDescriptivos}
              onChange={onToggleDescriptivos}
              icon={<FileText className="w-3.5 h-3.5 text-slate-400" />}
              label="Incluir descriptivos"
              help="Texto extra debajo de cada actividad"
              disabled={!incluirItinerario}
            />
          </div>
        </section>
      </div>
    </div>
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
      className={`flex items-start gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange()}
        disabled={disabled}
        className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors mt-0.5 ${
          checked ? "bg-primary" : "bg-slate-300"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
          {icon}
          {label}
        </div>
      </div>
    </label>
  );
}
