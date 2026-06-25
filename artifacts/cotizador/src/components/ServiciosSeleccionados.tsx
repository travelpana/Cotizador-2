import { useState, useRef, useEffect, useMemo } from "react";
import emptyStateImg from "@assets/SCR-20260531-dddl_(1)_1780213506931.png";
import { PriceInput } from "@/components/ui/price-input";
import { Section } from "./ClientForm";
import type {
  Acomodacion,
  FlightItinerary,
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
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
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
  CalendarDays,
  StickyNote,
  Ticket,
  GripVertical,
  LayoutTemplate,
  ChevronDown,
  Building2,
  List,
  X,
  Check,
  Flag,
  Copy,
  Clock,
  Camera,
  Briefcase,
} from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { loadPlantillas, pushReciente, type Plantilla } from "@/lib/plantillas";
import { loadObservaciones } from "@/lib/observaciones";
import PlantillaSelectorModal from "./PlantillaSelectorModal";

interface Props {
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  pasajeros: number;
  ninos?: number;
  highlightedId?: string | null;
  onChange: (s: ServicioSeleccionado[]) => void;
  onEdit: (s: ServicioSeleccionado) => void;
  onAddCustom?: () => void;
  onCargarPlantilla?: (id: string) => void;
  onEditarPlantilla?: (p: Plantilla) => void;
  observaciones?: string;
  onObservacionesChange?: (v: string) => void;
  personalizarTraslados?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  noches?: number;
  /** Enables hotel-option tabs in Paquete mode */
  presentationMode?: "detailed" | "package";
  opcionesPaquete?: Array<{ id: string; nombre: string }>;
  activeOpcionPaquete?: string;
  onActiveOpcionChange?: (id: string) => void;
  onAddOpcion?: () => void;
  onRenameOpcion?: (id: string, nombre: string) => void;
  onDeleteOpcion?: (id: string) => void;
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

const GROUP_TITLE: Record<string, string> = {
  hotel: "Alojamiento",
  traslado: "Traslados",
  vuelo: "Vuelos",
  tour: "Tours",
  catamaran: "Catamarán y Navegación",
  otros: "Otros",
};

/* ───────────────── Quick-add helpers ───────────────── */

type QuickTipo = "hotel" | "traslado" | "tour" | "vuelo" | "catamaran" | "otros";

const QUICK_OPTIONS: { value: QuickTipo; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "hotel",     label: "Hotelería", Icon: Hotel   },
  { value: "traslado",  label: "Traslado",  Icon: Bus     },
  { value: "tour",      label: "Tour",      Icon: MapPin  },
  { value: "vuelo",     label: "Vuelo",     Icon: Plane   },
  { value: "catamaran", label: "Catamarán", Icon: Ship    },
  { value: "otros",     label: "Otro",      Icon: Briefcase },
];

function makeQuickService(
  tipo: QuickTipo,
  fechaInicio?: string,
  fechaFin?: string,
): ServicioSeleccionado {
  const id = `MAN-${Date.now()}`;
  const internalTipo: ServicioSeleccionado["tipo"] =
    tipo === "otros" ? "tour" : (tipo as ServicioSeleccionado["tipo"]);
  const precios: ServicioSeleccionado["precios"] =
    tipo === "hotel"
      ? { SGL: 0, DBL: 0, TPL: 0, CHD: 0, chd: 0 }
      : { p1: 0, p2_5: 0, p6_10: 0, chd: 0 };
  const base: ServicioSeleccionado = {
    id, codigo: id, tipo: internalTipo, nombre: "", precios, manual: true, customTipo: tipo,
  };
  if (tipo === "hotel")
    return { ...base, ubicacion: "CIUDAD DE PANAMÁ", estrellas: "★★★", tipoHabitacion: "Standard", desayuno: "Desayuno incluido", fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined };
  if (tipo === "traslado") return { ...base, tipoServicio: "Regular" };
  if (tipo === "tour")     return { ...base, horario: "Consultar", tipoServicio: "Regular" };
  if (tipo === "vuelo")    return { ...base, origen: "Panamá", destino: "", unitOverride: 0 };
  if (tipo === "catamaran") return { ...base, tipoServicio: "Regular", fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined };
  return { ...base, unitOverride: 0 };
}

