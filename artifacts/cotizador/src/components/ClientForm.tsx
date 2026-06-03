import { useEffect, useRef, useState, useCallback } from "react";
import { Check, UserRound, Users, Building2, Shield } from "lucide-react";
import {
  loadAgencias,
  loadAgentes,
  getAgenciaByNombre,
  loadCounterSuggestions,
  type Agencia,
} from "@/lib/agencias";
import {
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

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 rounded-t-2xl">
        <UserRound className="w-4 h-4" style={{ color: "#1495ff" }} />
        <h3 className="font-bold leading-tight" style={{ fontSize: 20, color: "#07152f" }}>Datos del cliente</h3>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1: Nombre de cotización (full width) */}
          <Field label="Nombre de cotización" span={3}>
            <input
              type="text"
              value={cliente.cotizacionNombre ?? ""}
              onChange={(e) => update({ cotizacionNombre: e.target.value })}
              placeholder="Ej: Panamá + Bocas del Toro - Junio"
              className={inputCls}
              data-testid="input-cotizacion-nombre"
            />
          </Field>

          {/* Row 2: Agencia | Agente | Counter */}
          <Field label="Agencia" required error={errors?.agencia}>
            <AgenciaAutocomplete
              value={cliente.correo}
              onChange={(v) => {
                const patch: Partial<Cliente> = { correo: v };
                if (v !== cliente.correo) patch.agente = "";
                update(patch);
              }}
              error={errors?.agencia}
            />
          </Field>
          <Field label="Agente" required error={errors?.agente}>
            <AgentAutocomplete
              value={cliente.agente}
              agenciaNombre={cliente.correo}
              onChange={(v) => update({ agente: v })}
              error={errors?.agente}
            />
          </Field>
          <Field label="Counter">
            <CounterAutocomplete
              value={cliente.counter ?? ""}
              onChange={(v) => update({ counter: v })}
            />
          </Field>

          {/* Row 3: Fecha de llegada | Fecha de salida | Vigencia */}
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

// ─── Shared AutocompleteInput ─────────────────────────────────────────────────

interface SuggestionItem {
  label: string;
  icon?: React.ReactNode;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: SuggestionItem[];
  placeholder?: string;
  error?: boolean;
  "data-testid"?: string;
  transform?: (v: string) => string;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  error,
  "data-testid": testId,
  transform,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = value.trim().toLowerCase();
  const filtered = suggestions
    .filter((s) => !q || s.label.toLowerCase().includes(q))
    .slice(0, 8);

