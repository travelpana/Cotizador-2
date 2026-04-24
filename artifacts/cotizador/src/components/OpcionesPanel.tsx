import { Settings2 } from "lucide-react";

interface Props {
  incluirItinerario: boolean;
  onToggleItinerario: () => void;
  incluirDescriptivos: boolean;
  onToggleDescriptivos: () => void;
}

export default function OpcionesPanel({
  incluirItinerario,
  onToggleItinerario,
  incluirDescriptivos,
  onToggleDescriptivos,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900">
          Opciones de cotización
        </h3>
      </div>
      <div className="space-y-2">
        <Toggle
          checked={incluirItinerario}
          onChange={onToggleItinerario}
          label="Incluir itinerario"
          help="Aparece en vista previa, PDF y WhatsApp"
        />
        <Toggle
          checked={incluirDescriptivos}
          onChange={onToggleDescriptivos}
          label="Incluir descriptivos"
          help="Texto extra para cada día del itinerario"
          disabled={!incluirItinerario}
        />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {help && <div className="text-[11px] text-slate-500">{help}</div>}
      </div>
    </label>
  );
}
