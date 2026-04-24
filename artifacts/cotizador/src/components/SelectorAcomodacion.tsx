import type { Acomodacion } from "@/lib/types";

interface Props {
  selected: Acomodacion[];
  onChange: (a: Acomodacion[]) => void;
}

const OPCIONES: { value: Acomodacion; label: string; desc: string }[] = [
  { value: "SGL", label: "SGL", desc: "Sencilla" },
  { value: "DBL", label: "DBL", desc: "Doble" },
  { value: "TPL", label: "TPL", desc: "Triple" },
];

export default function SelectorAcomodacion({ selected, onChange }: Props) {
  const toggle = (a: Acomodacion) => {
    if (selected.includes(a)) {
      onChange(selected.filter((x) => x !== a));
    } else {
      onChange([...selected, a]);
    }
  };

  return (
    <div className="card-white p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Acomodaciones</h2>
        <span className="text-xs text-slate-500">
          Selecciona una o varias para cotizar en paralelo
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {OPCIONES.map((op) => {
          const active = selected.includes(op.value);
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => toggle(op.value)}
              className={`relative px-4 py-4 rounded-lg border-2 transition-all text-left ${
                active
                  ? "border-primary bg-primary/10 text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tracking-tight">
                  {op.label}
                </span>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">{op.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
