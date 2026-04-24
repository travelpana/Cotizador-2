import { useMemo, useState } from "react";
import {
  Hotel as HotelIcon,
  MapPin,
  Bus,
  Search,
  Plus,
  Check,
} from "lucide-react";
import Modal from "./Modal";
import type {
  Hotel,
  Tour,
  Traslado,
  ServicioSeleccionado,
} from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  seleccionados: ServicioSeleccionado[];
  onChange: (s: ServicioSeleccionado[]) => void;
}

type Tab = "hotel" | "tour" | "traslado" | "manual";

export default function ServiciosModal({
  open,
  onClose,
  hoteles,
  tours,
  traslados,
  seleccionados,
  onChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("hotel");
  const [q, setQ] = useState("");

  const seleccionadosKeys = new Set(
    seleccionados.map((s) => `${s.tipo}:${s.id}`),
  );

  const toggle = (s: ServicioSeleccionado) => {
    const key = `${s.tipo}:${s.id}`;
    if (seleccionadosKeys.has(key)) {
      onChange(seleccionados.filter((x) => `${x.tipo}:${x.id}` !== key));
    } else {
      onChange([...seleccionados, s]);
    }
  };

  const filteredHoteles = useMemo(
    () =>
      hoteles.filter(
        (h) =>
          !q ||
          h.nombre.toLowerCase().includes(q.toLowerCase()) ||
          (h.ubicacion || "").toLowerCase().includes(q.toLowerCase()),
      ),
    [hoteles, q],
  );
  const filteredTours = useMemo(
    () =>
      tours.filter(
        (t) =>
          !q ||
          t.nombre.toLowerCase().includes(q.toLowerCase()) ||
          (t.seccion || "").toLowerCase().includes(q.toLowerCase()),
      ),
    [tours, q],
  );
  const filteredTraslados = useMemo(
    () =>
      traslados.filter(
        (t) => !q || t.nombre.toLowerCase().includes(q.toLowerCase()),
      ),
    [traslados, q],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar servicios"
      subtitle="Selecciona del catálogo o crea uno manual"
      size="xl"
    >
      <div className="px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
        <div className="flex flex-wrap gap-2 mb-3">
          <Tab2 active={tab === "hotel"} onClick={() => setTab("hotel")}>
            <HotelIcon className="w-4 h-4" /> Hoteles ({hoteles.length})
          </Tab2>
          <Tab2 active={tab === "tour"} onClick={() => setTab("tour")}>
            <MapPin className="w-4 h-4" /> Tours ({tours.length})
          </Tab2>
          <Tab2 active={tab === "traslado"} onClick={() => setTab("traslado")}>
            <Bus className="w-4 h-4" /> Traslados ({traslados.length})
          </Tab2>
          <Tab2 active={tab === "manual"} onClick={() => setTab("manual")}>
            <Plus className="w-4 h-4" /> Manual
          </Tab2>
        </div>
        {tab !== "manual" && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Buscar ${tab === "hotel" ? "hoteles" : tab === "tour" ? "tours" : "traslados"}...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-2">
        {tab === "hotel" &&
          filteredHoteles.map((h) => {
            const active = seleccionadosKeys.has(`hotel:${h.id}`);
            return (
              <ItemCard
                key={h.id}
                active={active}
                onClick={() =>
                  toggle({
                    id: h.id,
                    tipo: "hotel",
                    nombre: h.nombre,
                    precios: {
                      SGL: h.precios.SGL,
                      DBL: h.precios.DBL,
                      TPL: h.precios.TPL,
                      chd: h.precios.CHD,
                    },
                  })
                }
                title={h.nombre}
                subtitle={`${h.estrellas} · ${h.ubicacion} · ${h.tipoHabitacion}`}
                pricing={`SGL $${h.precios.SGL} · DBL $${h.precios.DBL} · TPL $${h.precios.TPL}`}
              />
            );
          })}
        {tab === "tour" &&
          filteredTours.map((t) => {
            const active = seleccionadosKeys.has(`tour:${t.id}`);
            return (
              <ItemCard
                key={t.id}
                active={active}
                onClick={() =>
                  toggle({
                    id: t.id,
                    tipo: "tour",
                    nombre: t.nombre,
                    precios: {
                      p1: t.precios.p1,
                      p2_5: t.precios.p2_5,
                      p6_10: t.precios.p6_10,
                      chd: t.precios.chd,
                    },
                  })
                }
                title={t.nombre}
                subtitle={`${t.seccion}${t.horario ? ` · ${t.horario}` : ""}`}
                pricing={`1pax $${t.precios.p1} · 2-5 $${t.precios.p2_5} · 6-10 $${t.precios.p6_10}`}
              />
            );
          })}
        {tab === "traslado" &&
          filteredTraslados.map((t) => {
            const active = seleccionadosKeys.has(`traslado:${t.id}`);
            return (
              <ItemCard
                key={t.id}
                active={active}
                onClick={() =>
                  toggle({
                    id: t.id,
                    tipo: "traslado",
                    nombre: t.nombre,
                    precios: {
                      p1: t.precios.p1,
                      p2_5: t.precios.p2_5,
                      p6_10: t.precios.p6_10,
                      chd: t.precios.chd,
                    },
                  })
                }
                title={t.nombre}
                subtitle={`${t.tipo} · ${t.categoria}`}
                pricing={`1pax $${t.precios.p1} · 2-5 $${t.precios.p2_5} · 6-10 $${t.precios.p6_10}`}
              />
            );
          })}
        {tab === "manual" && (
          <ManualForm
            onAdd={(s) => {
              onChange([...seleccionados, s]);
              setTab("hotel");
            }}
          />
        )}
      </div>

      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 sticky bottom-0 flex items-center justify-between">
        <div className="text-xs text-slate-600">
          {seleccionados.length} servicio{seleccionados.length !== 1 ? "s" : ""}{" "}
          seleccionado{seleccionados.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Listo
        </button>
      </div>
    </Modal>
  );
}

function Tab2({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  active,
  onClick,
  title,
  subtitle,
  pricing,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  pricing: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-slate-900">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-700 whitespace-nowrap">
            {pricing}
          </span>
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              active
                ? "bg-primary text-primary-foreground"
                : "border-2 border-slate-300 bg-white"
            }`}
          >
            {active && <Check className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>
    </button>
  );
}

function ManualForm({
  onAdd,
}: {
  onAdd: (s: ServicioSeleccionado) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<ServicioSeleccionado["tipo"]>("tour");
  const [precio, setPrecio] = useState(0);
  const [precioSGL, setPrecioSGL] = useState(0);
  const [precioDBL, setPrecioDBL] = useState(0);
  const [precioTPL, setPrecioTPL] = useState(0);
  const [chd, setChd] = useState(0);

  const submit = () => {
    if (!nombre.trim()) return;
    if (tipo === "hotel") {
      onAdd({
        id: `MAN-${Date.now()}`,
        tipo,
        nombre,
        manual: true,
        precios: { SGL: precioSGL, DBL: precioDBL, TPL: precioTPL, chd },
      });
    } else {
      onAdd({
        id: `MAN-${Date.now()}`,
        tipo,
        nombre,
        manual: true,
        precios: { p1: precio, p2_5: precio, p6_10: precio, chd },
      });
    }
    setNombre("");
    setPrecio(0);
    setPrecioSGL(0);
    setPrecioDBL(0);
    setPrecioTPL(0);
    setChd(0);
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <h4 className="font-semibold text-slate-900 mb-4">Servicio manual</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="md:col-span-2">
          <Lbl>Nombre del servicio</Lbl>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Almuerzo guiado"
            className={inputCls}
          />
        </div>
        <div>
          <Lbl>Tipo</Lbl>
          <select
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as ServicioSeleccionado["tipo"])
            }
            className={`${inputCls} bg-white`}
          >
            <option value="hotel">Hotel</option>
            <option value="tour">Tour</option>
            <option value="traslado">Traslado</option>
          </select>
        </div>
        {tipo === "hotel" ? (
          <>
            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <div>
                <Lbl>SGL</Lbl>
                <input
                  type="number"
                  value={precioSGL}
                  onChange={(e) => setPrecioSGL(Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <Lbl>DBL</Lbl>
                <input
                  type="number"
                  value={precioDBL}
                  onChange={(e) => setPrecioDBL(Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <Lbl>TPL</Lbl>
                <input
                  type="number"
                  value={precioTPL}
                  onChange={(e) => setPrecioTPL(Number(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <Lbl>Precio por persona</Lbl>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <Lbl>Precio niño</Lbl>
              <input
                type="number"
                value={chd}
                onChange={(e) => setChd(Number(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </>
        )}
      </div>
      <button
        onClick={submit}
        disabled={!nombre.trim()}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
      >
        Agregar a la cotización
      </button>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {children}
    </label>
  );
}
