import { Section } from "./ClientForm";
import AddServiceMenu, { type AddOption } from "./AddServiceMenu";
import type {
  Acomodacion,
  ServicioSeleccionado,
} from "@/lib/types";
import { fmt, pickTier, priceForTier } from "@/lib/calc";
import {
  ListChecks,
  Pencil,
  Trash2,
  Plus,
  Hotel,
  MapPin,
  Bus,
} from "lucide-react";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  onChange: (s: ServicioSeleccionado[]) => void;
  onAdd: (initial: AddOption) => void;
  onEdit: (s: ServicioSeleccionado) => void;
}

const GROUP_ORDER: ServicioSeleccionado["tipo"][] = [
  "hotel",
  "traslado",
  "tour",
];

const GROUP_TITLE: Record<ServicioSeleccionado["tipo"], string> = {
  hotel: "Alojamiento",
  traslado: "Traslados",
  tour: "Tours",
};

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

  const groups = GROUP_ORDER.map((tipo) => ({
    tipo,
    items: servicios.filter((s) => s.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <Section
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
          className="w-full py-10 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-500 hover:text-primary transition-colors text-sm flex flex-col items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          Agregar primer servicio
        </button>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.tipo}>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">
                {GROUP_TITLE[g.tipo]}
              </div>
              <div className="rounded-2xl bg-slate-50/70 border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {g.items.map((s) => (
                  <ServicioRow
                    key={`${s.tipo}-${s.id}`}
                    servicio={s}
                    acomodaciones={acomodaciones}
                    pasajeros={pasajeros}
                    onEdit={() => onEdit(s)}
                    onRemove={() => remove(s)}
                  />
                ))}
              </div>
            </div>
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

function tipoColors(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel")
    return { bg: "bg-amber-50", text: "text-amber-600" };
  if (tipo === "tour")
    return { bg: "bg-emerald-50", text: "text-emerald-600" };
  return { bg: "bg-sky-50", text: "text-sky-600" };
}

function ServicioRow({
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
  const unit =
    typeof servicio.unitOverride === "number"
      ? servicio.unitOverride
      : priceForTier(servicio.precios, appliedTier);
  const colors = tipoColors(servicio.tipo);
  const primaryAcom = acomodaciones[0] ?? "DBL";
  const hotelPrice = isHotel ? servicio.precios[primaryAcom] ?? 0 : 0;

  let descripcion = "";
  if (isHotel) {
    const parts = [servicio.ubicacion, servicio.estrellas].filter(Boolean);
    if (servicio.fechaInicio && servicio.fechaFin)
      parts.push(`${servicio.fechaInicio} → ${servicio.fechaFin}`);
    descripcion = parts.join(" · ");
  } else {
    const parts: string[] = [];
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (servicio.paxOverride) parts.push(`${servicio.paxOverride} pax`);
    if (servicio.manual) parts.push("manual");
    descripcion = parts.join(" · ");
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
      <div
        className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}
      >
        {iconForTipo(servicio.tipo)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">
          {servicio.nombre}
        </div>
        {descripcion && (
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {descripcion}
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-slate-900 tabular-nums">
          {fmt(isHotel ? hotelPrice : unit)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">
          {isHotel ? `${primaryAcom} /noche` : "p/p"}
        </div>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
          aria-label="Quitar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
