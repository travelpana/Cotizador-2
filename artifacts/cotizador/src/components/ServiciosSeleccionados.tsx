import { useState, useRef, useEffect, useMemo } from "react";
import emptyStateImg from "@assets/SCR-20260531-dddl_(1)_1780213506931.png";
import { PriceInput } from "@/components/ui/price-input";
import { Section } from "./ClientForm";
import type {
  Acomodacion,
  ServicioSeleccionado,
  TourTickets,
} from "@/lib/types";
import { fmt, pickTier, priceForTier } from "@/lib/calc";
import { formatTrasladoNombre, personalizarNombreTraslado } from "@/lib/utils";
import { formatRegimen } from "@/lib/regimen";
import InlineRangePicker, { nightsBetween } from "./InlineRangePicker";
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
  Ship,
  Search,
  Plus,
  Calendar,
  StickyNote,
  Ticket,
  GripVertical,
  LayoutTemplate,
  ChevronDown,
  Building2,
  List,
  X,
} from "lucide-react";
import { loadPlantillas, pushReciente, type Plantilla } from "@/lib/plantillas";
import { loadObservaciones } from "@/lib/observaciones";
import PlantillaSelectorModal from "./PlantillaSelectorModal";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  highlightedId?: string | null;
  onChange: (s: ServicioSeleccionado[]) => void;
  onEdit: (s: ServicioSeleccionado) => void;
  onAddCustom?: () => void;
  onCargarPlantilla?: (id: string) => void;
  onEditarPlantilla?: (p: Plantilla) => void;
  observaciones?: string;
  onObservacionesChange?: (v: string) => void;
  personalizarTraslados?: boolean;
}

