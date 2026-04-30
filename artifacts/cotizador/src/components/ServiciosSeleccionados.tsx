import { useState } from "react";
import { PriceInput } from "@/components/ui/price-input";
import { Section } from "./ClientForm";
import type {
  Acomodacion,
  ServicioSeleccionado,
  TourTickets,
} from "@/lib/types";
import { fmt, pickTier, priceForTier } from "@/lib/calc";
import { formatTrasladoNombre } from "@/lib/utils";
import SingleDatePicker from "./SingleDatePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ListChecks,
  Pencil,
  Trash2,
  Hotel,
  MapPin,
  Bus,
  Plane,
  Search,
  Plus,
  Calendar,
  StickyNote,
  Ticket,
  GripVertical,
} from "lucide-react";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  highlightedId?: string | null;
  onChange: (s: ServicioSeleccionado[]) => void;
  onEdit: (s: ServicioSeleccionado) => void;
  onAddCustom?: () => void;
}

const GROUP_ORDER: ServicioSeleccionado["tipo"][] = [
  "hotel",
  "traslado",
  "vuelo",
  "tour",
];

const GROUP_TITLE: Record<ServicioSeleccionado["tipo"], string> = {
  hotel: "Alojamiento",
  traslado: "Traslados",
  vuelo: "Vuelos",
  tour: "Tours",
};

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  pasajeros,
  highlightedId,
  onChange,
  onEdit,
  onAddCustom,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const remove = (s: ServicioSeleccionado) => {
    onChange(servicios.filter((x) => !(x.tipo === s.tipo && x.id === s.id)));
  };

  const update = (s: ServicioSeleccionado) => {
    onChange(
      servicios.map((x) =>
        x.tipo === s.tipo && x.id === s.id ? s : x,
      ),
    );
  };

  const handleDrop = (
    targetTipo: ServicioSeleccionado["tipo"],
    targetId: string,
  ) => {
    if (!dragId) return;
    const sep = dragId.indexOf("|");
    const dTipo = dragId.slice(0, sep) as ServicioSeleccionado["tipo"];
    const dId = dragId.slice(sep + 1);
    if (dTipo !== targetTipo || dId === targetId) {
      setDragId(null);
      setDragOverKey(null);
      return;
    }
    const groupItems = servicios.filter((s) => s.tipo === targetTipo);
    const fromIdx = groupItems.findIndex((s) => s.id === dId);
    const toIdx = groupItems.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null);
      setDragOverKey(null);
      return;
    }
    const newGroup = [...groupItems];
    const [moved] = newGroup.splice(fromIdx, 1);
    newGroup.splice(toIdx, 0, moved);
    const result = GROUP_ORDER.flatMap((t) =>
      t === targetTipo ? newGroup : servicios.filter((s) => s.tipo === t),
    );
    onChange(result);
    setDragId(null);
    setDragOverKey(null);
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
          : "Busca un servicio arriba para agregarlo al instante"
      }
      action={
        onAddCustom && (
          <button
            type="button"
            onClick={onAddCustom}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ítem personalizado
          </button>
        )
      }
    >
      {servicios.length === 0 ? (
        <div className="rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <div className="font-medium text-slate-700">
            Aún no has agregado servicios
          </div>
          <div className="text-xs text-slate-500">
            Usa el buscador para encontrar hoteles, traslados o tours.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.tipo}>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">
                {GROUP_TITLE[g.tipo]}
              </div>
              <div className="rounded-2xl bg-slate-50/70 border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {g.items.map((s) => {
                  const rowKey = `${s.tipo}-${s.id}`;
                  const dragKey = `${s.tipo}|${s.id}`;
                  return (
                    <ServicioRow
                      key={rowKey}
                      servicio={s}
                      acomodaciones={acomodaciones}
                      pasajeros={pasajeros}
                      highlight={highlightedId === s.id}
                      isDragging={dragId === dragKey}
                      isDragOver={dragOverKey === rowKey}
                      onDragStart={() => setDragId(dragKey)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverKey(rowKey);
                      }}
                      onDrop={() => handleDrop(s.tipo, s.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverKey(null);
                      }}
                      onEdit={() => onEdit(s)}
                      onRemove={() => remove(s)}
                      onUpdate={update}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function iconForTipo(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return <Hotel className="w-4 h-4" />;
  if (tipo === "tour") return <MapPin className="w-4 h-4" />;
  if (tipo === "vuelo") return <Plane className="w-4 h-4" />;
  return <Bus className="w-4 h-4" />;
}

function tipoColors(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return { bg: "bg-amber-50", text: "text-amber-600" };
  if (tipo === "tour") return { bg: "bg-emerald-50", text: "text-emerald-600" };
  if (tipo === "vuelo") return { bg: "bg-indigo-50", text: "text-indigo-600" };
  return { bg: "bg-sky-50", text: "text-sky-600" };
}

function fmtDMA(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${String(y).slice(-2)}`;
}

/* ───────────────────────── ServicioRow ───────────────────────── */

function ServicioRow({
  servicio,
  acomodaciones,
  pasajeros,
  highlight,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onRemove,
  onUpdate,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  pasajeros: number;
  highlight?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onUpdate: (s: ServicioSeleccionado) => void;
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

  const [openEditor, setOpenEditor] = useState<
    "dates" | "price" | "notes" | "tickets" | null
  >(null);

  let descripcion: React.ReactNode = null;
  if (isHotel) {
    const meta = [servicio.ubicacion, servicio.estrellas]
      .filter(Boolean)
      .join(" · ");
    const hasDates = servicio.fechaInicio && servicio.fechaFin;
    descripcion = (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
        {meta && <span>{meta}</span>}
        {meta && hasDates && <span className="text-slate-300">·</span>}
        {hasDates && (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Calendar className="w-3 h-3" />
            {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
          </span>
        )}
      </span>
    );
  } else if (servicio.tipo === "vuelo") {
    const parts: string[] = [];
    if (servicio.origen && servicio.destino)
      parts.push(`${servicio.origen} → ${servicio.destino}`);
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (parts.length) descripcion = parts.join(" · ");
  } else {
    const parts: string[] = [];
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (servicio.paxOverride) parts.push(`${servicio.paxOverride} pax`);
    if (parts.length) descripcion = parts.join(" · ");
  }

  const titleLabel =
    servicio.tipo === "traslado"
      ? formatTrasladoNombre(servicio.nombre)
      : servicio.nombre;

  const rowClasses = [
    "group flex items-center gap-2 px-3 py-3 transition-colors",
    isDragging ? "opacity-40" : "",
    isDragOver ? "ring-2 ring-inset ring-primary/30 bg-primary/[0.03]" : "",
    highlight
      ? "bg-emerald-50 ring-1 ring-emerald-200"
      : !isDragOver
        ? "bg-white hover:bg-slate-50"
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={rowClasses}
    >
      {/* Drag handle */}
      <div className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Type icon */}
      <div
        className={`w-8 h-8 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}
      >
        {iconForTipo(servicio.tipo)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">
          {titleLabel}
        </div>
        {servicio.manual && (
          <div className="mt-0.5">
            <span className="inline-block text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              manual
            </span>
          </div>
        )}

        {/* Description / dates trigger */}
        {isHotel ? (
          <Popover
            open={openEditor === "dates"}
            onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 -mx-1 px-1 py-0.5 rounded transition-colors text-left mt-0.5 truncate max-w-full"
                title="Editar fechas de estadía"
              >
                {descripcion || (
                  <span className="text-slate-400 italic">Agregar fechas</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[300px] p-4 z-[60]"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                const target = e.target as Node;
                if (
                  document
                    .querySelector(".flatpickr-calendar")
                    ?.contains(target)
                ) {
                  e.preventDefault();
                }
              }}
            >
              <DatesEditor
                servicio={servicio}
                onSave={(patch) => onUpdate({ ...servicio, ...patch })}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        ) : descripcion ? (
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {descripcion}
          </div>
        ) : null}

        {/* Notes line (all types) */}
        {servicio.notas && (
          <div className="text-[11px] text-amber-700 truncate mt-0.5 italic">
            "{servicio.notas}"
          </div>
        )}

        {/* Tour tickets add-on */}
        {servicio.tipo === "tour" &&
          servicio.tickets?.enabled &&
          servicio.tickets.adultPrice > 0 && (
            <div className="text-[11px] text-amber-600 mt-1 truncate">
              Costo adicional por entradas:{servicio.tickets.label ? ` ${servicio.tickets.label} ·` : ""} Adultos {fmt(servicio.tickets.adultPrice)} p/p
              {servicio.tickets.childPrice !== undefined && servicio.tickets.childPrice > 0
                ? ` · Niños ${fmt(servicio.tickets.childPrice)} p/p`
                : ""}
            </div>
          )}

        {/* Tour horario */}
        {servicio.tipo === "tour" && servicio.horario && (
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Horario: {servicio.horario}
          </div>
        )}
      </div>

      {/* Price area */}
      {isHotel ? (
        <Popover
          open={openEditor === "price"}
          onOpenChange={(o) => setOpenEditor(o ? "price" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 flex-shrink-0 px-2 py-1 -mx-1 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors"
              title="Editar precios"
            >
              {acomodaciones.map((a) => (
                <div key={a} className="text-right">
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {fmt(servicio.precios[a] ?? 0)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    {a}/noche
                  </div>
                </div>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[240px] p-4 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <PricesEditor
              servicio={servicio}
              acomodaciones={acomodaciones}
              onSave={(precios) => {
                onUpdate({ ...servicio, precios });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover
          open={openEditor === "price"}
          onOpenChange={(o) => setOpenEditor(o ? "price" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-right flex-shrink-0 px-2 py-1 -mx-1 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors"
              title="Editar precio"
            >
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {fmt(unit)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                p/p
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[280px] p-0 z-[60] overflow-hidden"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <UnitPriceEditor
              currentUnit={unit}
              onSave={(val) => {
                onUpdate({ ...servicio, unitOverride: val ?? undefined });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Action icons — all service types */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
        {servicio.tipo === "tour" && (
          <Popover
            open={openEditor === "tickets"}
            onOpenChange={(o) => setOpenEditor(o ? "tickets" : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`p-1.5 rounded-lg transition-colors ${
                  servicio.tickets?.enabled
                    ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 opacity-100"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                aria-label="Entradas"
                title={
                  servicio.tickets?.enabled
                    ? "Editar entradas"
                    : "Agregar entradas"
                }
              >
                <Ticket className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[320px] p-4 z-[60]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <TicketsEditor
                value={servicio.tickets}
                onSave={(tickets) => {
                  onUpdate({ ...servicio, tickets });
                  setOpenEditor(null);
                }}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        )}

        <Popover
          open={openEditor === "notes"}
          onOpenChange={(o) => setOpenEditor(o ? "notes" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`p-1.5 rounded-lg transition-colors ${
                servicio.notas
                  ? "text-amber-600 bg-amber-50 hover:bg-amber-100 opacity-100"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
              aria-label="Notas"
              title={servicio.notas ? "Editar notas" : "Agregar notas"}
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[300px] p-3 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <NotesEditor
              value={servicio.notas ?? ""}
              onSave={(notas) => {
                onUpdate({
                  ...servicio,
                  notas: notas.trim() ? notas : undefined,
                });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Editar"
          title={isHotel ? "Más opciones" : "Editar"}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Quitar"
          title="Quitar servicio"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Inline editors (popovers) ───────────────────────── */

function DatesEditor({
  servicio,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  onSave: (patch: Partial<ServicioSeleccionado>) => void;
  onClose: () => void;
}) {
  const [fechaInicio, setFechaInicio] = useState(servicio.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(servicio.fechaFin ?? "");

  const persist = (inicio: string, fin: string) => {
    onSave({
      fechaInicio: inicio || undefined,
      fechaFin: fin || undefined,
    });
  };

  const handleCheckIn = (iso: string) => {
    let fin = fechaFin;
    if (iso && (!fechaFin || fechaFin <= iso)) {
      const d = new Date(iso + "T00:00:00");
      d.setDate(d.getDate() + 1);
      fin = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setFechaFin(fin);
    }
    setFechaInicio(iso);
    persist(iso, fin);
  };

  const handleCheckOut = (iso: string) => {
    setFechaFin(iso);
    persist(fechaInicio, iso);
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
        <Calendar className="w-3 h-3" />
        Estadía
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Check-in
          </label>
          <SingleDatePicker
            value={fechaInicio}
            onChange={handleCheckIn}
            placeholder="Check-in"
            allowPast
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Check-out
          </label>
          <SingleDatePicker
            value={fechaFin}
            onChange={handleCheckOut}
            placeholder="Check-out"
            allowPast
            minDate={fechaInicio || undefined}
          />
        </div>
      </div>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function PricesEditor({
  servicio,
  acomodaciones,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  onSave: (precios: ServicioSeleccionado["precios"]) => void;
  onClose: () => void;
}) {
  const initial: Record<string, string> = {
    SGL: String(servicio.precios.SGL ?? 0),
    DBL: String(servicio.precios.DBL ?? 0),
    TPL: String(servicio.precios.TPL ?? 0),
    CHD: String(servicio.precios.CHD ?? servicio.precios.chd ?? 0),
  };
  const [vals, setVals] = useState<Record<string, string>>(initial);

  const num = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const handleApply = () => {
    onSave({
      ...servicio.precios,
      SGL: num(vals.SGL),
      DBL: num(vals.DBL),
      TPL: num(vals.TPL),
      CHD: num(vals.CHD),
      chd: num(vals.CHD),
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        Precio por noche (p/p)
      </div>
      <div className="grid grid-cols-2 gap-2">
        {acomodaciones.map((a) => (
          <div key={a}>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              {a}
            </label>
            <PriceInput
              value={vals[a] ?? "0"}
              onChange={(v) => setVals((prev) => ({ ...prev, [a]: v }))}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="w-full"
              inputClassName="w-full h-9 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function UnitPriceEditor({
  currentUnit,
  onSave,
  onClose,
}: {
  currentUnit: number;
  onSave: (val: number | null) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState<string>(String(currentUnit));

  const handleApply = () => {
    const n = parseFloat(val);
    onSave(isNaN(n) ? null : n);
  };

  const handleReset = () => {
    onSave(null);
  };

  return (
    <div className="flex flex-col box-border w-full">
      <div className="px-5 pt-4 pb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
          Precio por persona
        </div>
      </div>
      <div className="px-5 pb-3">
        <PriceInput
          value={val}
          onChange={setVal}
          onApply={handleApply}
          onCancel={onClose}
          autoFocus
          wrapperClassName="w-full"
          inputClassName="w-full h-9 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
      <div className="px-5 pb-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleReset}
          title="Restablecer precio automático"
          className="mr-auto px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-500 hover:bg-slate-100 whitespace-nowrap"
        >
          Restablecer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100 whitespace-nowrap"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 whitespace-nowrap"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function NotesEditor({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (notas: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);

  const handleApply = () => {
    onSave(text);
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
        <StickyNote className="w-3 h-3" />
        Notas
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Detalles, restricciones u observaciones para el cliente..."
        rows={4}
        autoFocus
        className="w-full px-2.5 py-2 rounded-md border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── TicketsEditor (tours) ───────────────────────── */

function TicketsEditor({
  value,
  onSave,
  onClose,
}: {
  value?: TourTickets;
  onSave: (tickets: TourTickets | undefined) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState<string>(value?.label ?? "");
  const [adultPrice, setAdultPrice] = useState<number>(value?.adultPrice ?? 0);
  const [childPriceText, setChildPriceText] = useState<string>(
    value?.childPrice !== undefined ? String(value.childPrice) : "",
  );

  const handleApply = () => {
    const childPrice = childPriceText.trim() === "" ? undefined : Number(childPriceText);
    onSave({
      enabled: true,
      label: label.trim(),
      adultPrice: Number.isFinite(adultPrice) ? adultPrice : 0,
      childPrice:
        childPrice !== undefined && Number.isFinite(childPrice) && childPrice >= 0
          ? childPrice
          : undefined,
    });
  };

  const inputClass =
    "w-full px-2.5 py-2 rounded-md border border-slate-200 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
        <Ticket className="w-3 h-3" />
        Entradas
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Museo del Canal"
            autoFocus
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Adulto
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={String(adultPrice)}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9]/g, "");
                  setAdultPrice(sanitized === "" ? 0 : Number(sanitized));
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleApply(); }
                  else if (e.key === "Escape") { e.preventDefault(); onClose(); }
                }}
                placeholder="0"
                className={`${inputClass} pl-6 tabular-nums`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
              Niño (opcional)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={childPriceText}
                onChange={(e) => setChildPriceText(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleApply(); }
                  else if (e.key === "Escape") { e.preventDefault(); onClose(); }
                }}
                placeholder="—"
                className={`${inputClass} pl-6 tabular-nums`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-1">
        {value?.enabled ? (
          <button
            type="button"
            onClick={() => { onSave(undefined); onClose(); }}
            className="px-3 py-1.5 text-xs font-medium rounded-md text-red-500 hover:bg-red-50"
          >
            Quitar entradas
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={adultPrice === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
