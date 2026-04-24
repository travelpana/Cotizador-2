import type { Cliente } from "@/lib/types";
import { diffNoches } from "@/lib/calc";
import { Section, inputCls } from "./ClientForm";
import { CalendarRange } from "lucide-react";

interface Props {
  cliente: Cliente;
  onChange: (c: Cliente) => void;
}

export default function TravelParams({ cliente, onChange }: Props) {
  const update = (patch: Partial<Cliente>) => {
    const next = { ...cliente, ...patch };
    if (patch.fechaInicio || patch.fechaFin) {
      const calc = diffNoches(next.fechaInicio, next.fechaFin);
      if (calc > 0) next.noches = calc;
    }
    onChange(next);
  };

  return (
    <Section
      step={2}
      icon={<CalendarRange className="w-4 h-4" />}
      title="Parámetros del viaje"
      subtitle="Fechas, pasajeros y noches"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Fecha inicio">
          <input
            type="date"
            value={cliente.fechaInicio}
            onChange={(e) => update({ fechaInicio: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Fecha fin">
          <input
            type="date"
            value={cliente.fechaFin}
            onChange={(e) => update({ fechaFin: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Noches">
          <input
            type="number"
            min={0}
            value={cliente.noches}
            onChange={(e) => update({ noches: Number(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Pasajeros (adultos)">
          <input
            type="number"
            min={1}
            value={cliente.pasajeros}
            onChange={(e) => update({ pasajeros: Number(e.target.value) || 1 })}
            className={inputCls}
          />
        </Field>
        <Field label="Niños (4-10)">
          <input
            type="number"
            min={0}
            value={cliente.ninos}
            onChange={(e) => update({ ninos: Number(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
      </div>
    </Section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