function plantillaResumen(p: Plantilla) {
  let hoteles = 0;
  let tours = 0;
  let traslados = 0;
  for (const b of p.bloques) {
    if (b.tipo === "hotel") hoteles++;
    else if (b.tipo === "tour") tours++;
    else if (b.tipo === "traslado") traslados++;
  }
  const parts: string[] = [];
  if (hoteles) parts.push(`${hoteles} hotel${hoteles !== 1 ? "es" : ""}`);
  if (tours) parts.push(`${tours} tour${tours !== 1 ? "s" : ""}`);
  if (traslados) parts.push(`${traslados} traslado${traslados !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : "Sin servicios";
}

const GROUP_ORDER: ServicioSeleccionado["tipo"][] = [
  "hotel",
  "traslado",
  "vuelo",
  "tour",
  "catamaran",
];

const GROUP_TITLE: Record<ServicioSeleccionado["tipo"], string> = {
  hotel: "Alojamiento",
  traslado: "Traslados",
  vuelo: "Vuelos",
  tour: "Tours",
  catamaran: "Catamarán y Navegación",
};

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  pasajeros,
  highlightedId,
  onChange,
  onEdit,
  onAddCustom,
  onCargarPlantilla,
  onEditarPlantilla,
  observaciones = "",
  onObservacionesChange,
  personalizarTraslados = true,
}: Props) {
  const hotelesServs = servicios.filter((s) => s.tipo === "hotel");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);

  const handleOpenPlantillaModal = () => {
    setPlantillas(loadPlantillas());
    setPlantillaModalOpen(true);
  };

  const handleUsarPlantilla = (p: Plantilla) => {
    setPlantillaModalOpen(false);
    if (!onCargarPlantilla) return;
    pushReciente(p.id);
    onCargarPlantilla(p.id);
  };

  const handleEditarPlantilla = (p: Plantilla) => {
    setPlantillaModalOpen(false);
    onEditarPlantilla?.(p);
  };

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
  <>
    <Section
      icon={<ListChecks className="w-4 h-4" />}
      title="Servicios seleccionados"
      subtitle={
        servicios.length
          ? `${servicios.length} ítem${servicios.length !== 1 ? "s" : ""} en la cotización`
          : undefined
      }
      action={
        (onAddCustom || onCargarPlantilla) && (
          <div className="flex items-center gap-2">
            {onCargarPlantilla && (
              <button
                type="button"
                onClick={handleOpenPlantillaModal}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "#001851" }}
              >
                <LayoutTemplate className="w-4 h-4" />
                Plantillas
              </button>
            )}
            {onAddCustom && (
              <button
                type="button"
                onClick={onAddCustom}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 whitespace-nowrap"
                style={{ backgroundColor: "#004fbb" }}
              >
                <Plus className="w-4 h-4" />
                Ítem personalizado
              </button>
            )}
          </div>
        )
      }
    >
      {servicios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center flex flex-col items-center gap-3" style={{ backgroundColor: "#f4f7fb" }}>
          <img
            src={emptyStateImg}
            alt=""
            aria-hidden="true"
            style={{ maxWidth: 170, maxHeight: 170, width: "100%", objectFit: "contain", display: "block" }}
          />
          <div className="font-semibold text-slate-700 text-sm">
            Aún no has agregado servicios
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
                      hoteles={hotelesServs}
                      personalizarTraslados={personalizarTraslados}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <ObsPanel observaciones={observaciones} onObservacionesChange={onObservacionesChange} />
    </Section>
    <PlantillaSelectorModal
      open={plantillaModalOpen}
      plantillas={plantillas}
      tieneServicios={servicios.length > 0}
      onClose={() => setPlantillaModalOpen(false)}
      onUsar={handleUsarPlantilla}
      onEditar={handleEditarPlantilla}
      onCrearNueva={() => { setPlantillaModalOpen(false); onEditarPlantilla?.({ id: "__new__", nombre: "", bloques: [], createdAt: "", updatedAt: "" }); }}
    />
  </>
  );
}

/* ───────────────────────── ObsPanel ───────────────────────── */

const PRIORITY_IDS = [
  "precios_netos_pp",
  "sujeto_disponibilidad",
  "suplemento_sgl",
  "suplemento_vuelo_nocturno",
];

function ObsPanel({
  observaciones,
  onObservacionesChange,
}: {
  observaciones: string;
  onObservacionesChange?: (v: string) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const catalog = useMemo(() => loadObservaciones(), []);

  const bullets = useMemo(
    () => observaciones.split("\n").map((l) => l.trim()).filter(Boolean),
    [observaciones],
  );

  const addObs = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !onObservacionesChange) return;
    const next = bullets.length > 0 ? bullets.join("\n") + "\n" + trimmed : trimmed;
    onObservacionesChange(next);
  };

  const removeObs = (idx: number) => {
    if (!onObservacionesChange) return;
    onObservacionesChange(bullets.filter((_, i) => i !== idx).join("\n"));
  };

  const existingTexts = new Set(bullets.map((b) => b.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addObs(inputVal);
      setInputVal("");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    if (!onObservacionesChange) return;
    const newLines = lines.filter((l) => !existingTexts.has(l.toLowerCase()));
    if (newLines.length > 0) {
      const next = [...bullets, ...newLines].join("\n");
      onObservacionesChange(next);
    }
    setInputVal("");
  };

  const priorityObs = catalog.filter((o) => PRIORITY_IDS.includes(o.id));
  const otherObs = catalog.filter((o) => !PRIORITY_IDS.includes(o.id));

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <List className="w-3.5 h-3.5" style={{ color: "#07152f" }} />
        <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#07152f" }}>
          Observaciones
        </span>
      </div>

      {bullets.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 group">
              <span className="text-slate-400 mt-0.5 shrink-0 leading-snug">•</span>
              <span className="text-sm text-slate-700 flex-1 leading-snug">{b}</span>
              {onObservacionesChange && (
                <button
                  type="button"
                  onClick={() => removeObs(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 mt-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onObservacionesChange && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Escribir observación y presionar Enter…"
            className="flex-1 px-3 h-9 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
          <Popover open={quickOpen} onOpenChange={setQuickOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 ring-1 ring-slate-200 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                Rápidas
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-1.5 z-[60]">
              <div className="space-y-0.5">
                {priorityObs.map((o) => {
                  const already = existingTexts.has(o.texto.toLowerCase());
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={already}
                      onClick={() => {
                        addObs(o.texto);
                        setQuickOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {o.texto}
                    </button>
                  );
                })}
                {otherObs.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Otras cláusulas
                    </div>
                    {otherObs.map((o) => {
                      const already = existingTexts.has(o.texto.toLowerCase());
                      return (
                        <button
                          key={o.id}
                          type="button"
                          disabled={already}
                          onClick={() => {
                            addObs(o.texto);
                            setQuickOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {o.texto}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function iconForTipo(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return <Hotel className="w-4 h-4" />;
  if (tipo === "tour") return <MapPin className="w-4 h-4" />;
  if (tipo === "vuelo") return <Plane className="w-4 h-4" />;
  if (tipo === "catamaran") return <Ship className="w-4 h-4" />;
  return <Bus className="w-4 h-4" />;
}

function tipoColors(tipo: ServicioSeleccionado["tipo"]) {
  if (tipo === "hotel") return { bg: "bg-amber-50", text: "text-amber-600" };
  if (tipo === "tour") return { bg: "bg-emerald-50", text: "text-emerald-600" };
  if (tipo === "vuelo") return { bg: "bg-indigo-50", text: "text-indigo-600" };
  if (tipo === "catamaran") return { bg: "bg-teal-50", text: "text-teal-600" };
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
  hoteles = [],
  personalizarTraslados = true,
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
  hoteles?: ServicioSeleccionado[];
  personalizarTraslados?: boolean;
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

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(servicio.nombre);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  function startNameEdit() {
    setNameValue(servicio.nombre);
    setEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }

  function commitName() {
    if (savingRef.current) return;
    savingRef.current = true;
    const trimmed = nameValue.trim();
    if (trimmed) {
      onUpdate({ ...servicio, nombre: trimmed });
    }
    setEditingName(false);
    setTimeout(() => { savingRef.current = false; }, 0);
  }

  function cancelName() {
    setNameValue(servicio.nombre);
    setEditingName(false);
  }

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
        {formatRegimen(servicio.desayuno) && (
          <>
            {(meta || hasDates) && <span className="text-slate-300">·</span>}
            <span className="text-amber-700 font-medium">{formatRegimen(servicio.desayuno)}</span>
          </>
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
      ? personalizarNombreTraslado(
          formatTrasladoNombre(servicio.nombre),
          hoteles,
          personalizarTraslados,
        )
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
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitName(); }
              if (e.key === "Escape") { e.preventDefault(); cancelName(); }
            }}
            className="text-sm font-semibold text-slate-900 w-full bg-transparent border-b border-primary/50 focus:outline-none focus:border-primary pb-px leading-tight"
          />
        ) : (
          <div
            className="cursor-pointer flex items-center gap-1.5 group/name"
            onClick={startNameEdit}
            title="Clic para editar el nombre"
          >
            <span className="text-sm font-semibold text-slate-900 truncate">{titleLabel}</span>
            {!isHotel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = servicio.tipoServicio ?? "Regular";
                  const next = current === "Regular" ? "Privado" : "Regular";
                  onUpdate({ ...servicio, tipoServicio: next });
                }}
                title="Cambiar modalidad (Regular / Privado)"
                className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  (servicio.tipoServicio ?? "Regular") === "Privado"
                    ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                {servicio.tipoServicio ?? "Regular"}
              </button>
            )}
            <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover/name:opacity-100 flex-shrink-0 transition-opacity" />
          </div>
        )}
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
              className="w-[290px] p-3 z-[60]"
              onOpenAutoFocus={(e) => e.preventDefault()}
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
            className="w-[180px] p-0 z-[60]"
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
            className="w-[180px] p-0 z-[60]"
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

/* ───────────────────────── Shared popup button styles ──────────────────────── */

const btnApply: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "#004FBB", color: "#fff", border: "none",
  fontSize: 15, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", flexShrink: 0, transition: "opacity 0.15s",
};

const btnReset: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10,
  background: "#fff", color: "#64748B", border: "1.5px solid #D8E0EE",
  fontSize: 15, fontWeight: 500,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
};

const btnClose: React.CSSProperties = {
  background: "none", border: "none", color: "#94A3B8",
  fontSize: 13, cursor: "pointer", padding: "2px 4px",
  lineHeight: 1, borderRadius: 4,
};

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
  const origInicio = servicio.fechaInicio ?? "";
  const origFin = servicio.fechaFin ?? "";

  const handleSelect = (inicio: string, fin: string) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
  };

  const handleApply = () => {
    onSave({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    onSave({
      fechaInicio: origInicio || undefined,
      fechaFin: origFin || undefined,
    });
    onClose();
  };

  const noches = fechaInicio && fechaFin && fechaFin > fechaInicio
    ? nightsBetween(fechaInicio, fechaFin)
    : null;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Estadía
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <InlineRangePicker
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onSelect={handleSelect}
      />
      <div className="flex items-center justify-between pt-1">
        {noches !== null ? (
          <span style={{ fontSize: 11, color: "#64748B", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
            {noches} noche{noches !== 1 ? "s" : ""}
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={handleReset} style={btnReset} title="Restablecer fechas originales">↺</button>
          <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
        </div>
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

  const buildPrecios = (src: Record<string, string>) => ({
    ...servicio.precios,
    SGL: num(src.SGL),
    DBL: num(src.DBL),
    TPL: num(src.TPL),
    CHD: num(src.CHD),
    chd: num(src.CHD),
  });

  const handleApply = () => {
    onSave(buildPrecios(vals));
    onClose();
  };

  const handleReset = () => {
    onSave(buildPrecios(initial));
    onClose();
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Tarifas por noche
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      {/* Rows */}
      <div className="space-y-1.5">
        {acomodaciones.map((a) => (
          <div key={a} className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#041941", width: 28, flexShrink: 0 }}>{a}</span>
            <PriceInput
              value={vals[a] ?? "0"}
              onChange={(v) => setVals((prev) => ({ ...prev, [a]: v }))}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="flex-1"
              inputClassName="w-full h-8 pr-2.5 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        ))}
      </div>
      {/* Actions */}
      <div className="flex justify-end gap-2 pt-0.5">
        <button type="button" onClick={handleReset} style={btnReset} title="Restablecer tarifa original">↺</button>
        <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
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
    onClose();
  };

  const handleReset = () => {
    onSave(null);
    onClose();
  };

  return (
    <div className="p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Precio p/p
        </span>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <PriceInput
        value={val}
        onChange={setVal}
        onApply={handleApply}
        onCancel={onClose}
        autoFocus
        wrapperClassName="w-full"
        inputClassName="w-full h-8 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleReset} style={btnReset} title="Restablecer precio automático">↺</button>
        <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
          <StickyNote size={11} />
          Notas
        </div>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Detalles, restricciones u observaciones para el cliente..."
        rows={4}
        autoFocus
        className="w-full px-2.5 py-2 rounded-md border border-[#D8E0EE] text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleApply} style={btnApply} title="Guardar">✓</button>
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

