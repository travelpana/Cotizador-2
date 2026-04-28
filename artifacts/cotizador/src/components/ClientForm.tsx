import { useState } from "react";
import {
  AGENTES,
  type Acomodacion,
  type Cliente,
  type ClienteValidationErrors,
} from "@/lib/types";
import { diffNoches } from "@/lib/calc";
import SingleDatePicker from "./SingleDatePicker";

interface Props {
  cliente: Cliente;
  onChange: (c: Cliente) => void;
  errors?: ClienteValidationErrors;
}

function addOneDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ClientForm({ cliente, onChange, errors }: Props) {
  const update = (patch: Partial<Cliente>) => {
    const next = { ...cliente, ...patch };
    if (patch.fechaInicio || patch.fechaFin) {
      const calc = diffNoches(next.fechaInicio, next.fechaFin);
      if (calc > 0) next.noches = calc;
    }
    onChange(next);
  };

  const onCheckinChange = (iso: string) => {
    const patch: Partial<Cliente> = { fechaInicio: iso };
    if (iso) {
      const nextDay = addOneDay(iso);
      const currentFin = cliente.fechaFin;
      if (!currentFin || currentFin <= iso) patch.fechaFin = nextDay;
    }
    update(patch);
  };

  const errCls = (on: boolean | undefined) =>
    on ? "border-red-400 ring-1 ring-red-200 bg-red-50/40" : "";

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nombre" required error={errors?.nombre}>
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Ej: Familia Pérez"
            className={`${inputCls} ${errCls(errors?.nombre)}`}
            data-testid="input-nombre"
          />
        </Field>
        <Field label="Agencia" required error={errors?.agencia}>
          <input
            type="text"
            value={cliente.correo}
            onChange={(e) => update({ correo: e.target.value })}
            placeholder="Ej: RGE Style Travel"
            className={`${inputCls} ${errCls(errors?.agencia)}`}
            data-testid="input-agencia"
          />
        </Field>
        <Field label="Agente" required error={errors?.agente}>
          <select
            value={cliente.agente}
            onChange={(e) => update({ agente: e.target.value })}
            className={`${inputCls} ${errCls(errors?.agente)} ${
              cliente.agente ? "text-slate-900" : "text-slate-400"
            }`}
            data-testid="select-agente"
          >
            <option value="">Selecciona un agente…</option>
            {AGENTES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Correo electrónico">
          <input
            type="email"
            value={cliente.whatsapp}
            onChange={(e) => update({ whatsapp: e.target.value })}
            placeholder="cliente@correo.com (opcional)"
            className={inputCls}
            data-testid="input-correo"
          />
        </Field>
        <Field label="Fecha de llegada" required error={errors?.fechaInicio}>
          <SingleDatePicker
            value={cliente.fechaInicio}
            onChange={onCheckinChange}
            placeholder="Llegada"
            allowPast
            error={errors?.fechaInicio}
          />
        </Field>
        <Field label="Fecha de salida">
          <SingleDatePicker
            value={cliente.fechaFin}
            onChange={(iso) => update({ fechaFin: iso })}
            placeholder="Salida"
            allowPast
            minDate={cliente.fechaInicio || undefined}
          />
        </Field>
        <Field label="Vigencia">
          <SingleDatePicker
            value={cliente.vigencia}
            onChange={(iso) => update({ vigencia: iso })}
            placeholder="Válida hasta…"
            allowPast
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
  required,
  error,
  span,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
  span?: number;
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {error && (
          <span className="ml-2 text-[10px] font-medium text-red-500 normal-case tracking-normal">
            requerido
          </span>
        )}
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
      style={{ backgroundColor: "#eb7309" }}
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] mr-1">
            Alojamiento
          </h2>
          <div className="flex items-center gap-2 bg-white/15 rounded-xl p-1">
            <NumberInput
              label="Noches"
              value={cliente.noches}
              onChange={(v) => updateNum({ noches: v })}
              min={0}
            />
            <NumberInput
              label="Pasajeros"
              value={cliente.pasajeros}
              onChange={(v) => updateNum({ pasajeros: v })}
              min={1}
            />
            <NumberInput
              label="Niños"
              value={cliente.ninos}
              onChange={(v) => updateNum({ ninos: v })}
              min={0}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PILLS.map((p) => {
            const active = acomodaciones.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePill(p)}
                className={`min-w-[58px] px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                  active
                    ? "bg-white shadow-sm"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
                style={active ? { color: "#eb7309" } : undefined}
                data-testid={`acomodacion-${p}`}
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

function NumberInput({
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
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);

  return (
    <label className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 ring-1 ring-white/40 shadow-sm cursor-text">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 select-none">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={display}
        onFocus={() => setDraft("")}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setDraft(raw);
          if (raw === "") return;
          const n = parseInt(raw, 10);
          if (Number.isFinite(n)) onChange(Math.max(min, n));
        }}
        onBlur={() => {
          if (draft === "" || draft === null) {
            onChange(min);
          }
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={label}
        className="w-9 bg-transparent border-0 p-0 text-sm font-bold text-slate-900 text-center focus:outline-none tabular-nums"
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
