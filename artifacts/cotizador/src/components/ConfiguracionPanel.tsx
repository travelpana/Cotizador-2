import { Tag, Calculator, Settings2, Map, FileText } from "lucide-react";
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
          <div className="flex items-center gap-1 text-xs bg-slate-100 rounded-lg p-1">
            <ModoBtn
              active={modo === "tarifas"}
              onClick={() => onModoChange("tarifas")}
              icon={<Tag className="w-3.5 h-3.5" />}
              label="Solo tarifas"
            />
            <ModoBtn
              active={modo === "calculo"}
              onClick={() => onModoChange("calculo")}
              icon={<Calculator className="w-3.5 h-3.5" />}
              label="Calcular total"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">
            {modo === "tarifas"
              ? "Mostrar precios unitarios sin calcular subtotales ni total."
              : "Calcular noches × pasajeros y mostrar gran total."}
          </p>
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

function ModoBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md font-medium transition-colors ${
        active
          ? "bg-white shadow-sm text-slate-900"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
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
