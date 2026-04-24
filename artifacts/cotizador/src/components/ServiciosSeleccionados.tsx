import { useState } from "react";
import { Section } from "./ClientForm";
import Modal from "./Modal";
import type {
  Acomodacion,
  ServicioSeleccionado,
} from "@/lib/types";
import { fmt } from "@/lib/calc";
import { ListChecks, Pencil, Trash2, Plus, Hotel, MapPin, Bus } from "lucide-react";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  onChange: (s: ServicioSeleccionado[]) => void;
  onAdd: () => void;
}

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  onChange,
  onAdd,
}: Props) {
  const [editing, setEditing] = useState<ServicioSeleccionado | null>(null);

  const remove = (s: ServicioSeleccionado) => {
    onChange(servicios.filter((x) => !(x.tipo === s.tipo && x.id === s.id)));
  };

  const update = (s: ServicioSeleccionado) => {
    onChange(
      servicios.map((x) => (x.tipo === s.tipo && x.id === s.id ? s : x)),
    );
  };

  return (
    <>
      <Section
        step={4}
        icon={<ListChecks className="w-4 h-4" />}
        title="Servicios seleccionados"
        subtitle={
          servicios.length
            ? `${servicios.length} ítem${servicios.length !== 1 ? "s" : ""} en la cotización`
            : "Aún no has agregado servicios"
        }
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Agregar servicio
          </button>
        }
      >
        {servicios.length === 0 ? (
          <button
            onClick={onAdd}
            className="w-full py-10 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-500 hover:text-primary transition-colors text-sm flex flex-col items-center gap-2"
          >
            <Plus className="w-6 h-6" />
            Agregar primer servicio
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {servicios.map((s) => (
              <ServicioCard
                key={`${s.tipo}-${s.id}`}
                servicio={s}
                acomodaciones={acomodaciones}
                onEdit={() => setEditing(s)}
                onRemove={() => remove(s)}
              />
            ))}
          </div>
        )}
      </Section>

      {editing && (
        <EditModal
          servicio={editing}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            update(s);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function iconForTipo(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return <Hotel className="w-4 h-4" />;
  if (tipo === "tour") return <MapPin className="w-4 h-4" />;
  return <Bus className="w-4 h-4" />;
}

function emojiForTipo(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return "🏨";
  if (tipo === "tour") return "🗺️";
  return "🚐";
}

function ServicioCard({
  servicio,
  acomodaciones,
  onEdit,
  onRemove,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors group bg-white">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            {iconForTipo(servicio.tipo)}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
              {emojiForTipo(servicio.tipo)} {labelTipo(servicio.tipo)}
              {servicio.manual && (
                <span className="ml-1.5 text-amber-600">· manual</span>
              )}
            </div>
            <div className="text-sm font-semibold text-slate-900 leading-tight mt-0.5">
              {servicio.nombre}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
            aria-label="Quitar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {servicio.tipo === "hotel"
          ? acomodaciones.map((a) => (
              <PriceLine
                key={a}
                label={a}
                value={`${fmt(servicio.precios[a] ?? 0)}/noche`}
              />
            ))
          : (() => {
              const p1 = servicio.precios.p1 ?? 0;
              const p25 = servicio.precios.p2_5 ?? 0;
              const p610 = servicio.precios.p6_10 ?? 0;
              return (
                <>
                  <PriceLine label="1 pax" value={`${fmt(p1)} p/p`} />
                  <PriceLine label="2-5 pax" value={`${fmt(p25)} p/p`} />
                  <PriceLine label="6-10 pax" value={`${fmt(p610)} p/p`} />
                </>
              );
            })()}
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-slate-500 text-xs font-medium">{label}</span>
      <span className="text-slate-900 font-semibold">{value}</span>
    </div>
  );
}

function labelTipo(t: ServicioSeleccionado["tipo"]) {
  if (t === "hotel") return "Hotel";
  if (t === "tour") return "Tour";
  return "Traslado";
}

function EditModal({
  servicio,
  onClose,
  onSave,
}: {
  servicio: ServicioSeleccionado;
  onClose: () => void;
  onSave: (s: ServicioSeleccionado) => void;
}) {
  const [nombre, setNombre] = useState(servicio.nombre);
  const [precios, setPrecios] = useState({ ...servicio.precios });

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <Modal open onClose={onClose} title="Editar servicio" size="md">
      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Nombre
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Tarifas
          </div>
          {servicio.tipo === "hotel" ? (
            <div className="grid grid-cols-3 gap-3">
              {(["SGL", "DBL", "TPL"] as const).map((a) => (
                <div key={a}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {a}
                  </label>
                  <input
                    type="number"
                    value={precios[a] ?? 0}
                    onChange={(e) =>
                      setPrecios({
                        ...precios,
                        [a]: Number(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  1 pax
                </label>
                <input
                  type="number"
                  value={precios.p1 ?? 0}
                  onChange={(e) =>
                    setPrecios({ ...precios, p1: Number(e.target.value) || 0 })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  2-5 pax
                </label>
                <input
                  type="number"
                  value={precios.p2_5 ?? 0}
                  onChange={(e) =>
                    setPrecios({
                      ...precios,
                      p2_5: Number(e.target.value) || 0,
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  6-10 pax
                </label>
                <input
                  type="number"
                  value={precios.p6_10 ?? 0}
                  onChange={(e) =>
                    setPrecios({
                      ...precios,
                      p6_10: Number(e.target.value) || 0,
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Niño
                </label>
                <input
                  type="number"
                  value={precios.chd ?? 0}
                  onChange={(e) =>
                    setPrecios({ ...precios, chd: Number(e.target.value) || 0 })
                  }
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-white"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave({ ...servicio, nombre, precios })}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}
