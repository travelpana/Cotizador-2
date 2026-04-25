import type { Cliente } from "@/lib/types";
import { diffNoches } from "@/lib/calc";
import {
  ClipboardList,
  User,
  Building2,
  Mail,
  CalendarRange,
  ShieldCheck,
} from "lucide-react";

interface Props {
  cliente: Cliente;
  onChange: (c: Cliente) => void;
}

export default function ClientForm({ cliente, onChange }: Props) {
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
      icon={<ClipboardList className="w-4 h-4" />}
      title="Información de la cotización"
      subtitle="Datos del titular, agencia, contacto y detalles del viaje"
    >
      <div className="space-y-6">
        <SubSection icon={<User className="w-3.5 h-3.5" />} title="Cliente">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Nombre">
              <input
                type="text"
                value={cliente.nombre}
                onChange={(e) => update({ nombre: e.target.value })}
                placeholder="Ej: Familia Pérez"
                className={inputCls}
              />
            </Field>
          </div>
        </SubSection>

        <SubSection
          icon={<Building2 className="w-3.5 h-3.5" />}
          title="Agencia"
        >
          <div className="grid grid-cols-1 gap-4">
            <Field label="Agencia">
              <input
                type="text"
                value={cliente.agencia}
                onChange={(e) => update({ agencia: e.target.value })}
                placeholder="Ej: RGE Style Travel"
                className={inputCls}
              />
            </Field>
          </div>
        </SubSection>

        <SubSection icon={<Mail className="w-3.5 h-3.5" />} title="Contacto">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Correo electrónico">
              <input
                type="email"
                value={cliente.correo}
                onChange={(e) => update({ correo: e.target.value })}
                placeholder="cliente@correo.com"
                className={inputCls}
              />
            </Field>
          </div>
        </SubSection>

        <SubSection
          icon={<CalendarRange className="w-3.5 h-3.5" />}
          title="Detalles"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                onChange={(e) =>
                  update({ pasajeros: Number(e.target.value) || 1 })
                }
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
        </SubSection>

        <SubSection
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          title="Vigencia"
        >
          <div className="grid grid-cols-1 gap-4">
            <Field label="Vigencia de la cotización">
              <input
                type="text"
                value={cliente.vigencia}
                onChange={(e) => update({ vigencia: e.target.value })}
                placeholder="Ej: Válido hasta 30/09/2026"
                className={inputCls}
              />
            </Field>
          </div>
        </SubSection>
      </div>
    </Section>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400";

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

function SubSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-slate-700">
        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center">
          {icon}
        </span>
        <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function Section({
  icon,
  title,
  subtitle,
  children,
  action,
}: {
  step?: number;
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
