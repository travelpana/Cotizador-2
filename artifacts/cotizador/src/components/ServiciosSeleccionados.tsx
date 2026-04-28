import { useState } from "react";
import { Section } from "./ClientForm";
import type {
  Acomodacion,
  ServicioSeleccionado,
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
                {g.items.map((s) => (
                  <ServicioRow
                    key={`${s.tipo}-${s.id}`}
                    servicio={s}
                    acomodaciones={acomodaciones}
                    pasajeros={pasajeros}
                    highlight={highlightedId === s.id}
                    onEdit={() => onEdit(s)}
                    onRemove={() => remove(s)}
                    onUpdate={update}
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
  if (tipo === "vuelo") return <Plane className="w-4 h-4" />;
  return <Bus className="w-4 h-4" />;
}

function tipoColors(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel")
    return { bg: "bg-amber-50", text: "text-amber-600" };
  if (tipo === "tour")
    return { bg: "bg-emerald-50", text: "text-emerald-600" };
  if (tipo === "vuelo")
    return { bg: "bg-indigo-50", text: "text-indigo-600" };
  return { bg: "bg-sky-50", text: "text-sky-600" };
}

/** d-m-aa */
function fmtDMA(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${String(y).slice(-2)}`;
}

function ServicioRow({
  servicio,
  acomodaciones,
  pasajeros,
  highlight,
  onEdit,
  onRemove,
  onUpdate,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  pasajeros: number;
  highlight?: boolean;
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
  const primaryAcom = acomodaciones[0] ?? "DBL";
  const hotelPrice = isHotel ? servicio.precios[primaryAcom] ?? 0 : 0;

  // Track which inline editor (if any) is open. Only one at a time.
  const [openEditor, setOpenEditor] = useState<
    "dates" | "price" | "notes" | null
  >(null);

  let descripcion: React.ReactNode = "";
  if (isHotel) {
    const meta = [servicio.ubicacion, servicio.estrellas].filter(Boolean).join(" · ");
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
    descripcion = parts.join(" · ");
  } else {
    const parts: string[] = [];
    if (servicio.usarFecha && servicio.fecha) parts.push(servicio.fecha);
    if (servicio.paxOverride) parts.push(`${servicio.paxOverride} pax`);
    descripcion = parts.join(" · ");
  }

  const titleLabel =
    servicio.tipo === "traslado"
      ? formatTrasladoNombre(servicio.nombre)
      : servicio.nombre;

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 transition-colors ${
        highlight
          ? "bg-emerald-50 ring-1 ring-emerald-200"
          : "bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}
      >
        {iconForTipo(servicio.tipo)}
      </div>
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
        {isHotel ? (
          <Popover
            open={openEditor === "dates"}
            onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 -mx-1 px-1 py-0.5 rounded transition-colors text-left mt-0.5 truncate max-w-full"
                title="Editar fechas"
              >
                {descripcion || (
                  <span className="text-slate-400 italic">Agregar fechas</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[320px] p-4 z-[60]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DatesEditor
                servicio={servicio}
                onSave={(patch) => {
                  onUpdate({ ...servicio, ...patch });
                }}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        ) : (
          descripcion && (
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {descripcion}
            </div>
          )
        )}
        {isHotel && servicio.notas && (
          <div className="text-[11px] text-amber-700 truncate mt-0.5 italic">
            “{servicio.notas}”
          </div>
        )}
        {servicio.tipo === "tour" && servicio.entrada && servicio.entrada.precio > 0 && (
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
            + Entrada adicional: {fmt(servicio.entrada.precio)} por persona
          </div>
        )}
      </div>

      {isHotel ? (
        <Popover
          open={openEditor === "price"}
          onOpenChange={(o) => setOpenEditor(o ? "price" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-right flex-shrink-0 px-2 py-1 -mx-1 rounded-lg hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-colors"
              title="Editar precios"
            >
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {fmt(hotelPrice)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                {primaryAcom} /noche
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[280px] p-4 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <PricesEditor
              servicio={servicio}
              onSave={(precios) => {
                onUpdate({ ...servicio, precios });
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-slate-900 tabular-nums">
            {fmt(unit)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            p/p
          </div>
        </div>
      )}

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
        {isHotel && (
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
                }}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Editar"
          title={isHotel ? "Más opciones" : "Editar"}
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

  const handleApply = () => {
    onSave({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    });
    onClose();
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
            onChange={(iso) => {
              setFechaInicio(iso);
              if (iso) {
                const d = new Date(iso + "T00:00:00");
                d.setDate(d.getDate() + 1);
                const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                if (!fechaFin || fechaFin <= iso) setFechaFin(next);
              }
            }}
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
            onChange={(iso) => setFechaFin(iso)}
            placeholder="Check-out"
            allowPast
            minDate={fechaInicio || undefined}
          />
        </div>
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

function PricesEditor({
  servicio,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  onSave: (precios: ServicioSeleccionado["precios"]) => void;
  onClose: () => void;
}) {
  const [sgl, setSgl] = useState<string>(String(servicio.precios.SGL ?? 0));
  const [dbl, setDbl] = useState<string>(String(servicio.precios.DBL ?? 0));
  const [tpl, setTpl] = useState<string>(String(servicio.precios.TPL ?? 0));
  const [chd, setChd] = useState<string>(
    String(servicio.precios.CHD ?? servicio.precios.chd ?? 0),
  );

  const num = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const handleApply = () => {
    onSave({
      ...servicio.precios,
      SGL: num(sgl),
      DBL: num(dbl),
      TPL: num(tpl),
      CHD: num(chd),
      chd: num(chd),
    });
    onClose();
  };

  const fields: Array<[string, string, (v: string) => void]> = [
    ["SGL", sgl, setSgl],
    ["DBL", dbl, setDbl],
    ["TPL", tpl, setTpl],
    ["CHD", chd, setChd],
  ];

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        Precios por noche (p/p)
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([label, val, set]) => (
          <div key={label}>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              {label}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={val}
              onChange={(e) => set(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full h-9 px-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
    onClose();
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
