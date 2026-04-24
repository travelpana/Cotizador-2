import { Section } from "./ClientForm";
import AddServiceMenu, { type AddOption } from "./AddServiceMenu";
import type {
  Acomodacion,
  ServicioSeleccionado,
} from "@/lib/types";
import { fmt, pickTier, priceForTier, tierLabel } from "@/lib/calc";
import {
  ListChecks,
  Pencil,
  Trash2,
  Plus,
  Hotel,
  MapPin,
  Bus,
  Calendar,
} from "lucide-react";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  onChange: (s: ServicioSeleccionado[]) => void;
  onAdd: (initial: AddOption) => void;
  onEdit: (s: ServicioSeleccionado) => void;
}

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  pasajeros,
  onChange,
  onAdd,
  onEdit,
}: Props) {
  const remove = (s: ServicioSeleccionado) => {
    onChange(servicios.filter((x) => !(x.tipo === s.tipo && x.id === s.id)));
  };

  return (
    <Section
      step={4}
      icon={<ListChecks className="w-4 h-4" />}
      title="Servicios seleccionados"
      subtitle={
        servicios.length
          ? `${servicios.length} ítem${servicios.length !== 1 ? "s" : ""} en la cotización`
          : "Aún no has agregado servicios"
      }
      action={<AddServiceMenu onSelect={onAdd} />}
    >
      {servicios.length === 0 ? (
        <button
          onClick={() => onAdd("hotel")}
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
              pasajeros={pasajeros}
              onEdit={() => onEdit(s)}
              onRemove={() => remove(s)}
            />
          ))}
        </div>
      )}
    </Section>
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

function labelTipo(t: ServicioSeleccionado["tipo"]) {
  if (t === "hotel") return "Hotel";
  if (t === "tour") return "Tour";
  return "Traslado";
}

function ServicioCard({
  servicio,
  acomodaciones,
  pasajeros,
  onEdit,
  onRemove,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  pasajeros: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const isHotel = servicio.tipo === "hotel";
  const paxLocal = servicio.paxOverride ?? pasajeros;
  const autoTier = pickTier(paxLocal);
  const appliedTier = servicio.tarifaOverride ?? autoTier;
  const unit = priceForTier(servicio.precios, appliedTier);
  const isOverridden = !!servicio.tarifaOverride;
  const codigo = servicio.codigo ?? servicio.id;

  return (
    <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors group bg-white">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            {iconForTipo(servicio.tipo)}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-0.5">
              {codigo}
            </div>
            <div className="text-sm font-semibold text-slate-900 leading-tight">
              {servicio.nombre}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {emojiForTipo(servicio.tipo)} {labelTipo(servicio.tipo)}
              {servicio.manual && (
                <span className="ml-1.5 text-amber-600">· manual</span>
              )}
              {servicio.paxOverride && (
                <span className="ml-1.5 text-blue-600">
                  · {servicio.paxOverride} pax
                </span>
              )}
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

      {isHotel ? (
        <div className="space-y-1">
          {servicio.fechaInicio && servicio.fechaFin && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
              <Calendar className="w-3 h-3" />
              {servicio.fechaInicio} → {servicio.fechaFin}
            </div>
          )}
          {acomodaciones.map((a) => (
            <PriceLine
              key={a}
              label={a}
              value={`${fmt(servicio.precios[a] ?? 0)}/noche`}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 p-3 space-y-1">
          {servicio.usarFecha && servicio.fecha && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium mb-1">
              <Calendar className="w-3 h-3" />
              {servicio.fecha}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                Tarifa aplicada
              </div>
              <div className="text-lg font-bold text-slate-900 leading-tight">
                {fmt(unit)}{" "}
                <span className="text-xs text-slate-500 font-normal">p/p</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Rango
              </div>
              <div className="text-xs font-medium text-slate-700">
                {tierLabel(appliedTier)}
                {isOverridden && (
                  <span className="ml-1 text-[10px] text-amber-600">manual</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {servicio.notas && (
        <div className="mt-2 text-[11px] text-slate-500 italic line-clamp-2">
          {servicio.notas}
        </div>
      )}
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
