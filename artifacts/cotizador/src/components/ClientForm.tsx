import type { Cliente } from "@/lib/types";
import { User } from "lucide-react";

interface Props {
  cliente: Cliente;
  onChange: (c: Cliente) => void;
}

export default function ClientForm({ cliente, onChange }: Props) {
  return (
    <Section
      step={1}
      icon={<User className="w-4 h-4" />}
      title="Datos del cliente"
      subtitle="Información principal del titular"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nombre del cliente</Label>
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => onChange({ ...cliente, nombre: e.target.value })}
            placeholder="Ej: Familia Pérez"
            className={inputCls}
          />
        </div>
      </div>
    </Section>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1.5">
      {children}
    </label>
  );
}

export function Section({
  step,
  icon,
  title,
  subtitle,
  children,
  action,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Paso {step}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export { inputCls };
