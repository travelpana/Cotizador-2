import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, UserRound, MoonStar, Users, Baby, Building2 } from "lucide-react";
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
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <UserRound className="w-4 h-4" style={{ color: "#1495ff" }} />
        <h3 className="font-bold leading-tight" style={{ fontSize: 20, color: "#07152f" }}>Datos del cliente</h3>
      </div>
      <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nombre">
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => update({ nombre: e.target.value.toUpperCase() })}
            placeholder=""
            className={inputCls}
            data-testid="input-nombre"
          />
        </Field>
        <Field label="Agencia" required error={errors?.agencia}>
          <input
            type="text"
            value={cliente.correo}
            onChange={(e) => update({ correo: e.target.value.toUpperCase() })}
            placeholder=""
            className={`${inputCls} ${errCls(errors?.agencia)}`}
            data-testid="input-agencia"
          />
        </Field>
        <Field label="Agente" required error={errors?.agente}>
          <AgentSelect
            value={cliente.agente}
            onChange={(v) => update({ agente: v })}
            error={errors?.agente}
          />
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
        <Field label="Fecha de llegada">
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
      </div>
    </section>
  );
}

const inputCls =
  "w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2596be]/30 focus:border-[#2596be] placeholder:text-slate-400";

function AgentSelect({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const errBorder = error
    ? "border-red-400 ring-1 ring-red-200 bg-red-50/40"
    : "border-slate-200";

  return (
    <div ref={ref} className="relative" data-testid="select-agente">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-10 px-3.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2596be]/30 focus:border-[#2596be] flex items-center justify-between gap-2 transition-colors hover:border-slate-300 ${errBorder}`}
        style={{ color: value ? "#0f172a" : "#94a3b8" }}
      >
        <span className="truncate font-medium tracking-wide">
          {value || "Seleccionar"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {AGENTES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                onChange(a);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-800 hover:bg-[#2596be]/5 hover:text-[#2596be] transition-colors tracking-wide"
            >
              <span>{a}</span>
              {value === a && (
                <Check className="w-3.5 h-3.5 text-[#2596be] flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#07152f" }}>
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
      className="relative rounded-2xl overflow-hidden text-white"
      style={{
        background: "linear-gradient(135deg, #0034b8 0%, #005be8 50%, #0a7eff 100%)",
        boxShadow: "0 4px 20px rgba(0,52,184,0.35)",
      }}
    >
      {/* Decorative blobs */}
      <span className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
      <span className="pointer-events-none absolute bottom-0 left-1/3 w-28 h-28 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #93c5fd 0%, transparent 70%)" }} />
      <span className="pointer-events-none absolute -bottom-4 right-1/4 w-20 h-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
      {/* Subtle inner curve shine */}
      <span className="pointer-events-none absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl opacity-10" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)" }} />

      <div className="relative px-3 py-2.5 flex items-center justify-between gap-3">
        {/* Left: icon + counters */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Building icon */}
          <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: "#eec774" }} />
          {/* Divider 1 */}
          <span className="w-px h-5 flex-shrink-0" style={{ backgroundColor: "rgba(147,197,253,0.4)" }} />
          {/* Counters */}
          <div className="flex items-center gap-1.5">
            <NumberInput
              label="NOCHES"
              icon={<MoonStar className="w-3 h-3" style={{ color: "#eec774" }} />}
              value={cliente.noches}
              onChange={(v) => updateNum({ noches: v })}
              min={0}
            />
            <NumberInput
              label="PAX"
              icon={<Users className="w-3 h-3" style={{ color: "#eec774" }} />}
              value={cliente.pasajeros}
              onChange={(v) => updateNum({ pasajeros: v })}
              min={1}
            />
            <NumberInput
              label="NIÑOS"
              icon={<Baby className="w-3 h-3" style={{ color: "#eec774" }} />}
              value={cliente.ninos}
              onChange={(v) => updateNum({ ninos: v })}
              min={0}
            />
          </div>
          {/* Divider 2 */}
          <span className="w-px h-5 flex-shrink-0" style={{ backgroundColor: "rgba(147,197,253,0.4)" }} />
        </div>

        {/* Right: Pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {PILLS.map((p) => {
            const active = acomodaciones.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePill(p)}
                className="min-w-[48px] px-2.5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all text-white text-center"
                style={
                  active
                    ? { backgroundColor: "#1495ff", boxShadow: "0 2px 10px rgba(20,149,255,0.55)" }
                    : { backgroundColor: "rgba(0,30,90,0.5)", border: "1px solid rgba(147,197,253,0.35)" }
                }
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
  icon,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value).padStart(2, "0");

  return (
    <label
      title={label}
      className="flex items-center gap-1 rounded-full px-2 py-1.5 cursor-text flex-shrink-0"
      style={{ backgroundColor: "rgba(0,20,70,0.55)", border: "1px solid rgba(147,197,253,0.3)" }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-[9px] font-bold tracking-wider uppercase text-white/70 leading-none select-none whitespace-nowrap">{label}</span>
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
        className="w-5 bg-transparent border-0 p-0 text-sm font-semibold text-white text-center focus:outline-none tabular-nums"
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
          <div className="flex-shrink-0 mt-0.5" style={{ color: "#1495ff" }}>
            {icon}
          </div>
          <div>
            <h2 className="font-bold leading-tight" style={{ fontSize: 20, color: "#07152f" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "#283165" }}>{subtitle}</p>
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
