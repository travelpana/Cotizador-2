import { useEffect, useRef, useState } from "react";
import { Plus, Hotel, Bus, MapPin, Sparkles, ChevronDown } from "lucide-react";

export type AddOption = "hotel" | "traslado" | "tour" | "manual";

interface Props {
  onSelect: (option: AddOption) => void;
}

const OPTIONS: {
  value: AddOption;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  {
    value: "hotel",
    label: "Alojamiento",
    icon: <Hotel className="w-4 h-4" />,
    desc: "Hoteles del catálogo",
  },
  {
    value: "traslado",
    label: "Traslado",
    icon: <Bus className="w-4 h-4" />,
    desc: "Regulares y privados",
  },
  {
    value: "tour",
    label: "Tour / Actividad",
    icon: <MapPin className="w-4 h-4" />,
    desc: "Excursiones y city tours",
  },
  {
    value: "manual",
    label: "Personalizado",
    icon: <Sparkles className="w-4 h-4" />,
    desc: "Servicio manual",
  },
];

export default function AddServiceMenu({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
      >
        <Plus className="w-4 h-4" />
        Agregar servicio
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 z-30 overflow-hidden">
          {OPTIONS.map((op) => (
            <button
              key={op.value}
              onClick={() => {
                setOpen(false);
                onSelect(op.value);
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {op.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {op.label}
                </div>
                <div className="text-xs text-slate-500">{op.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
