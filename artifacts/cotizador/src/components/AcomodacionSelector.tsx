import type { Acomodacion } from "@/lib/types";
import { Section } from "./ClientForm";
import { BedDouble } from "lucide-react";

interface Props {
  selected: Acomodacion[];
  onChange: (a: Acomodacion[]) => void;
}

const PILLS: { value: Acomodacion; label: string; full: string }[] = [
  { value: "SGL", label: "SGL", full: "Sencilla" },
  { value: "DBL", label: "DBL", full: "Doble" },
  { value: "TPL", label: "TPL", full: "Triple" },
];

export default function AcomodacionSelector({ selected, onChange }: Props) {
  const toggle = (a: Acomodacion) => {
    if (selected.includes(a)) {
      // Don't allow zero accommodations
      if (selected.length === 1) return;
      onChange(selected.filter((x) => x !== a));
    } else {
      onChange([...selected, a]);
    }
  };

  return (
    <Section
      step={3}
      icon={<BedDouble className="w-4 h-4" />}
      title="Acomodaciones"
      subtitle="Cotiza una o varias en paralelo"
    >
      <div className="flex flex-wrap gap-2">
        {PILLS.map((p) => {
          const active = selected.includes(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => toggle(p.value)}
              className={`group relative px-5 py-2.5 rounded-full border-2 transition-all text-sm font-semibold ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {active && (
                  <span className="w-4 h-4 rounded-full bg-white text-primary text-[10px] flex items-center justify-center font-bold">
                    ✓
                  </span>
                )}
                {p.label}
                <span className={`text-xs font-normal ${active ? "text-primary-foreground/80" : "text-slate-400"}`}>
                  · {p.full}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
