import type { Acomodacion, Cliente } from "@/lib/types";
import { diffNoches } from "@/lib/calc";

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
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nombre del cliente">
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Ej: Familia Pérez"
            className={inputCls}
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            type="email"
            value={cliente.correo}
            onChange={(e) => update({ correo: e.target.value })}
            placeholder="cliente@correo.com"
            className={inputCls}
          />
        </Field>
        <Field label="WhatsApp">
          <input
            type="tel"
            value={cliente.whatsapp}
            onChange={(e) => update({ whatsapp: e.target.value })}
            placeholder="+57 300 000 0000"
            className={inputCls}
          />
        </Field>

        <Field label="Fecha de llegada">
          <input
            type="date"
            value={cliente.fechaInicio}
            onChange={(e) => update({ fechaInicio: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Fecha de salida">
          <input
            type="date"
            value={cliente.fechaFin}
            onChange={(e) => update({ fechaFin: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Notas internas">
          <input
            type="text"
            value={cliente.notas}
            onChange={(e) => update({ notas: e.target.value })}
            placeholder="Observaciones para el equipo"
            className={inputCls}
          />
        </Field>
      </div>
    </section>
  );
}

const inputCls =
  "w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2596be]/30 focus:border-[#2596be] placeholder:text-slate-400";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AlojamientoBar({
  cliente,
  onClienteChange,
  acomodaciones,
  onAcomodacionesChange,
}: {
  cliente: Cliente;
  onClienteChange: (c: Cliente) => void;
  acomodaciones: Acomodacion[];
  onAcomodacionesChange: (a: Acomodacion[]) => void;
}) {
  const PILLS: Acomodacion[] = ["SGL", "DBL", "TPL", "CHD"];

  const togglePill = (a: Acomodacion) => {
    if (acomodaciones.includes(a)) {
      if (acomodaciones.length === 1) return;
      onAcomodacionesChange(acomodaciones.filter((x) => x !== a));
    } else {
      onAcomodacionesChange([...acomodaciones, a]);
    }
  };

  const updateNum = (patch: Partial<Cliente>) =>
    onClienteChange({ ...cliente, ...patch });

  return (
    <section
      className="rounded-2xl shadow-sm px-5 py-4 text-white"
      style={{ backgroundColor: "#2596be" }}
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em]">
            Alojamiento
          </h2>
          <div className="flex items-center gap-2 text-[11px]">
            <NumInput
              label="Noches"
              value={cliente.noches}
              onChange={(v) => updateNum({ noches: v })}
              min={0}
            />
            <NumInput
              label="Pasajeros"
              value={cliente.pasajeros}
              onChange={(v) => updateNum({ pasajeros: v })}
              min={1}
            />
            <NumInput
              label="Niños"
              value={cliente.ninos}
              onChange={(v) => updateNum({ ninos: v })}
              min={0}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PILLS.map((p) => {
            const active = acomodaciones.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePill(p)}
                className={`min-w-[58px] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                  active
                    ? "bg-white shadow-sm"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                style={active ? { color: "#2596be" } : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NumInput({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="flex items-center gap-1.5 bg-white/15 rounded-full pl-3 pr-1 py-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-white/90">
        {label}
      </span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="w-12 h-7 px-2 rounded-full bg-white text-slate-900 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/60"
      />
    </label>
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
