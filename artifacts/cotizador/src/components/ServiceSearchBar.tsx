import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Hotel as HotelIcon,
  Bus,
  MapPin,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import type {
  Hotel,
  ServicioSeleccionado,
  Tour,
  Traslado,
} from "@/lib/types";
import { fmt } from "@/lib/calc";

type Categoria = "todos" | "hotel" | "traslado" | "tour" | "vuelo";

interface Props {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  globalFechaInicio: string;
  globalFechaFin: string;
  onPick: (s: ServicioSeleccionado) => void;
}

interface Resultado {
  tipo: "hotel" | "tour" | "traslado";
  raw: Hotel | Tour | Traslado;
  nombre: string;
  codigo: string;
  rango?: string;
  rating?: string;
  precios: { primario: { label: string; value: number }; secundario?: { label: string; value: number } };
}

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hotel", label: "Hotelería" },
  { value: "traslado", label: "Traslados" },
  { value: "tour", label: "Tours" },
  { value: "vuelo", label: "Vuelos" },
];

export default function ServiceSearchBar({
  hoteles,
  tours,
  traslados,
  globalFechaInicio,
  globalFechaFin,
  onPick,
}: Props) {
  const [categoria, setCategoria] = useState<Categoria>("todos");
  const [catOpen, setCatOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    if (!query) {
      setDebounced("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      setDebounced(query);
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setCatOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const resultados = useMemo<Resultado[]>(() => {
    const q = debounced.trim().toLowerCase();
    if (q.length < 2) return [];

    const matches = (text: string) => text.toLowerCase().includes(q);

    const out: Resultado[] = [];

    if (categoria === "todos" || categoria === "hotel") {
      for (const h of hoteles) {
        if (
          matches(h.nombre) ||
          matches(h.id) ||
          matches(h.ubicacion ?? "") ||
          matches(h.categoria ?? "")
        ) {
          out.push({
            tipo: "hotel",
            raw: h,
            nombre: h.nombre,
            codigo: h.id,
            rango: h.vigencia,
            rating: h.estrellas,
            precios: {
              primario: { label: "DBL", value: h.precios.DBL },
              secundario: { label: "SGL", value: h.precios.SGL },
            },
          });
        }
      }
    }

    if (categoria === "todos" || categoria === "traslado") {
      for (const t of traslados) {
        if (matches(t.nombre) || matches(t.id) || matches(t.categoria ?? "")) {
          out.push({
            tipo: "traslado",
            raw: t,
            nombre: t.nombre,
            codigo: t.id,
            rango: t.tipo,
            precios: {
              primario: { label: "2-5 pax", value: t.precios.p2_5 },
              secundario: { label: "1 pax", value: t.precios.p1 },
            },
          });
        }
      }
    }

    if (categoria === "todos" || categoria === "tour") {
      for (const t of tours) {
        if (
          matches(t.nombre) ||
          matches(t.id) ||
          matches(t.categoria ?? "") ||
          matches(t.seccion ?? "")
        ) {
          out.push({
            tipo: "tour",
            raw: t,
            nombre: t.nombre,
            codigo: t.id,
            rango: t.horario,
            precios: {
              primario: { label: "2-5 pax", value: t.precios.p2_5 },
              secundario: { label: "1 pax", value: t.precios.p1 },
            },
          });
        }
      }
    }

    return out.slice(0, 50);
  }, [debounced, categoria, hoteles, tours, traslados]);

  useEffect(() => {
    setActiveIndex(0);
  }, [resultados.length, debounced, categoria]);

  const buildServicio = (r: Resultado): ServicioSeleccionado => {
    const uid = `${r.tipo}-${r.codigo}-${Date.now()}`;
    if (r.tipo === "hotel") {
      const h = r.raw as Hotel;
      return {
        id: uid,
        codigo: h.id,
        tipo: "hotel",
        nombre: h.nombre,
        precios: {
          SGL: h.precios.SGL,
          DBL: h.precios.DBL,
          TPL: h.precios.TPL,
          CHD: h.precios.CHD,
        },
        ubicacion: h.ubicacion,
        estrellas: h.estrellas,
        vigencia: h.vigencia,
        fechaInicio: globalFechaInicio || undefined,
        fechaFin: globalFechaFin || undefined,
      };
    }
    if (r.tipo === "tour") {
      const t = r.raw as Tour;
      return {
        id: uid,
        codigo: t.id,
        tipo: "tour",
        nombre: t.nombre,
        precios: {
          p1: t.precios.p1,
          p2_5: t.precios.p2_5,
          p6_10: t.precios.p6_10,
          chd: t.precios.chd,
        },
        usarFecha: false,
      };
    }
    const tr = r.raw as Traslado;
    return {
      id: uid,
      codigo: tr.id,
      tipo: "traslado",
      nombre: tr.nombre,
      precios: {
        p1: tr.precios.p1,
        p2_5: tr.precios.p2_5,
        p6_10: tr.precios.p6_10,
        chd: tr.precios.chd,
      },
      usarFecha: false,
    };
  };

  const pick = (r: Resultado) => {
    onPick(buildServicio(r));
    const key = `${r.tipo}-${r.codigo}`;
    setJustAdded(key);
    window.setTimeout(() => {
      setJustAdded((curr) => (curr === key ? null : curr));
    }, 900);
    setQuery("");
    setDebounced("");
    setOpen(false);
    setCatOpen(false);
    inputRef.current?.blur();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || resultados.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = resultados[activeIndex];
      if (r) pick(r);
    }
  };

  const showDropdown = open && (loading || debounced.length >= 2);
  const currentCatLabel =
    CATEGORIAS.find((c) => c.value === categoria)?.label ?? "Todos";

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-stretch gap-2">
        {/* Category dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            className="h-11 inline-flex items-center gap-2 px-3.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors shadow-sm"
            data-testid="button-category"
          >
            <span>{currentCatLabel}</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                catOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {catOpen && (
            <div className="absolute z-40 mt-1.5 left-0 min-w-[160px] rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setCategoria(c.value);
                    setCatOpen(false);
                    inputRef.current?.focus();
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm hover:bg-slate-50 transition-colors ${
                    categoria === c.value
                      ? "text-primary font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
            placeholder="Buscar hotel, traslado, tour..."
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-sm"
            style={{ color: "#1f2937" }}
            data-testid="input-service-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebounced("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {loading ? (
            <div className="px-4 py-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando…
            </div>
          ) : resultados.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              <div className="font-medium text-slate-700">Sin resultados</div>
              <div className="text-xs mt-1">
                Intenta con otra palabra o cambia la categoría.
              </div>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto py-1">
              {resultados.map((r, idx) => (
                <ResultRow
                  key={`${r.tipo}-${r.codigo}-${idx}`}
                  r={r}
                  query={debounced}
                  active={idx === activeIndex}
                  added={justAdded === `${r.tipo}-${r.codigo}`}
                  onClick={() => pick(r)}
                  onMouseEnter={() => setActiveIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function iconForTipo(tipo: "hotel" | "tour" | "traslado") {
  const cls = "w-4 h-4";
  if (tipo === "hotel") return <HotelIcon className={cls} />;
  if (tipo === "tour") return <MapPin className={cls} />;
  return <Bus className={cls} />;
}

function colorsForTipo(tipo: "hotel" | "tour" | "traslado") {
  if (tipo === "hotel")
    return { bg: "bg-amber-50", text: "text-amber-600" };
  if (tipo === "tour")
    return { bg: "bg-emerald-50", text: "text-emerald-600" };
  return { bg: "bg-sky-50", text: "text-sky-600" };
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function ResultRow({
  r,
  query,
  active,
  added,
  onClick,
  onMouseEnter,
}: {
  r: Resultado;
  query: string;
  active: boolean;
  added: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const colors = colorsForTipo(r.tipo);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
        added
          ? "bg-emerald-50"
          : active
            ? "bg-slate-50"
            : "hover:bg-slate-50"
      }`}
      data-testid={`result-${r.tipo}-${r.codigo}`}
    >
      <div
        className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}
      >
        {iconForTipo(r.tipo)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">
          {highlight(r.nombre, query)}
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
          <span className="font-mono text-slate-600">{r.codigo}</span>
          {r.rango && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate">{r.rango}</span>
            </>
          )}
          {r.rating && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-amber-500">{r.rating}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 pl-2">
        <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
          {fmt(r.precios.primario.value)}
          <span className="text-[10px] font-medium text-slate-400 ml-1">
            /{r.precios.primario.label.toLowerCase()}
          </span>
        </div>
        {r.precios.secundario && (
          <div className="text-[11px] text-slate-500 tabular-nums leading-tight mt-0.5">
            {fmt(r.precios.secundario.value)}
            <span className="text-[10px] text-slate-400 ml-1">
              /{r.precios.secundario.label.toLowerCase()}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