export default function ServiciosSeleccionados({
  servicios,
  acomodaciones,
  pasajeros,
  ninos = 0,
  highlightedId,
  onChange,
  onEdit,
  onAddCustom,
  onCargarPlantilla,
  onEditarPlantilla,
  observaciones = "",
  onObservacionesChange,
  personalizarTraslados = true,
  fechaInicio,
  fechaFin,
  noches,
  presentationMode,
  opcionesPaquete,
  activeOpcionPaquete,
  onActiveOpcionChange,
  onAddOpcion,
  onRenameOpcion,
  onDeleteOpcion,
}: Props) {
  const hotelesServs = servicios.filter((s) => s.tipo === "hotel");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [quickExpanded, setQuickExpanded] = useState(false);
  const [newServiceId, setNewServiceId] = useState<string | null>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quickExpanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setQuickExpanded(false); };
    const onDown = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [quickExpanded]);

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

  const duplicate = (s: ServicioSeleccionado) => {
    const copy: ServicioSeleccionado = JSON.parse(JSON.stringify(s));
    const newId = `${s.id}-dup-${Date.now()}`;
    copy.id = newId;
    copy.codigo = newId;
    copy.isDuplicate = true;
    copy.duplicatedFromId = s.id;
    const idx = servicios.findIndex((x) => x.tipo === s.tipo && x.id === s.id);
    const newList = [...servicios];
    newList.splice(idx + 1, 0, copy);
    onChange(newList);
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

  const groups: { tipo: string; items: ServicioSeleccionado[] }[] = [
    ...GROUP_ORDER.map((tipo) => ({
      tipo,
      items: tipo === "tour"
        ? servicios.filter((s) => s.tipo === tipo && s.customTipo !== "otros")
        : servicios.filter((s) => s.tipo === tipo),
    })),
    {
      tipo: "otros",
      items: servicios.filter((s) => s.customTipo === "otros"),
    },
  ].filter((g) => g.items.length > 0);

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
              <div ref={quickRef} className="relative">
                {quickExpanded ? (
                  <div
                    className="flex items-center gap-0.5 rounded-2xl border border-white/60 px-1.5 py-1 shadow-xl"
                    style={{
                      background: "rgba(255,255,255,0.86)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      boxShadow: "0 4px 24px 0 rgba(0,31,102,0.13), 0 1.5px 4px 0 rgba(0,0,0,0.07)",
                      animation: "quickExpandIn 220ms ease-out forwards",
                    }}
                  >
                    {QUICK_OPTIONS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const s = makeQuickService(value, fechaInicio, fechaFin);
                          onChange([...servicios, s]);
                          setNewServiceId(s.id);
                          setQuickExpanded(false);
                          setTimeout(() => setNewServiceId(null), 1800);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors whitespace-nowrap"
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuickExpanded(false)}
                      className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQuickExpanded(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 whitespace-nowrap"
                    style={{ backgroundColor: "#004fbb" }}
                  >
                    <Plus className="w-4 h-4" />
                    Ítem personalizado
                  </button>
                )}
              </div>
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
          {groups.map((g) => {
            const isPaqueteHotel =
              g.tipo === "hotel" &&
              presentationMode === "package" &&
              opcionesPaquete &&
              opcionesPaquete.length > 0;

            const firstOpId = opcionesPaquete?.[0]?.id;
            const displayItems = isPaqueteHotel
              ? g.items.filter((s) =>
                  s.paqueteOpcionId === activeOpcionPaquete ||
                  (activeOpcionPaquete === firstOpId && !s.paqueteOpcionId),
                )
              : g.items;

            const OPTION_COLORS      = ["#002682", "#e6ae33", "#1780c0", "#044b9e"];
            const OPTION_TEXT_COLORS = ["#002682", "#b88400", "#1780c0", "#044b9e"];
            const activeOpIdx = isPaqueteHotel
              ? Math.max(0, opcionesPaquete?.findIndex((op) => op.id === activeOpcionPaquete) ?? 0)
              : 0;
            const activeOpColor = OPTION_COLORS[activeOpIdx] ?? "#002682";

            return (
            <div key={g.tipo}>
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">
                {GROUP_TITLE[g.tipo]}
              </div>

              {isPaqueteHotel && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {opcionesPaquete!.map((op, opIdx) => {
                    const isActive = op.id === activeOpcionPaquete;
                    const isEditing = editingOpId === op.id;
                    const opColor     = OPTION_COLORS[opIdx]      ?? "#002682";
                    const opTextColor = OPTION_TEXT_COLORS[opIdx] ?? opColor;
                    return (
                      <div key={op.id} className="relative flex items-center">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) {
                                onRenameOpcion?.(op.id, editingName.trim());
                              }
                              setEditingOpId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingName.trim()) {
                                  onRenameOpcion?.(op.id, editingName.trim());
                                }
                                setEditingOpId(null);
                              } else if (e.key === "Escape") {
                                setEditingOpId(null);
                              }
                            }}
                            className="h-7 px-2 text-xs font-semibold rounded-full border-2 border-blue-500 outline-none bg-white min-w-[80px] max-w-[140px]"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => onActiveOpcionChange?.(op.id)}
                            onDoubleClick={() => {
                              setEditingOpId(op.id);
                              setEditingName(op.nombre);
                            }}
                            title="Clic para activar · Doble clic para renombrar"
                            className={`h-7 px-3 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                              isActive
                                ? "text-white shadow-sm"
                                : opIdx === 0
                                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  : ""
                            }`}
                            style={isActive
                              ? { backgroundColor: opColor }
                              : opIdx > 0
                                ? { backgroundColor: opColor + "26", color: opTextColor, border: `1px solid ${opColor}66` }
                                : undefined}
                          >
                            {op.nombre}
                          </button>
                        )}
                        {opcionesPaquete!.length > 1 && !isEditing && (
                          <button
                            type="button"
                            onClick={() => onDeleteOpcion?.(op.id)}
                            title="Eliminar esta opción"
                            className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={onAddOpcion}
                    className="h-7 px-2.5 text-xs font-semibold rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Nueva opción
                  </button>
                </div>
              )}

              <div
                className="rounded-2xl bg-slate-50/70 border border-slate-100 overflow-hidden divide-y divide-slate-100"
                style={isPaqueteHotel && activeOpIdx > 0 ? { borderLeftColor: activeOpColor + "cc", borderLeftWidth: "3px" } : undefined}
              >
                {displayItems.length === 0 && isPaqueteHotel ? (
                  <div className="px-4 py-5 text-center text-sm text-slate-400 italic">
                    Sin hotel para esta opción. Buscá y agregá uno arriba.
                  </div>
                ) : (
                  displayItems.map((s) => {
                    const rowKey = `${s.tipo}-${s.id}`;
                    const dragKey = `${s.tipo}|${s.id}`;
                    return (
                      <div
                        key={rowKey}
                        style={s.isDuplicate ? { background: "rgba(4, 25, 65, 0.035)" } : undefined}
                      >
                        <ServicioRow
                          servicio={s}
                          acomodaciones={acomodaciones}
                          pasajeros={pasajeros}
                          ninos={ninos}
                          highlight={highlightedId === s.id}
                          autoFocus={newServiceId === s.id}
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
                          onDuplicate={() => duplicate(s)}
                          onUpdate={update}
                          hoteles={hotelesServs}
                          personalizarTraslados={personalizarTraslados}
                          fechaInicio={fechaInicio}
                          noches={noches}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            );
          })}
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
  ninos = 0,
  highlight,
  autoFocus = false,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onRemove,
  onDuplicate,
  onUpdate,
  hoteles = [],
  personalizarTraslados = true,
  fechaInicio,
  noches,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  pasajeros: number;
  ninos?: number;
  highlight?: boolean;
  autoFocus?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdate: (s: ServicioSeleccionado) => void;
  hoteles?: ServicioSeleccionado[];
  personalizarTraslados?: boolean;
  fechaInicio?: string;
  noches?: number;
}) {
  const isHotel = servicio.tipo === "hotel";
  const isCatamaranItem = servicio.tipo === "catamaran";
  const paxLocal = servicio.paxOverride ?? pasajeros;
  const autoTier = pickTier(paxLocal);
  const appliedTier = servicio.tarifaOverride ?? autoTier;
  const unit =
    typeof servicio.unitOverride === "number"
      ? servicio.unitOverride
      : priceForTier(servicio.precios, appliedTier);
  const colors = tipoColors(servicio.tipo);

  const [openEditor, setOpenEditor] = useState<
    "dates" | "price" | "notes" | "tickets" | "ubicacion" | "estrellas" | "fecha-itinerario" | "images" | "tipohab" | "regimen" | "duracion" | "modalidad" | "origen" | "destino" | "tipovuelo" | "fechavuelo" | "fechavuelo-vuelta" | null
  >(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingHorario, setEditingHorario] = useState(false);
  const [horarioEditValue, setHorarioEditValue] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(servicio.nombre);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const dragHandleActive = useRef(false);
  const [iconHovered, setIconHovered] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const current = servicio.images ?? [];
    const slots = 3 - current.length;
    if (slots <= 0) return;
    const toProcess = Array.from(files).slice(0, slots);
    const compressed = await Promise.all(toProcess.map((f) => compressImage(f, 1024, 0.82)));
    onUpdate({ ...servicio, images: [...current, ...compressed] });
  }

  function startNameEdit() {
    setNameValue(servicio.nombre);
    setEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  }

  useEffect(() => {
    if (autoFocus) startNameEdit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const fi = servicio.fechaItinerario;
    const fiLabel = fi
      ? fi.startsWith("dia-")
        ? `Día ${fi.slice(4)}`
        : fmtDMA(fi)
      : null;
    if (parts.length || fiLabel) {
      descripcion = (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          {parts.length > 0 && <span>{parts.join(" · ")}</span>}
          {fiLabel && (
            <span
              className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full"
              style={{ fontSize: 10, background: "rgba(0,79,187,0.10)", color: "#004FBB" }}
            >
              <CalendarDays className="w-2.5 h-2.5" />
              {fiLabel}
            </span>
          )}
        </span>
      );
    }
  }

  const titleLabel =
    servicio.tipo === "traslado"
      ? personalizarNombreTraslado(
          formatTrasladoNombre(servicio.nombre),
          hoteles,
          personalizarTraslados,
        )
      : servicio.tipo === "vuelo"
        ? buildVueloNombre(servicio.origen, servicio.destino, servicio.tipoVuelo) ?? servicio.nombre
        : servicio.nombre;

  const namePlaceholder = (() => {
    const t = servicio.customTipo ?? servicio.tipo;
    if (t === "hotel") return "Nombre del hotel";
    if (t === "tour") return "Nombre del tour";
    if (t === "vuelo") return "Nombre del vuelo (opcional)";
    if (t === "catamaran") return "Nombre del catamarán";
    if (t === "traslado") return "Nombre del traslado";
    return "Nombre del servicio";
  })();

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
        if (!dragHandleActive.current) {
          e.preventDefault();
          return;
        }
        dragHandleActive.current = false;
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        dragHandleActive.current = false;
        onDragEnd();
      }}
      className={rowClasses}
    >
      {/* Drag handle — only draggable from here */}
      <div
        className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
        onMouseDown={() => { dragHandleActive.current = true; }}
        onMouseUp={() => { dragHandleActive.current = false; }}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Type icon — hover shows camera, click manages images */}
      <Popover
        open={openEditor === "images"}
        onOpenChange={(o) => {
          if (o && (servicio.images?.length ?? 0) === 0) {
            imageInputRef.current?.click();
            return;
          }
          setOpenEditor(o ? "images" : null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onMouseEnter={() => setIconHovered(true)}
            onMouseLeave={() => setIconHovered(false)}
            title="Agregar imágenes"
            className={`w-8 h-8 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0 cursor-pointer transition-opacity hover:opacity-75`}
          >
            {iconHovered || openEditor === "images"
              ? <Camera className="w-4 h-4" />
              : servicio.customTipo === "otros"
                ? <Briefcase className="w-4 h-4" />
                : iconForTipo(servicio.tipo)}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="p-0 w-60 z-[60]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Imágenes del servicio
              </span>
              <span className="text-[10px] text-slate-400">
                {(servicio.images?.length ?? 0)}/3
              </span>
            </div>
            {(servicio.images?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(servicio.images ?? []).map((img, i) => (
                  <div key={i} className="relative group/img">
                    <img
                      src={img}
                      alt=""
                      className="w-[74px] h-[52px] object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (servicio.images ?? []).filter((_, j) => j !== i);
                        onUpdate({ ...servicio, images: updated.length > 0 ? updated : undefined });
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      title="Eliminar imagen"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(servicio.images?.length ?? 0) < 3 ? (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-[12px] font-medium"
              >
                <Camera className="w-3.5 h-3.5" />
                {(servicio.images?.length ?? 0) === 0 ? "Agregar imágenes" : "Agregar más"}
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-1">
                Máximo 3 imágenes por servicio
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleImageFiles(e.target.files).then(() => {
            if ((servicio.images?.length ?? 0) === 0) setOpenEditor("images");
          });
          e.target.value = "";
        }}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {servicio.tipo === "vuelo" ? (
          /* Vuelo: origen → destino selectors ARE the header — no text input */
          <div className="flex items-center gap-1.5 flex-wrap">
            <Popover
              open={openEditor === "origen"}
              onOpenChange={(o) => setOpenEditor(o ? "origen" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-800 hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                  style={{ background: "#f5f7fb" }}
                  title="Cambiar origen"
                >
                  {servicio.origen || <span className="italic text-slate-400 font-normal text-xs">Origen</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[220px] p-2 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.origen ?? ""}
                  options={CIUDADES_VUELO_LIST}
                  placeholder="Ciudad de origen"
                  onSave={(v) => {
                    const newOrigen = v.trim() || undefined;
                    const newNombre = buildVueloNombre(newOrigen, servicio.destino, servicio.tipoVuelo) ?? servicio.nombre;
                    onUpdate({ ...servicio, origen: newOrigen, nombre: newNombre });
                    setOpenEditor(null);
                  }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-400 font-semibold text-sm select-none">→</span>

            <Popover
              open={openEditor === "destino"}
              onOpenChange={(o) => setOpenEditor(o ? "destino" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-800 hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                  style={{ background: "#f5f7fb" }}
                  title="Cambiar destino"
                >
                  {servicio.destino || <span className="italic text-slate-400 font-normal text-xs">Destino</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[220px] p-2 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.destino ?? ""}
                  options={CIUDADES_VUELO_LIST}
                  placeholder="Ciudad de destino"
                  onSave={(v) => {
                    const newDestino = v.trim() || undefined;
                    const newNombre = buildVueloNombre(servicio.origen, newDestino, servicio.tipoVuelo) ?? servicio.nombre;
                    onUpdate({ ...servicio, destino: newDestino, nombre: newNombre });
                    setOpenEditor(null);
                  }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            {servicio.isDuplicate && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", borderRadius: 999, padding: "1px 8px", flexShrink: 0, letterSpacing: "0.03em" }}>
                COPIA
              </span>
            )}
          </div>
        ) : editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitName(); }
              if (e.key === "Escape") { e.preventDefault(); cancelName(); }
            }}
            placeholder={servicio.manual ? namePlaceholder : undefined}
            className={`text-sm font-semibold text-slate-900 w-full leading-tight focus:outline-none ${
              servicio.manual
                ? "px-2 py-1 rounded-lg border border-slate-200 focus:border-primary placeholder:font-normal placeholder:text-slate-400"
                : "bg-transparent border-b border-primary/50 focus:border-primary pb-px"
            }`}
            style={servicio.manual ? { background: "#f5f7fb" } : undefined}
          />
        ) : (
          <div
            className="flex items-center gap-1.5 group/name cursor-text"
            onClick={startNameEdit}
            title="Clic para editar el nombre"
          >
            {servicio.manual ? (
              <span
                className={`text-sm font-semibold truncate px-2 py-1 rounded-lg border border-slate-200 ${
                  titleLabel ? "text-slate-900" : "text-slate-400 italic font-normal"
                }`}
                style={{ background: "#f5f7fb" }}
              >
                {titleLabel || namePlaceholder}
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-900 truncate">{titleLabel}</span>
            )}
            {servicio.isDuplicate && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#dbeafe",
                color: "#1e40af",
                borderRadius: 999,
                padding: "1px 8px",
                flexShrink: 0,
                letterSpacing: "0.03em",
              }}>
                COPIA
              </span>
            )}
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
        {/* Description / meta */}
        {isHotel ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Ubicación */}
            <Popover
              open={openEditor === "ubicacion"}
              onOpenChange={(o) => setOpenEditor(o ? "ubicacion" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar ubicación"
                >
                  {servicio.ubicacion ?? <span className="italic text-slate-400">Ubicación</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[210px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <UbicacionEditor
                  current={servicio.ubicacion ?? ""}
                  onSave={(v) => { onUpdate({ ...servicio, ubicacion: v }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Categoría / Estrellas */}
            <Popover
              open={openEditor === "estrellas"}
              onOpenChange={(o) => setOpenEditor(o ? "estrellas" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-amber-500 hover:text-amber-600 hover:bg-amber-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar categoría"
                >
                  {servicio.estrellas ?? <span className="text-slate-400 italic">★ Cat.</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[160px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <EstrellasEditor
                  current={servicio.estrellas ?? ""}
                  onSave={(v) => { onUpdate({ ...servicio, estrellas: v }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Fechas */}
            <Popover
              open={openEditor === "dates"}
              onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                  title="Editar fechas de estadía"
                >
                  {servicio.fechaInicio && servicio.fechaFin ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                      <Calendar className="w-3 h-3" />
                      {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">Fechas</span>
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

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Tipo de habitación */}
            <Popover
              open={openEditor === "tipohab"}
              onOpenChange={(o) => setOpenEditor(o ? "tipohab" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar tipo de habitación"
                >
                  {servicio.tipoHabitacion ?? <span className="italic text-slate-400">Tipo hab.</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[220px] p-2 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.tipoHabitacion ?? ""}
                  options={TIPOS_HAB_LIST}
                  placeholder="Tipo de habitación"
                  onSave={(v) => { onUpdate({ ...servicio, tipoHabitacion: v || undefined }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Régimen */}
            <Popover
              open={openEditor === "regimen"}
              onOpenChange={(o) => setOpenEditor(o ? "regimen" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-amber-700 font-medium hover:bg-amber-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Cambiar régimen"
                >
                  {formatRegimen(servicio.desayuno) || <span className="italic text-slate-400 font-normal">Régimen</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[240px] p-2 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.desayuno ?? ""}
                  options={REGIMENES_LIST}
                  placeholder="Régimen / alimentación"
                  onSave={(v) => { onUpdate({ ...servicio, desayuno: v || undefined }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : isCatamaranItem ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Fechas estadía catamarán */}
            <Popover
              open={openEditor === "dates"}
              onOpenChange={(o) => setOpenEditor(o ? "dates" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                  title="Editar fechas de estadía"
                >
                  {servicio.fechaInicio && servicio.fechaFin ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                      <Calendar className="w-3 h-3" />
                      {fmtDMA(servicio.fechaInicio)} → {fmtDMA(servicio.fechaFin)}
                      <span className="ml-0.5 text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
                        {nightsBetween(servicio.fechaInicio, servicio.fechaFin)}n
                      </span>
                    </span>
                  ) : (
                    <span className="italic text-slate-400">
                      <Calendar className="w-3 h-3 inline mr-0.5" />
                      Fechas estadía
                    </span>
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
            {/* Modalidad (editable) */}
            <span className="text-slate-300 text-[11px] select-none">·</span>
            <Popover
              open={openEditor === "modalidad"}
              onOpenChange={(o) => setOpenEditor(o ? "modalidad" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-indigo-600 font-medium hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Modalidad"
                >
                  {servicio.tipoServicio || <span className="italic text-slate-400 font-normal">Modalidad</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[160px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.tipoServicio ?? ""}
                  options={MODALIDAD_LIST}
                  allowFree={false}
                  onSave={(v) => { onUpdate({ ...servicio, tipoServicio: (v || undefined) as ServicioSeleccionado["tipoServicio"] }); setOpenEditor(null); }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>
            {/* Horario (editable) */}
            <span className="text-slate-300 text-[11px] select-none">·</span>
            {editingHorario ? (
              <input
                type="text"
                value={horarioEditValue}
                onChange={(e) => setHorarioEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); onUpdate({ ...servicio, horario: horarioEditValue.trim() || undefined }); setEditingHorario(false); }
                  if (e.key === "Escape") { e.preventDefault(); setEditingHorario(false); }
                }}
                onBlur={() => { onUpdate({ ...servicio, horario: horarioEditValue.trim() || undefined }); setEditingHorario(false); }}
                autoFocus
                placeholder="Horario"
                className="text-[11px] text-slate-600 bg-slate-50 border-b border-slate-400 outline-none px-0.5"
                style={{ minWidth: 80, maxWidth: 220 }}
              />
            ) : (
              <span
                className="text-[11px] text-slate-500 px-0.5 rounded hover:bg-slate-100 transition-colors cursor-text"
                title="Editar horario"
                onClick={() => { setHorarioEditValue(servicio.horario ?? ""); setEditingHorario(true); }}
              >
                {servicio.horario || <span className="italic text-slate-400">Horario</span>}
              </span>
            )}
          </div>
        ) : servicio.tipo === "vuelo" ? (
          <div className="flex items-center gap-0.5 flex-wrap mt-0.5">
            {/* Tipo de vuelo */}
            <Popover
              open={openEditor === "tipovuelo"}
              onOpenChange={(o) => setOpenEditor(o ? "tipovuelo" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] text-indigo-600 font-medium hover:bg-indigo-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
                  title="Tipo de vuelo"
                >
                  {servicio.tipoVuelo || <span className="italic text-slate-400 font-normal">Tipo de vuelo</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[180px] p-1 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <InlineComboEditor
                  current={servicio.tipoVuelo ?? ""}
                  options={TIPO_VUELO_LIST}
                  allowFree={false}
                  onSave={(v) => {
                    const newTipo = (v || undefined) as ServicioSeleccionado["tipoVuelo"];
                    const newNombre = buildVueloNombre(servicio.origen, servicio.destino, newTipo) ?? servicio.nombre;
                    onUpdate({ ...servicio, tipoVuelo: newTipo, nombre: newNombre });
                    setOpenEditor(null);
                  }}
                  onClose={() => setOpenEditor(null)}
                />
              </PopoverContent>
            </Popover>

            <span className="text-slate-300 text-[11px] select-none">·</span>

            {/* Fecha ida */}
            <Popover
              open={openEditor === "fechavuelo"}
              onOpenChange={(o) => setOpenEditor(o ? "fechavuelo" : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                  title={servicio.tipoVuelo === "Ida y vuelta" ? "Fecha de ida" : "Fecha del vuelo"}
                >
                  {servicio.usarFecha && servicio.fecha ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                      <Calendar className="w-3 h-3" />
                      {servicio.tipoVuelo === "Ida y vuelta" ? <span className="text-[10px] font-normal text-slate-500">Ida:</span> : null}
                      {fmtDMA(servicio.fecha)}
                    </span>
                  ) : (
                    <span className="italic text-slate-400">{servicio.tipoVuelo === "Ida y vuelta" ? "Fecha ida" : "Fecha"}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="p-3 pb-1 border-b border-slate-100">
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {servicio.tipoVuelo === "Ida y vuelta" ? "Fecha de ida" : "Fecha del vuelo"}
                  </span>
                </div>
                <CalendarPicker
                  mode="single"
                  selected={servicio.fecha ? (() => { const [y,m,d] = servicio.fecha!.split("-").map(Number); return new Date(y,m-1,d); })() : undefined}
                  onSelect={(day) => {
                    if (!day) { onUpdate({ ...servicio, fecha: undefined, usarFecha: false }); return; }
                    const iso = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
                    onUpdate({ ...servicio, fecha: iso, usarFecha: true });
                    setOpenEditor(null);
                  }}
                  captionLayout="dropdown"
                  className="[--cell-size:1.85rem] text-[12px]"
                />
                <div className="flex justify-between px-3 pb-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { onUpdate({ ...servicio, fecha: undefined, usarFecha: false }); setOpenEditor(null); }}
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Quitar fecha
                  </button>
                  <button type="button" onClick={() => setOpenEditor(null)} className="text-[11px] font-semibold text-primary">
                    Listo
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Fecha vuelta — only for "Ida y vuelta" */}
            {servicio.tipoVuelo === "Ida y vuelta" && (
              <Popover
                open={openEditor === "fechavuelo-vuelta"}
                onOpenChange={(o) => setOpenEditor(o ? "fechavuelo-vuelta" : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] hover:text-primary hover:bg-primary/5 px-1 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Fecha de vuelta"
                  >
                    {servicio.fechaVuelta ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-normal text-slate-500">Vuelta:</span>
                        {fmtDMA(servicio.fechaVuelta)}
                      </span>
                    ) : (
                      <span className="italic text-slate-400">Fecha vuelta</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="p-3 pb-1 border-b border-slate-100">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Fecha de vuelta
                    </span>
                  </div>
                  <CalendarPicker
                    mode="single"
                    selected={servicio.fechaVuelta ? (() => { const [y,m,d] = servicio.fechaVuelta!.split("-").map(Number); return new Date(y,m-1,d); })() : undefined}
                    onSelect={(day) => {
                      if (!day) { onUpdate({ ...servicio, fechaVuelta: undefined }); return; }
                      const iso = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
                      onUpdate({ ...servicio, fechaVuelta: iso });
                      setOpenEditor(null);
                    }}
                    captionLayout="dropdown"
                    className="[--cell-size:1.85rem] text-[12px]"
                  />
                  <div className="flex justify-between px-3 pb-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { onUpdate({ ...servicio, fechaVuelta: undefined }); setOpenEditor(null); }}
                      className="text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      Quitar fecha
                    </button>
                    <button type="button" onClick={() => setOpenEditor(null)} className="text-[11px] font-semibold text-primary">
                      Listo
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        ) : descripcion ? (
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {descripcion}
          </div>
        ) : null}

        {/* Notes list (multi-note system) */}
        {(servicio.notasList && servicio.notasList.length > 0) ? (
          <div className="mt-0.5 space-y-0.5">
            {[...(servicio.notasList)]
              .map((n, origIdx) => ({ n, origIdx }))
              .sort(({ n: a }, { n: b }) => {
                const aImp = (a.type === "important" || a.important === true) ? 0 : 1;
                const bImp = (b.type === "important" || b.important === true) ? 0 : 1;
                return aImp - bImp;
              })
              .map(({ n, origIdx }) => (
              <NoteItem
                key={n.id ?? origIdx}
                note={n}
                onEdit={(newText) => {
                  const now = new Date().toISOString();
                  const updated = (servicio.notasList ?? []).map((x, xi) =>
                    (x.id && n.id ? x.id === n.id : xi === origIdx)
                      ? { ...x, text: newText, updatedAt: now }
                      : x
                  );
                  onUpdate({ ...servicio, notasList: updated });
                }}
                onDelete={() => {
                  const updated = (servicio.notasList ?? []).filter((x, xi) =>
                    x.id && n.id ? x.id !== n.id : xi !== origIdx
                  );
                  onUpdate({ ...servicio, notasList: updated });
                }}
              />
            ))}
          </div>
        ) : servicio.notas ? (
          <div
            className="text-[11px] truncate mt-0.5 italic"
            style={{ color: servicio.notesImportant ? "#ef7b15" : "#92400e" }}
          >
            "{servicio.notas}"
          </div>
        ) : null}

        {/* Image indicator */}
        {(servicio.images?.length ?? 0) > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Camera className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400">
              {servicio.images!.length} imagen{servicio.images!.length !== 1 ? "es" : ""}
            </span>
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

        {/* Tour/Otros horario (editable inline) */}
        {servicio.tipo === "tour" && (
          <div className="mt-1 flex items-center gap-2 min-w-0 flex-wrap">
            <span className="inline-flex items-center min-w-0">
              <span className="text-[11px] text-slate-500 flex-shrink-0 mr-0.5">Horario:&nbsp;</span>
              {editingHorario ? (
                <input
                  type="text"
                  value={horarioEditValue}
                  onChange={(e) => setHorarioEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); onUpdate({ ...servicio, horario: horarioEditValue.trim() || undefined }); setEditingHorario(false); }
                    if (e.key === "Escape") { e.preventDefault(); setEditingHorario(false); }
                  }}
                  onBlur={() => { onUpdate({ ...servicio, horario: horarioEditValue.trim() || undefined }); setEditingHorario(false); }}
                  autoFocus
                  placeholder="Horario"
                  className="text-[11px] text-slate-600 bg-slate-50 border-b border-slate-400 outline-none px-0.5 min-w-0"
                />
              ) : (
                <span
                  className="text-[11px] text-slate-500 truncate hover:bg-slate-100 rounded px-0.5 -mx-0.5 cursor-text transition-colors"
                  title="Editar horario"
                  onClick={() => { setHorarioEditValue(servicio.horario ?? ""); setEditingHorario(true); }}
                >
                  {servicio.horario || <span className="italic text-slate-400">Agregar horario</span>}
                </span>
              )}
            </span>
            <span className="text-slate-300 text-[11px] select-none">·</span>
            <span className="inline-flex items-center min-w-0">
              <span className="text-[11px] text-slate-500 flex-shrink-0 mr-0.5">Duración:&nbsp;</span>
              <Popover
                open={openEditor === "duracion"}
                onOpenChange={(o) => setOpenEditor(o ? "duracion" : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-[11px] text-slate-500 truncate hover:bg-slate-100 rounded px-0.5 -mx-0.5 cursor-pointer transition-colors"
                    title="Editar duración"
                  >
                    {servicio.duracion || <span className="italic text-slate-400">Agregar duración</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[220px] p-2 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <InlineComboEditor
                    current={servicio.duracion ?? ""}
                    options={DURACION_LIST}
                    placeholder="Duración"
                    onSave={(v) => { onUpdate({ ...servicio, duracion: v || undefined }); setOpenEditor(null); }}
                    onClose={() => setOpenEditor(null)}
                  />
                </PopoverContent>
              </Popover>
            </span>
          </div>
        )}

        {/* Vuelo: structured flight itinerary display */}
        {servicio.tipo === "vuelo" && servicio.flightItinerary && (
          (servicio.flightItinerary.idaSchedules?.length > 0 || servicio.flightItinerary.vueltaSchedules?.length > 0)
        ) && (() => {
          const fi = servicio.flightItinerary!;
          const tv = servicio.tipoVuelo;
          const showIda = tv !== "Retorno" && (fi.idaSchedules?.length ?? 0) > 0;
          const showVuelta = tv !== "Ida" && (fi.vueltaSchedules?.length ?? 0) > 0;
          const cols = showIda && showVuelta ? 2 : 1;
          return (
            <div className={`mt-1.5 grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {showIda && (
                <div>
                  <div className="text-[10px] font-bold mb-0.5" style={{ color: "#1351c1" }}>IDA</div>
                  {fi.idaRuta && <div className="text-[10px] text-slate-500 font-semibold">{fi.idaRuta}</div>}
                  {fi.idaSchedules.map((sc, i) => (
                    <div key={i} className="text-[11px] text-slate-500">{sc}</div>
                  ))}
                </div>
              )}
              {showVuelta && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-0.5">VUELTA</div>
                  {fi.vueltaRuta && <div className="text-[10px] text-slate-500 font-semibold">{fi.vueltaRuta}</div>}
                  {fi.vueltaSchedules.map((sc, i) => (
                    <div key={i} className="text-[11px] text-slate-500">{sc}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {/* Vuelo: legacy free-text schedules */}
        {servicio.tipo === "vuelo" && !servicio.flightItinerary && (servicio.flightSchedules ?? []).filter(Boolean).length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {(servicio.flightSchedules ?? []).filter(Boolean).map((sc, i) => (
              <div key={i} className="text-[11px] text-slate-500 flex items-center gap-1">
                <Plane className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span>{sc}</span>
              </div>
            ))}
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
                <div key={a} className="text-center" style={{ minWidth: 64 }}>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {fmt(servicio.precios[a] ?? 0)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400" style={{ lineHeight: 1.2 }}>
                    {a}
                  </div>
                  <div className="text-slate-400" style={{ fontSize: 10, lineHeight: 1.2, whiteSpace: "normal" }}>
                    Pax/Noche
                  </div>
                </div>
              ))}
              {ninos > 0 && (servicio.precios.CHD ?? 0) > 0 && (
                <div className="text-center" style={{ minWidth: 64 }}>
                  <div className="text-sm font-bold tabular-nums" style={{ color: "#92400e" }}>
                    {fmt(servicio.precios.CHD ?? 0)}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#b45309", lineHeight: 1.2 }}>
                    CHD
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.2, color: "#b45309", whiteSpace: "normal" }}>
                    Pax/Noche
                  </div>
                </div>
              )}
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
              ninos={ninos}
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
                {isCatamaranItem && (servicio.fechaInicio || servicio.fechaFin) ? "p/noche" : "p/p"}
              </div>
              {ninos > 0 && (servicio.precios.chd ?? 0) > 0 && (
                <>
                  <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: "#92400e" }}>
                    {fmt(servicio.precios.chd ?? 0)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide" style={{ color: "#b45309" }}>
                    niño p/p
                  </div>
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[180px] p-0 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <UnitPriceEditor
              currentUnit={unit}
              currentChd={servicio.precios.chd ?? 0}
              showChd={ninos > 0}
              onSave={(val, chd) => {
                onUpdate({
                  ...servicio,
                  unitOverride: val ?? undefined,
                  precios: { ...servicio.precios, chd },
                });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Action icons — all service types */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
        {/* Duplicar */}
        <button
          type="button"
          onClick={onDuplicate}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Duplicar servicio"
          title="Duplicar servicio"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* 📅 Fecha del itinerario — todos los tipos */}
        {(
          <Popover
            open={openEditor === "fecha-itinerario"}
            onOpenChange={(o) => setOpenEditor(o ? "fecha-itinerario" : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`p-1.5 rounded-lg transition-colors ${
                  servicio.fechaItinerario
                    ? "opacity-100"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
                style={
                  servicio.fechaItinerario
                    ? { color: "#004FBB", backgroundColor: "rgba(0,79,187,0.08)" }
                    : {}
                }
                aria-label="Asignar día en itinerario"
                title={
                  servicio.fechaItinerario
                    ? "Cambiar día en el itinerario"
                    : "Asignar día en el itinerario"
                }
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className={`${servicio.tipo === "vuelo" ? "w-[480px]" : "w-[260px]"} p-3 z-[60]`}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <FechaItinerarioEditor
                value={servicio.fechaItinerario}
                valueVuelta={servicio.fechaItinerarioVuelta}
                fechaInicio={fechaInicio}
                noches={noches}
                isVuelo={servicio.tipo === "vuelo"}
                tipoVuelo={servicio.tipoVuelo}
                flightItinerary={servicio.flightItinerary}
                vueloOrigen={servicio.origen}
                vueloDestino={servicio.destino}
                onSave={(v) => {
                  onUpdate({ ...servicio, fechaItinerario: v });
                  setOpenEditor(null);
                }}
                onSaveVuelta={(v) => {
                  onUpdate({ ...servicio, fechaItinerarioVuelta: v });
                  setOpenEditor(null);
                }}
                onSaveFlightItinerary={(fi) => {
                  onUpdate({ ...servicio, flightItinerary: fi });
                  setOpenEditor(null);
                }}
                onClear={() => {
                  onUpdate({ ...servicio, fechaItinerario: undefined, fechaItinerarioVuelta: undefined });
                  setOpenEditor(null);
                }}
                onClose={() => setOpenEditor(null)}
              />
            </PopoverContent>
          </Popover>
        )}

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

        {/* 📝 Nota (normal o importante) */}
        <Popover
          open={openEditor === "notes"}
          onOpenChange={(o) => setOpenEditor(o ? "notes" : null)}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`p-1.5 rounded-lg transition-colors opacity-100`}
              style={(() => {
                const hasImp = (servicio.notasList ?? []).some(n => n.type === "important" || n.important === true) || (servicio.notas && servicio.notesImportant);
                const hasNormal = (servicio.notasList ?? []).some(n => n.type !== "important" && !n.important) || (servicio.notas && !servicio.notesImportant);
                if (hasImp) return { color: "#ef7b15", backgroundColor: "#fff3eb" };
                if (hasNormal) return { color: "#d97706", backgroundColor: "#fffbeb" };
                return { color: "#64748b" };
              })()}
              aria-label="Agregar nota"
              title="Agregar nota"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[290px] p-3 z-[60]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <NoteEditor
              onSave={(lines, tipoFinal) => {
                const now = new Date().toISOString();
                const prev = servicio.notasList ?? [];
                const newNotes = lines.map((text, idx) => ({
                  id: `note-${Date.now()}-${idx}`,
                  type: tipoFinal,
                  text,
                  important: tipoFinal === "important",
                  createdAt: now,
                }));
                onUpdate({ ...servicio, notasList: [...prev, ...newNotes] });
                setOpenEditor(null);
              }}
              onClose={() => setOpenEditor(null)}
            />
          </PopoverContent>
        </Popover>

        <Popover open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Quitar"
              title="Quitar servicio"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[210px] p-3 z-[60]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <p className="text-[12px] font-semibold text-slate-800 mb-3">¿Eliminar este servicio?</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); onRemove(); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </PopoverContent>
        </Popover>
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

/* ─── FechaItinerarioEditor ──────────────────────────────────────────────── */

const FI_CLR_PRIMARY = "#004FBB";
const FI_CLR_TEXT    = "#041941";

const AIRPORT_CODES: Record<string, string> = {
  "Panamá": "PAN",
  "Bocas del Toro": "BOC",
  "San Blas": "SBS",
};
const cityCode = (city: string) => AIRPORT_CODES[city] ?? city;

type FlightSlot = { sal: string; lle: string };
const parseSlot = (s: string): FlightSlot => {
  const parts = s.split(" - ");
  return { sal: (parts[0] ?? "").trim(), lle: (parts[1] ?? "").trim() };
};

function FechaItinerarioEditor({
  value,
  valueVuelta,
  fechaInicio,
  noches,
  onSave,
  onSaveVuelta,
  onClear,
  onClose,
  isVuelo,
  tipoVuelo,
  flightItinerary,
  vueloOrigen,
  vueloDestino,
  onSaveFlightItinerary,
}: {
  value?: string;
  valueVuelta?: string;
  fechaInicio?: string;
  noches?: number;
  onSave: (v: string) => void;
  onSaveVuelta?: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
  isVuelo?: boolean;
  tipoVuelo?: ServicioSeleccionado["tipoVuelo"];
  flightItinerary?: FlightItinerary;
  vueloOrigen?: string;
  vueloDestino?: string;
  onSaveFlightItinerary?: (fi: FlightItinerary | undefined) => void;
}) {
  const totalDias = Math.max(1, (noches ?? 0) + 1);
  const [mode, setMode] = useState<"dia" | "vuelo">(() => {
    if (isVuelo && (flightItinerary?.idaSchedules?.length || flightItinerary?.vueltaSchedules?.length)) {
      return "vuelo";
    }
    return "dia";
  });

  // Vuelo itinerary state
  const [idaRuta, setIdaRuta] = useState(() =>
    flightItinerary?.idaRuta ?? (vueloOrigen && vueloDestino
      ? `${cityCode(vueloOrigen)} → ${cityCode(vueloDestino)}`
      : "")
  );
  const [vueltaRuta, setVueltaRuta] = useState(() =>
    flightItinerary?.vueltaRuta ?? (vueloOrigen && vueloDestino
      ? `${cityCode(vueloDestino)} → ${cityCode(vueloOrigen)}`
      : "")
  );
  const emptySlot = (): FlightSlot => ({ sal: "", lle: "" });
  const [idaSlots, setIdaSlots] = useState<FlightSlot[]>(() => {
    const base = (flightItinerary?.idaSchedules ?? []).map(parseSlot);
    return [...base, emptySlot(), emptySlot(), emptySlot(), emptySlot()].slice(0, 4);
  });
  const [vueltaSlots, setVueltaSlots] = useState<FlightSlot[]>(() => {
    const base = (flightItinerary?.vueltaSchedules ?? []).map(parseSlot);
    return [...base, emptySlot(), emptySlot(), emptySlot(), emptySlot()].slice(0, 4);
  });

  function dayDate(idx: number): string {
    if (!fechaInicio) return "";
    const base = new Date(`${fechaInicio}T00:00:00`);
    base.setDate(base.getDate() + idx);
    const d = base.getDate();
    const m = base.getMonth();
    const MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${MES[m]}`;
  }

  const saveVuelo = () => {
    const idaSched = idaSlots.filter(s => s.sal || s.lle).map(s => `${s.sal} - ${s.lle}`);
    const vueltaSched = vueltaSlots.filter(s => s.sal || s.lle).map(s => `${s.sal} - ${s.lle}`);
    if (idaSched.length === 0 && vueltaSched.length === 0) {
      onSaveFlightItinerary?.(undefined);
    } else {
      onSaveFlightItinerary?.({
        idaRuta: idaRuta.trim() || undefined,
        vueltaRuta: vueltaRuta.trim() || undefined,
        idaSchedules: idaSched,
        vueltaSchedules: vueltaSched,
      });
    }
  };

  const routeSt: React.CSSProperties = {
    width: "100%", fontSize: 10, fontWeight: 600, color: "#475569",
    border: "1px solid #e2e8f0", borderRadius: 6,
    padding: "3px 6px", marginBottom: 5,
    boxSizing: "border-box", outline: "none",
  };
  const timeSt: React.CSSProperties = {
    flex: 1, fontSize: 11, color: "#334155",
    border: "1px solid #e2e8f0", borderRadius: 5,
    padding: "3px 5px", background: "#fff",
    outline: "none", minWidth: 0, textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ userSelect:"none" }}>
      {/* Header */}
      <div style={{ marginBottom:10, fontSize:11, fontWeight:700, color: FI_CLR_TEXT, letterSpacing:"0.02em" }}>
        Asignar al itinerario
      </div>

      {/* Mode toggle — only for vuelo */}
      {isVuelo && (
        <div style={{ display:"flex", gap:3, marginBottom:10, background:"#f1f5f9", borderRadius:8, padding:3 }}>
          {([["dia","Día del viaje"],["vuelo","Itinerario de vuelos"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex:1, padding:"4px 0", borderRadius:6, fontSize:10, fontWeight:600,
                border:"none", cursor:"pointer", transition:"all 0.15s",
                background: mode===m ? "#fff" : "transparent",
                color: mode===m ? FI_CLR_PRIMARY : "#64748b",
                boxShadow: mode===m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "dia" ? (
        <>
          {/* For "Ida y vuelta": show two labeled sections — IDA and VUELTA */}
          {tipoVuelo === "Ida y vuelta" ? (
            <>
              {(["ida", "vuelta"] as const).map((leg) => {
                const isIda = leg === "ida";
                const legValue = isIda ? value : valueVuelta;
                const legSave = isIda ? onSave : onSaveVuelta;
                const legLabel = isIda ? "IDA" : "VUELTA";
                const legColor = isIda ? FI_CLR_PRIMARY : "#64748b";
                return (
                  <div key={leg} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize:10, fontWeight:800, color: legColor, letterSpacing:"0.06em", marginBottom:5 }}>
                      {legLabel}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:4 }}>
                      {Array.from({ length: totalDias }, (_, i) => {
                        const diaKey = `dia-${i+1}`;
                        const isSelected = legValue === diaKey;
                        const dateStr = dayDate(i);
                        return (
                          <button
                            key={diaKey}
                            type="button"
                            onClick={() => legSave?.(diaKey)}
                            style={{
                              padding:"5px 4px", borderRadius:7, fontSize:10, fontWeight:600,
                              border: isSelected ? `1.5px solid ${legColor}` : "1.5px solid #e2e8f0",
                              background: isSelected ? `rgba(0,79,187,0.08)` : "#fff",
                              color: isSelected ? legColor : FI_CLR_TEXT,
                              cursor:"pointer", textAlign:"center", lineHeight:1.3, transition:"all 0.1s",
                            }}
                          >
                            <div>Día {i+1}</div>
                            {dateStr && <div style={{ fontSize:8, fontWeight:400, opacity:0.7, marginTop:1 }}>{dateStr}</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:4 }}>
              {Array.from({ length: totalDias }, (_, i) => {
                const diaKey = `dia-${i+1}`;
                const isSelected = value === diaKey;
                const dateStr = dayDate(i);
                return (
                  <button
                    key={diaKey}
                    type="button"
                    onClick={() => onSave(diaKey)}
                    style={{
                      padding:"6px 4px", borderRadius:8, fontSize:11, fontWeight:600,
                      border: isSelected ? `1.5px solid ${FI_CLR_PRIMARY}` : "1.5px solid #e2e8f0",
                      background: isSelected ? `rgba(0,79,187,0.10)` : "#fff",
                      color: isSelected ? FI_CLR_PRIMARY : FI_CLR_TEXT,
                      cursor:"pointer", textAlign:"center", lineHeight:1.3, transition:"all 0.1s",
                    }}
                  >
                    <div>Día {i+1}</div>
                    {dateStr && <div style={{ fontSize:9, fontWeight:400, opacity:0.7, marginTop:2 }}>{dateStr}</div>}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            {(value || valueVuelta) ? (
              <button type="button" onClick={onClear} style={{ fontSize:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
                Quitar fecha
              </button>
            ) : <div />}
            <button type="button" onClick={onClose} style={{ fontSize:10, color:"#64748b", background:"none", border:"none", cursor:"pointer" }}>
              Cerrar
            </button>
          </div>
        </>
      ) : (
        /* Itinerario de vuelos */
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, minWidth:0 }}>
            {/* IDA */}
            <div style={{ minWidth:0, overflow:"hidden" }}>
              <div style={{ fontSize:11, fontWeight:800, color: FI_CLR_PRIMARY, marginBottom:4, letterSpacing:"0.04em" }}>IDA</div>
              <input
                type="text"
                value={idaRuta}
                onChange={(e) => setIdaRuta(e.target.value)}
                placeholder="PAN → BOC"
                style={routeSt}
              />
              {idaSlots.map((slot, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}>
                  <input
                    type="text"
                    value={slot.sal}
                    onChange={e => setIdaSlots(prev => prev.map((s, j) => j === i ? { ...s, sal: e.target.value } : s))}
                    placeholder="09:45"
                    maxLength={5}
                    style={timeSt}
                  />
                  <span style={{ fontSize:9, color:"#94a3b8", flexShrink:0 }}>-</span>
                  <input
                    type="text"
                    value={slot.lle}
                    onChange={e => setIdaSlots(prev => prev.map((s, j) => j === i ? { ...s, lle: e.target.value } : s))}
                    placeholder="10:45"
                    maxLength={5}
                    style={timeSt}
                  />
                </div>
              ))}
            </div>
            {/* VUELTA */}
            <div style={{ minWidth:0, overflow:"hidden" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#64748b", marginBottom:4, letterSpacing:"0.04em" }}>VUELTA</div>
              <input
                type="text"
                value={vueltaRuta}
                onChange={(e) => setVueltaRuta(e.target.value)}
                placeholder="BOC → PAN"
                style={routeSt}
              />
              {vueltaSlots.map((slot, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}>
                  <input
                    type="text"
                    value={slot.sal}
                    onChange={e => setVueltaSlots(prev => prev.map((s, j) => j === i ? { ...s, sal: e.target.value } : s))}
                    placeholder="12:35"
                    maxLength={5}
                    style={timeSt}
                  />
                  <span style={{ fontSize:9, color:"#94a3b8", flexShrink:0 }}>-</span>
                  <input
                    type="text"
                    value={slot.lle}
                    onChange={e => setVueltaSlots(prev => prev.map((s, j) => j === i ? { ...s, lle: e.target.value } : s))}
                    placeholder="13:25"
                    maxLength={5}
                    style={timeSt}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button type="button" onClick={() => onSaveFlightItinerary?.(undefined)} style={{ fontSize:10, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>
              Quitar itinerario
            </button>
            <button type="button" onClick={saveVuelo} style={{ fontSize:11, fontWeight:700, color:"#fff", background: FI_CLR_PRIMARY, border:"none", borderRadius:6, padding:"5px 12px", cursor:"pointer" }}>
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const UBICACIONES_LIST = [
  "BOCAS DEL TORO",
  "CHIRIQUÍ",
  "CIUDAD DE PANAMÁ",
  "COCLÉ (RIVIERA PACÍFICA)",
  "COLÓN",
  "CONTADORA",
  "SAN BLAS",
  "TABOGA",
  "VERAGUAS / SANTIAGO",
];

const ESTRELLAS_LIST = ["★★★", "★★★★", "★★★★★"];

const TIPOS_HAB_LIST = ["Standard", "Superior", "Deluxe", "Suite", "Junior Suite", "Vista Jardín", "Vista Mar", "Bungalow"];
const REGIMENES_LIST = ["Solo alojamiento", "Desayuno continental incluido", "Desayuno buffet incluido", "Media pensión", "Alimentación completa incluida", "Todo incluido"];
const DURACION_LIST = ["Medio día", "Día completo", "2 horas", "3 horas", "4 horas", "5 horas"];
const CIUDADES_VUELO_LIST = ["Panamá", "Bocas del Toro", "San Blas", "David", "Pedasí", "Chitré", "Colón", "Contadora"];
const TIPO_VUELO_LIST: Array<NonNullable<ServicioSeleccionado["tipoVuelo"]>> = ["Ida", "Retorno", "Ida y vuelta"];

/** Auto-build the vuelo title from origin/destination/type */
function buildVueloNombre(
  origen?: string,
  destino?: string,
  tipoVuelo?: ServicioSeleccionado["tipoVuelo"],
): string | undefined {
  if (!origen || !destino) return undefined;
  if (tipoVuelo === "Retorno") return `${destino} → ${origen}`;
  if (tipoVuelo === "Ida y vuelta") return `${origen} → ${destino} → ${origen}`;
  return `${origen} → ${destino}`;
}
const MODALIDAD_LIST: Array<NonNullable<ServicioSeleccionado["tipoServicio"]>> = ["Regular", "Privado"];

/* Reusable inline combo editor: free-text input + clickable suggestions */
function InlineComboEditor({
  current,
  options,
  placeholder,
  allowFree = true,
  onSave,
  onClose,
}: {
  current: string;
  options: readonly string[];
  placeholder?: string;
  allowFree?: boolean;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current ?? "");
  return (
    <div className="space-y-2">
      {allowFree && (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={val}
            placeholder={placeholder}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onSave(val.trim()); }
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-primary"
          />
          <button type="button" onClick={() => onSave(val.trim())} style={btnApply} title="Aplicar">✓</button>
        </div>
      )}
      <div className="py-0.5 max-h-56 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSave(o)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] rounded-lg hover:bg-primary/5 hover:text-primary transition-colors ${
              current === o ? "text-primary font-semibold" : "text-slate-700"
            }`}
          >
            {current === o && <Check className="w-3 h-3 flex-shrink-0" />}
            <span className={current === o ? "" : "ml-[15px]"}>{o}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UbicacionEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="py-0.5 max-h-64 overflow-y-auto">
      {UBICACIONES_LIST.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onSave(u)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] rounded-lg hover:bg-primary/5 hover:text-primary transition-colors ${
            current === u ? "text-primary font-semibold" : "text-slate-700"
          }`}
        >
          {current === u && <Check className="w-3 h-3 flex-shrink-0" />}
          <span className={current === u ? "" : "ml-[15px]"}>{u}</span>
        </button>
      ))}
    </div>
  );
}

function EstrellasEditor({
  current,
  onSave,
  onClose,
}: {
  current: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="py-0.5">
      {ESTRELLAS_LIST.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSave(s)}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors ${
            current === s ? "text-amber-600 font-semibold" : "text-slate-700"
          }`}
        >
          {current === s && <Check className="w-3 h-3 flex-shrink-0 text-amber-500" />}
          <span className={current === s ? "" : "ml-[15px]"}>{s}</span>
        </button>
      ))}
    </div>
  );
}

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
    const changed = fechaInicio !== origInicio || fechaFin !== origFin;
    onSave({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      ...(changed ? { fechasManual: true } : {}),
    });
    onClose();
  };

  const handleReset = () => {
    onSave({
      fechaInicio: origInicio || undefined,
      fechaFin: origFin || undefined,
      fechasManual: false,
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
  ninos,
  onSave,
  onClose,
}: {
  servicio: ServicioSeleccionado;
  acomodaciones: Acomodacion[];
  ninos: number;
  onSave: (precios: ServicioSeleccionado["precios"]) => void;
  onClose: () => void;
}) {
  const initial: Record<string, string> = {
    SGL: String(servicio.precios.SGL ?? 0),
    DBL: String(servicio.precios.DBL ?? 0),
    TPL: String(servicio.precios.TPL ?? 0),
    QDL: String(servicio.precios.QDL ?? servicio.precios.TPL ?? 0),
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
    QDL: num(src.QDL),
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
        {ninos > 0 && !acomodaciones.includes("CHD" as Acomodacion) && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", width: 28, flexShrink: 0 }}>CHD</span>
            <PriceInput
              value={vals.CHD ?? "0"}
              onChange={(v) => setVals((prev) => ({ ...prev, CHD: v }))}
              onApply={handleApply}
              onCancel={onClose}
              wrapperClassName="flex-1"
              inputClassName="w-full h-8 pr-2.5 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        )}
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
  currentChd,
  showChd,
  onSave,
  onClose,
}: {
  currentUnit: number;
  currentChd: number;
  showChd: boolean;
  onSave: (val: number | null, chd: number) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState<string>(String(currentUnit));
  const [chdVal, setChdVal] = useState<string>(String(currentChd));

  const numChd = () => {
    const c = parseFloat(chdVal);
    return isNaN(c) ? 0 : c;
  };

  const handleApply = () => {
    const n = parseFloat(val);
    onSave(isNaN(n) ? null : n, numChd());
    onClose();
  };

  const handleReset = () => {
    onSave(null, numChd());
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
      {showChd && (
        <div className="space-y-1.5">
          <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Niño p/p (CHD)
          </span>
          <PriceInput
            value={chdVal}
            onChange={setChdVal}
            onApply={handleApply}
            onCancel={onClose}
            wrapperClassName="w-full"
            inputClassName="w-full h-8 pr-2.5 rounded-md border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={handleReset} style={btnReset} title="Restablecer precio automático">↺</button>
        <button type="button" onClick={handleApply} style={btnApply} title="Aplicar">✓</button>
      </div>
    </div>
  );
}

/* ───────────────── NoteItem — individual note row with edit/delete ─────── */

function NoteItem({
  note,
  onEdit,
  onDelete,
}: {
  note: { id?: string; type?: "normal" | "important"; text: string; important?: boolean };
  onEdit: (newText: string) => void;
  onDelete: () => void;
}) {
  const imp = note.type === "important" || note.important === true;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="group/note flex items-start gap-1.5 min-w-0">
      {imp ? (
        <div
          className="flex-shrink-0 self-stretch rounded-sm"
          style={{ width: 2, backgroundColor: "#EF7B15", minHeight: 14 }}
        />
      ) : (
        <span className="text-slate-400 flex-shrink-0 text-[10px] leading-[1.6]">•</span>
      )}
      <span
        className="text-[11px] leading-snug flex-1 min-w-0 break-words"
        style={{ color: imp ? "#ef7b15" : "#475569", fontWeight: imp ? 600 : 400 }}
      >
        {note.text}
      </span>
      <div className="opacity-0 group-hover/note:opacity-100 flex gap-0.5 flex-shrink-0 ml-1 transition-opacity">
        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
              title="Editar nota"
            >
              <Pencil className="w-2.5 h-2.5 text-slate-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[260px] p-3 z-[70]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <NoteEditor
              tipo={imp ? "important" : "normal"}
              initialText={note.text}
              onSave={(lines, _t) => {
                onEdit(lines[0] ?? "");
                setEditOpen(false);
              }}
              onClose={() => setEditOpen(false)}
            />
          </PopoverContent>
        </Popover>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-red-100 transition-colors"
          title="Eliminar nota"
          onClick={onDelete}
        >
          <Trash2 className="w-2.5 h-2.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── NoteEditor — add or edit a single note ─────────────── */

function NoteEditor({
  tipo: tipoProp,
  initialText = "",
  onSave,
  onClose,
}: {
  tipo?: "normal" | "important";
  initialText?: string;
  onSave: (lines: string[], tipo: "normal" | "important") => void;
  onClose: () => void;
}) {
  const isEdit = initialText.length > 0;
  const fixedTipo = tipoProp !== undefined;
  const [tipo, setTipo] = useState<"normal" | "important">(tipoProp ?? "normal");
  const [text, setText] = useState(initialText);

  const handleApply = () => {
    const lines = text
      .split("\n")
      .map((l) => (tipo === "important" ? l.trim().toUpperCase() : l.trim()))
      .filter(Boolean);
    if (lines.length === 0) { onClose(); return; }
    onSave(lines, tipo);
    onClose();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 11, fontWeight: 700, color: tipo === "important" ? "#ef7b15" : "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
          {tipo === "important" ? <Flag size={11} /> : <StickyNote size={11} />}
          {isEdit
            ? (tipo === "important" ? "Editar importante" : "Editar nota")
            : (tipo === "important" ? "Nota importante" : "Agregar nota")
          }
        </div>
        <button type="button" onClick={onClose} style={btnClose} title="Cerrar">✕</button>
      </div>

      {/* Tipo toggle — only shown when adding new notes (not in edit mode) */}
      {!fixedTipo && !isEdit && (
        <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 2 }}>
          {(["normal", "important"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              style={{
                flex: 1, padding: "4px 0", borderRadius: 6, fontSize: 10, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: tipo === t ? "#fff" : "transparent",
                color: tipo === t ? (t === "important" ? "#ef7b15" : "#004FBB") : "#64748b",
                boxShadow: tipo === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {t === "important" ? <Flag size={9} /> : <StickyNote size={9} />}
              {t === "important" ? "Importante" : "Normal"}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tipo === "important" ? "Texto de la nota importante..." : "Detalles, restricciones u observaciones..."}
        rows={2}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleApply();
          }
        }}
        className={`w-full px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 resize-none ${
          tipo === "important"
            ? "placeholder:text-orange-300 focus:ring-orange-400"
            : "placeholder:text-slate-300 focus:ring-blue-500"
        }`}
        style={
          tipo === "important"
            ? { borderRadius: 14, border: "1px solid #EF7B15", color: "#ef7b15", fontWeight: 600, backgroundColor: "rgba(239,123,21,0.04)" }
            : { borderRadius: 14, border: "1px solid #D8E0EE", color: "#1e293b", backgroundColor: "#FFFFFF" }
        }
      />
      <p className="text-[10px] text-slate-400 -mt-0.5">
        {isEdit
          ? "Enter para guardar · Shift+Enter nueva línea"
          : "Enter para guardar · Shift+Enter nueva línea · varias líneas = varias notas"
        }
      </p>
      <div className="flex justify-end">
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