  const showDropdown = open && (filtered.length > 0 || (q.length > 0 && suggestions.length > 0));

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [q]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = useCallback(
    (label: string) => {
      onChange(transform ? transform(label) : label);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, transform]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          select(filtered[activeIndex].label);
        } else {
          setOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const errBorder = error
    ? "border-red-400 ring-1 ring-red-200 bg-red-50/40"
    : "border-slate-200";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        data-testid={testId}
        placeholder={placeholder}
        className={`${inputCls} ${errBorder}`}
        onChange={(e) => {
          const v = transform ? transform(e.target.value) : e.target.value;
          onChange(v);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          style={{ boxShadow: "0 8px 24px rgba(0,52,184,0.10), 0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
              No hay resultados
            </div>
          ) : (
            filtered.map((item, i) => {
              const isActive = i === activeIndex;
              const isSelected = value.toLowerCase() === item.label.toLowerCase();
              return (
                <button
                  key={item.label}
                  data-item
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(item.label)}
                  className={[
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors",
                    isActive
                      ? "bg-[#2596be]/8 text-[#2596be]"
                      : "text-slate-800 hover:bg-[#2596be]/5 hover:text-[#2596be]",
                  ].join(" ")}
                >
                  {item.icon && (
                    <span className="shrink-0 text-slate-400 flex items-center">{item.icon}</span>
                  )}
                  <span className="font-medium truncate flex-1">{item.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#2596be] ml-auto shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Agencia Autocomplete ─────────────────────────────────────────────────────

function AgenciaAutocomplete({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  useEffect(() => {
    setAgencias(loadAgencias());
  }, []);

  // Reload on focus so new agencies added in Configuración appear
  const handleFocus = () => setAgencias(loadAgencias());

  const suggestions: SuggestionItem[] = agencias.map((a) => ({
    label: a.nombre,
    icon: a.logoUrl ? (
      <div className="w-4 h-4 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
        <img src={a.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    ) : (
      <Building2 className="w-4 h-4" />
    ),
  }));

  return (
    <div data-testid="input-agencia" onFocus={handleFocus}>
      <AutocompleteInput
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        placeholder="Buscar o escribir agencia"
        error={error}
      />
    </div>
  );
}

// ─── Agent Autocomplete ───────────────────────────────────────────────────────

function AgentAutocomplete({
  value,
  agenciaNombre,
  onChange,
  error,
}: {
  value: string;
  agenciaNombre: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const agencia = agenciaNombre?.trim() ? getAgenciaByNombre(agenciaNombre) : undefined;
  const allAgentes = loadAgentes();
  const agentesForAgencia = agencia
    ? allAgentes.filter((a) => a.agenciaId === agencia.id)
    : [];

  const suggestions: SuggestionItem[] = agentesForAgencia.map((a) => ({
    label: a.nombre,
    icon: <Users className="w-3.5 h-3.5" />,
  }));

  return (
    <div data-testid="select-agente">
      <AutocompleteInput
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        placeholder={agentesForAgencia.length > 0 ? "Buscar agente…" : "Escribir agente"}
        error={error}
        transform={(v) => v.toUpperCase()}
      />
    </div>
  );
}

// ─── Counter Autocomplete ─────────────────────────────────────────────────────

function CounterAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [counterNames, setCounterNames] = useState<string[]>([]);

  useEffect(() => {
    setCounterNames(loadCounterSuggestions());
  }, []);

  const handleFocus = () => setCounterNames(loadCounterSuggestions());

  const suggestions: SuggestionItem[] = counterNames.map((n) => ({
    label: n,
    icon: <Shield className="w-3.5 h-3.5" />,
  }));

  return (
    <div data-testid="input-counter" onFocus={handleFocus}>
      <AutocompleteInput
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        placeholder="Buscar o escribir counter"
      />
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

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

// ─── Alojamiento Bar ──────────────────────────────────────────────────────────

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
      <span className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
      <span className="pointer-events-none absolute bottom-0 left-1/3 w-28 h-28 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #93c5fd 0%, transparent 70%)" }} />
      <span className="pointer-events-none absolute -bottom-4 right-1/4 w-20 h-20 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
      <span className="pointer-events-none absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl opacity-10" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)" }} />

      <div
        className="relative"
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 1px 2fr",
          gap: 0,
          alignItems: "stretch",
          padding: "10px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 8,
            paddingRight: 16,
          }}
        >
          <NumberInput
            label="NOCHES"
            value={cliente.noches}
            onChange={(v) => updateNum({ noches: v })}
            min={0}
          />
          <NumberInput
            label="PASAJEROS"
            value={cliente.pasajeros}
            onChange={(v) => updateNum({ pasajeros: v })}
            min={1}
          />
          <NumberInput
            label="NIÑOS"
            value={cliente.ninos}
            onChange={(v) => updateNum({ ninos: v })}
            min={0}
          />
        </div>

        <span style={{ width: 1, backgroundColor: "rgba(255,255,255,0.2)", display: "block", margin: "4px 0" }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 8,
            paddingLeft: 16,
          }}
        >
          {PILLS.map((p) => {
            const active = acomodaciones.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePill(p)}
                style={{
                  flex: 1,
                  height: 44,
                  minWidth: 0,
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#fff",
                  textTransform: "uppercase",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                  ...(active
                    ? { backgroundColor: "#1495ff", boxShadow: "0 2px 10px rgba(20,149,255,0.55)" }
                    : { backgroundColor: "rgba(0,30,90,0.5)", border: "1px solid rgba(147,197,253,0.35)" }),
                }}
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
  icon?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);

  return (
    <label
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        height: 44,
        padding: "0 14px",
        flex: 1,
        minWidth: 0,
        backgroundColor: "rgba(0,20,70,0.55)",
        border: "1px solid rgba(147,197,253,0.3)",
        borderRadius: 9999,
        cursor: "text",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", lineHeight: 1, color: "rgba(255,255,255,0.65)", userSelect: "none", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
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
        style={{ width: 34, minWidth: 34, flexShrink: 0, textAlign: "right", fontSize: 18, fontWeight: 800, lineHeight: 1, color: "#fff", background: "transparent", border: 0, padding: 0, outline: "none", fontVariantNumeric: "tabular-nums" }}
        className="focus:outline-none"
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
            <h2 className="leading-tight" style={{ fontSize: 18, fontWeight: 700, color: "#07152f" }}>
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

const inputCls =
  "w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2596be]/30 focus:border-[#2596be] placeholder:text-slate-400 transition-colors";

