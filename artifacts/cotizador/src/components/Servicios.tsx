import { useMemo, useState } from "react";
import type {
  Hotel,
  Tour,
  Traslado,
  ServicioSeleccionado,
} from "@/lib/types";
import { Hotel as HotelIcon, MapPin, Bus, Search, Plus, X } from "lucide-react";

interface Props {
  hoteles: Hotel[];
  tours: Tour[];
  traslados: Traslado[];
  seleccionados: ServicioSeleccionado[];
  onChange: (s: ServicioSeleccionado[]) => void;
}

type Tab = "hotel" | "tour" | "traslado";

export default function Servicios({
  hoteles,
  tours,
  traslados,
  seleccionados,
  onChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("hotel");
  const [q, setQ] = useState("");
  const [showManual, setShowManual] = useState(false);

  const seleccionadosIds = new Set(seleccionados.map((s) => `${s.tipo}:${s.id}`));

  const toggle = (s: ServicioSeleccionado) => {
    const key = `${s.tipo}:${s.id}`;
    if (seleccionadosIds.has(key)) {
      onChange(seleccionados.filter((x) => `${x.tipo}:${x.id}` !== key));
    } else {
      onChange([...seleccionados, s]);
    }
  };

  const remove = (s: ServicioSeleccionado) => {
    onChange(seleccionados.filter((x) => !(x.tipo === s.tipo && x.id === s.id)));
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
    <div className="card-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Servicios</h2>
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Servicio manual
        </button>
      </div>

      {showManual && (
        <ManualForm
          onAdd={(s) => {
            onChange([...seleccionados, s]);
            setShowManual(false);
          }}
          onCancel={() => setShowManual(false)}
        />
      )}

      <div className="flex gap-2 mb-3">
        <TabBtn active={tab === "hotel"} onClick={() => setTab("hotel")}>
          <HotelIcon className="w-4 h-4" /> Hoteles ({hoteles.length})
        </TabBtn>
        <TabBtn active={tab === "tour"} onClick={() => setTab("tour")}>
          <MapPin className="w-4 h-4" /> Tours ({tours.length})
        </TabBtn>
        <TabBtn active={tab === "traslado"} onClick={() => setTab("traslado")}>
          <Bus className="w-4 h-4" /> Traslados ({traslados.length})
        </TabBtn>
      </div>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={`Buscar ${tab === "hotel" ? "hoteles" : tab === "tour" ? "tours" : "traslados"}...`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
        {tab === "hotel" &&
          filteredHoteles.map((h) => {
            const active = seleccionadosIds.has(`hotel:${h.id}`);
            return (
              <button
                key={h.id}
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
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">
                      {h.nombre}
                    </div>
                    <div className="text-xs text-slate-500">
                      {h.estrellas} · {h.ubicacion} · {h.tipoHabitacion}
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 text-right whitespace-nowrap">
                    SGL ${h.precios.SGL} · DBL ${h.precios.DBL} · TPL ${h.precios.TPL}
                  </div>
                </div>
              </button>
            );
          })}

        {tab === "tour" &&
          filteredTours.map((t) => {
            const active = seleccionadosIds.has(`tour:${t.id}`);
            return (
              <button
                key={t.id}
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
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900">
                      {t.nombre}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.seccion} {t.horario ? `· ${t.horario}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 text-right whitespace-nowrap">
                    1pax ${t.precios.p1} · 2-5 ${t.precios.p2_5} · 6-10 ${t.precios.p6_10}
                  </div>
                </div>
              </button>
            );
          })}

        {tab === "traslado" &&
          filteredTraslados.map((t) => {
            const active = seleccionadosIds.has(`traslado:${t.id}`);
            return (
              <button
                key={t.id}
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
                className={`w-full text-left p-3 rounded-md border transition-all ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900">
                      {t.nombre}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.tipo} · {t.categoria}
                    </div>
                  </div>
                  <div className="text-xs text-slate-700 text-right whitespace-nowrap">
                    1pax ${t.precios.p1} · 2-5 ${t.precios.p2_5} · 6-10 ${t.precios.p6_10}
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {seleccionados.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="text-xs font-medium text-slate-600 mb-2">
            Seleccionados ({seleccionados.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {seleccionados.map((s) => (
              <span
                key={`${s.tipo}-${s.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700"
              >
                <span className="font-medium">{tagFor(s.tipo)}</span>
                <span className="max-w-[200px] truncate">{s.nombre}</span>
                <button
                  onClick={() => remove(s)}
                  className="hover:text-red-600"
                  aria-label="Quitar"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function tagFor(t: ServicioSeleccionado["tipo"]) {
  if (t === "hotel") return "🏨";
  if (t === "tour") return "📍";
  return "🚐";
}

function TabBtn({
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function ManualForm({
  onAdd,
  onCancel,
}: {
  onAdd: (s: ServicioSeleccionado) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<ServicioSeleccionado["tipo"]>("tour");
  const [precio, setPrecio] = useState(0);
  const [precioSGL, setPrecioSGL] = useState(0);
  const [precioDBL, setPrecioDBL] = useState(0);
  const [precioTPL, setPrecioTPL] = useState(0);

  const submit = () => {
    if (!nombre.trim()) return;
    if (tipo === "hotel") {
      onAdd({
        id: `MAN-${Date.now()}`,
        tipo,
        nombre,
        manual: true,
        precios: { SGL: precioSGL, DBL: precioDBL, TPL: precioTPL, chd: 0 },
      });
    } else {
      onAdd({
        id: `MAN-${Date.now()}`,
        tipo,
        nombre,
        manual: true,
        precios: { p1: precio, p2_5: precio, p6_10: precio, chd: 0 },
      });
    }
  };

  return (
    <div className="mb-4 p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nombre del servicio
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Tour personalizado"
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ServicioSeleccionado["tipo"])}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="hotel">Hotel</option>
            <option value="tour">Tour</option>
            <option value="traslado">Traslado</option>
          </select>
        </div>
        {tipo === "hotel" ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Precio SGL
              </label>
              <input
                type="number"
                value={precioSGL}
                onChange={(e) => setPrecioSGL(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Precio DBL
              </label>
              <input
                type="number"
                value={precioDBL}
                onChange={(e) => setPrecioDBL(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Precio TPL
              </label>
              <input
                type="number"
                value={precioTPL}
                onChange={(e) => setPrecioTPL(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900"
              />
            </div>
          </>
        ) : (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Precio por persona
            </label>
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Agregar
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
