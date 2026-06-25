import { useEffect, useMemo, useRef, useState } from "react";
import { compressImage } from "@/lib/image-utils";
import { PriceInput } from "@/components/ui/price-input";
import InlineRangePicker, { nightsBetween } from "./InlineRangePicker";
import {
  X,
  Check,
  ChevronDown,
  Plane,
  Hotel,
  Bus,
  MapPin,
  Ship,
  Briefcase,
  Tag,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import type { Acomodacion, ServicioSeleccionado } from "@/lib/types";

type CustomTipo = "hotel" | "traslado" | "tour" | "vuelo" | "catamaran" | "otros";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (s: ServicioSeleccionado) => void;
  globalFechaInicio?: string;
  globalFechaFin?: string;
  globalNinos?: number;
  initial?: ServicioSeleccionado | null;
}

const TIPO_OPTIONS: { value: CustomTipo; label: string }[] = [
  { value: "hotel", label: "Hotelería" },
  { value: "traslado", label: "Traslado" },
  { value: "tour", label: "Tours" },
  { value: "vuelo", label: "Vuelos" },
  { value: "catamaran", label: "Catamarán" },
  { value: "otros", label: "Otros" },
];

const MODALIDAD_OPTIONS: { value: "Regular" | "Privado"; label: string }[] = [
  { value: "Regular", label: "Regular" },
  { value: "Privado", label: "Privado" },
];

const ALL_ACOM: Acomodacion[] = ["SGL", "DBL", "TPL", "CHD"];

const CIUDADES_VUELO = ["Panamá", "Bocas del Toro", "San Blas"] as const;

const UBICACIONES = [
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

const CATEGORIAS = [
  { value: "★★★", label: "★★★" },
  { value: "★★★★", label: "★★★★" },
  { value: "★★★★★", label: "★★★★★" },
];

const C = "#1351c1";          // brand primary (RGE blue)
const C2 = "#3b82f6";         // brand secondary (blue)

const lbl =
  "block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider";
const inputCls =
  "w-full h-8 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 bg-white focus:outline-none focus:ring-2 placeholder:text-slate-300"
  + ` focus:ring-[${C}]/20 focus:border-[${C}]`;

const BADGE_COLOR: Record<CustomTipo, string> = {
  hotel: "Hotelería",
  traslado: "Traslados",
  tour: "Tours",
  vuelo: "Aéreos",
  catamaran: "Catamarán",
  otros: "Otros",
};

const TIPO_VUELO_OPTS: { value: NonNullable<ServicioSeleccionado["tipoVuelo"]>; label: string }[] = [
  { value: "Ida", label: "Ida" },
  { value: "Retorno", label: "Retorno" },
  { value: "Ida y vuelta", label: "Ida y vuelta" },
];

const TIPO_ICON: Record<CustomTipo, React.ReactNode> = {
  hotel: <Hotel className="w-4 h-4" />,
  traslado: <Bus className="w-4 h-4" />,
  tour: <MapPin className="w-4 h-4" />,
  vuelo: <Plane className="w-4 h-4" />,
  catamaran: <Ship className="w-4 h-4" />,
  otros: <Briefcase className="w-4 h-4" />,
};

const TIPO_TITLE: Record<CustomTipo, string> = {
  hotel: "Hotelería personalizada",
  traslado: "Traslado personalizado",
  tour: "Tour personalizado",
  vuelo: "Vuelo personalizado",
  catamaran: "Catamarán personalizado",
  otros: "Ítem personalizado",
};

const TIPO_SUBTITLE: Record<CustomTipo, string> = {
  hotel: "Agrega un hotel que no está en el tarifario",
  traslado: "Agrega un traslado que no está en el tarifario",
  tour: "Agrega un tour que no está en el tarifario",
  vuelo: "Selecciona origen y destino del vuelo",
  catamaran: "Agrega un servicio de catamarán",
  otros: "Agrega un servicio que no está en el tarifario",
};

interface CustomSelectProps<T extends string> {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[13px] bg-white focus:outline-none flex items-center justify-between gap-2 transition-colors hover:border-slate-300"
        style={{ color: value ? "#0f172a" : "#94a3b8" }}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-slate-800 hover:bg-slate-50 transition-colors text-left"
            >
              <span>{o.label}</span>
              {value === o.value && (
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: C }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PriceRowProps {
  label: string;
  labelNino?: string;
  precio: string;
  setPrecio: (v: string) => void;
  precioNino: string;
  setPrecioNino: (v: string) => void;
  ninosEnabled: boolean;
  showNino?: boolean;
  hintText?: string;
}

function PriceRow({
  label,
  labelNino = "Precio niño (USD)",
  precio,
  setPrecio,
  precioNino,
  setPrecioNino,
  ninosEnabled,
  showNino = true,
  hintText,
}: PriceRowProps) {
  return (
    <>
      <div className={showNino ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label className={lbl}>{label}</label>
          <PriceInput
            value={precio}
            onChange={setPrecio}
            placeholder="0"
            wrapperClassName="w-full"
            inputClassName="w-full h-8 pr-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 bg-white focus:outline-none focus:ring-2 placeholder:text-slate-300 tabular-nums"
          />
        </div>
        {showNino && (
          <div>
            <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider transition-colors ${ninosEnabled ? "text-slate-400" : "text-slate-300"}`}>
              {labelNino}
            </label>
            <PriceInput
              value={precioNino}
              onChange={setPrecioNino}
              placeholder="0"
              disabled={!ninosEnabled}
              wrapperClassName="w-full"
              inputClassName={`w-full h-8 pr-3 rounded-lg border text-[13px] bg-white focus:outline-none focus:ring-2 placeholder:text-slate-300 tabular-nums transition-all duration-200 ${
                ninosEnabled ? "border-slate-200 text-slate-900" : "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
              }`}
            />
          </div>
        )}
      </div>
      {hintText && <p className="text-[10px] text-slate-400 mt-0.5">{hintText}</p>}
    </>
  );
}

export default function CustomItemModal({
  open,
  onClose,
  onSave,
  globalFechaInicio,
  globalFechaFin,
  globalNinos = 0,
  initial,
}: Props) {
  const isEdit = !!initial;

  const [tipo, setTipo] = useState<CustomTipo>("hotel");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [precioNino, setPrecioNino] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [notesImportant, setNotesImportant] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [origen, setOrigen] = useState<string>(CIUDADES_VUELO[0]);
  const [destino, setDestino] = useState<string>(CIUDADES_VUELO[1]);
  const [tipoVuelo, setTipoVuelo] = useState<ServicioSeleccionado["tipoVuelo"] | "">("");
  const [fechaVuelo, setFechaVuelo] = useState("");

  const [ubicacion, setUbicacion] = useState("");
  const [estrellas, setEstrellas] = useState("");
  const [tipoHabitacion, setTipoHabitacion] = useState("");
  const [desayuno, setDesayuno] = useState("");

  const [ruta, setRuta] = useState("");
  const [modalidad, setModalidad] = useState<"Regular" | "Privado">("Regular");
  const [horarioCustom, setHorarioCustom] = useState("");
  const [duracion, setDuracion] = useState("");
  const [entradasDesc, setEntradasDesc] = useState("");
  const [fechaInicioCat, setFechaInicioCat] = useState("");
  const [fechaFinCat, setFechaFinCat] = useState("");

  const nombreRef = useRef<HTMLInputElement>(null);
  const ninosEnabled = globalNinos > 0;

  useEffect(() => {
    if (open) {
      if (initial) {
        const rawTipo = initial.customTipo as CustomTipo | undefined;
        const initTipo: CustomTipo =
          rawTipo ??
          (initial.tipo === "vuelo"
            ? "vuelo"
            : initial.tipo === "hotel"
              ? "hotel"
              : initial.tipo === "tour"
                ? "tour"
                : initial.tipo === "catamaran"
                  ? "catamaran"
                  : "traslado");
        setTipo(initTipo);
        setNombre(initial.nombre.replace(/^\[Vuelo\]\s*/, ""));
        const initPrecio =
          typeof initial.unitOverride === "number"
            ? initial.unitOverride
            : initial.precios.p1 ??
              initial.precios.p2_5 ??
              initial.precios.p6_10 ??
              initial.precios.SGL ??
              initial.precios.DBL ??
              0;
        setPrecio(initPrecio ? String(initPrecio) : "");
        const initChd = initial.precios.chd;
        setPrecioNino(
          typeof initChd === "number" && initChd !== initPrecio && initChd > 0
            ? String(initChd)
            : "",
        );
        setNotas(initial.notas ?? "");
        setNotesImportant(initial.notesImportant ?? false);
        setImages(initial.images ?? []);
        setOrigen(initial.origen ?? CIUDADES_VUELO[0]);
        setDestino(initial.destino ?? CIUDADES_VUELO[1]);
        setTipoVuelo(initial.tipoVuelo ?? "");
        setFechaVuelo(initial.fecha ?? "");
        setUbicacion(initial.ubicacion ?? "");
        setEstrellas(initial.estrellas ?? "");
        setTipoHabitacion(initial.tipoHabitacion ?? "");
        setDesayuno(initial.desayuno ?? "");
        setRuta(initial.ruta ?? "");
        setModalidad((initial.tipoServicio as "Regular" | "Privado") ?? "Regular");
        setHorarioCustom(initial.horario ?? "");
        setDuracion(initial.duracion ?? "");
        setEntradasDesc(initial.entradasDesc ?? "");
        setFechaInicioCat(initial.fechaInicio ?? "");
        setFechaFinCat(initial.fechaFin ?? "");
      } else {
        setTipo("hotel");
        setNombre("");
        setPrecio("");
        setPrecioNino("");
        setNotas("");
        setNotesImportant(false);
        setImages([]);
        setOrigen(CIUDADES_VUELO[0]);
        setDestino(CIUDADES_VUELO[1]);
        setTipoVuelo("");
        setFechaVuelo("");
        setUbicacion("");
        setEstrellas("");
        setTipoHabitacion("");
        setDesayuno("");
        setRuta("");
        setModalidad("Regular");
        setHorarioCustom("");
        setDuracion("");
        setEntradasDesc("");
        setFechaInicioCat("");
        setFechaFinCat("");
      }
      window.setTimeout(() => nombreRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open || isEdit || tipo !== "hotel") return;
    setUbicacion((v) => v || "CIUDAD DE PANAMÁ");
    setEstrellas((v) => v || "★★★");
    setTipoHabitacion((v) => v || "Standard");
    setDesayuno((v) => v || "Desayuno incluido");
  }, [tipo, open, isEdit]);

  useEffect(() => {
    if (!ninosEnabled && precioNino !== "") {
      setPrecioNino("");
    }
  }, [ninosEnabled, precioNino]);

  const isVuelo = tipo === "vuelo";
  const isHotel = tipo === "hotel";
  const isTraslado = tipo === "traslado";
  const isTour = tipo === "tour";
  const isCatamaran = tipo === "catamaran";
  const isOtros = tipo === "otros";

  const vueloNombre = useMemo(
    () => `${origen} → ${destino}`,
    [origen, destino],
  );

  if (!open) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();

    let displayName: string;
    if (isVuelo) {
      if (!origen || !destino) return;
      displayName = vueloNombre;
    } else {
      const trimmed = nombre.trim();
      if (!trimmed) {
        nombreRef.current?.focus();
        return;
      }
      displayName = trimmed;
    }

    const value = Number(precio) || 0;
    const ninoRaw = precioNino.trim();
    const chdValue = ninosEnabled && ninoRaw !== "" ? Number(ninoRaw) || 0 : value;
    const baseId = initial?.id ?? `MAN-${Date.now()}`;

    const internalTipo: ServicioSeleccionado["tipo"] =
      tipo === "hotel"
        ? "hotel"
        : tipo === "tour"
          ? "tour"
          : tipo === "vuelo"
            ? "vuelo"
            : tipo === "catamaran"
              ? "catamaran"
              : tipo === "otros"
                ? "tour"
                : "traslado";

    const precios: ServicioSeleccionado["precios"] =
      tipo === "hotel"
        ? Object.fromEntries(ALL_ACOM.map((a) => [a, value]))
        : { p1: value, p2_5: value, p6_10: value, chd: chdValue };

    const servicio: ServicioSeleccionado = {
      id: baseId,
      codigo: baseId,
      tipo: internalTipo,
      nombre: displayName,
      precios,
      manual: true,
      customTipo: tipo,
      notas: notas.trim() || undefined,
      notesImportant: notesImportant && !!notas.trim() ? true : undefined,
      images: images.length > 0 ? images : undefined,
      ...(isHotel
        ? {
            fechaInicio: globalFechaInicio || undefined,
            fechaFin: globalFechaFin || undefined,
            ubicacion: ubicacion || undefined,
            estrellas: estrellas || undefined,
            tipoHabitacion: tipoHabitacion || undefined,
            desayuno: desayuno || undefined,
          }
        : {}),
      ...(isVuelo
        ? {
            origen, destino, unitOverride: value,
            tipoVuelo: tipoVuelo || undefined,
            tipoServicio: modalidad,
            fecha: fechaVuelo || undefined,
          }
        : {}),
      ...(isOtros
        ? {
            unitOverride: value, tipoServicio: modalidad,
            horario: horarioCustom.trim() || undefined,
            duracion: duracion.trim() || undefined,
          }
        : {}),
      ...(isTraslado
        ? { ruta: ruta.trim() || undefined, tipoServicio: modalidad }
        : {}),
      ...(isTour
        ? {
            tipoServicio: modalidad,
            horario: horarioCustom.trim() || undefined,
            duracion: duracion.trim() || undefined,
            entradasDesc: entradasDesc.trim() || undefined,
          }
        : {}),
      ...(isCatamaran
        ? {
            tipoServicio: modalidad,
            horario: horarioCustom.trim() || undefined,
            fechaInicio: fechaInicioCat || undefined,
            fechaFin: fechaFinCat || undefined,
          }
        : {}),
    };

    onSave(servicio);
    onClose();
  };

  const ciudadOptions = CIUDADES_VUELO.map((c) => ({ value: c, label: c }));
  const ubicacionOptions = UBICACIONES.map((u) => ({ value: u, label: u }));

  const SectionLabel = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex items-center gap-1.5 mb-2">
      <span style={{ color: C2 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{text}</span>
      <div className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
  );

  const MAX_NOTAS = 280;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh", boxShadow: "0 24px 64px rgba(19,81,193,0.18), 0 4px 16px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <header
          className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg, #f0f5ff 0%, #fff 60%)" }}
        >
          {/* Icon + title */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${C}18`, color: C }}
          >
            {TIPO_ICON[tipo]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                {isEdit
                  ? `Editar ${TIPO_OPTIONS.find((o) => o.value === tipo)?.label.toLowerCase() ?? "ítem"}`
                  : TIPO_TITLE[tipo]}
              </h2>
              {/* Category badge */}
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${C}15`, color: C, letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                {BADGE_COLOR[tipo]}
              </span>
            </div>
          </div>
          {/* Tipo switcher — compact chips */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {TIPO_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                title={o.label}
                onClick={() => setTipo(o.value as CustomTipo)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={
                  tipo === o.value
                    ? { background: C, color: "#fff" }
                    : { background: "transparent", color: "#94a3b8" }
                }
              >
                {TIPO_ICON[o.value as CustomTipo]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100 flex-shrink-0 ml-1"
            style={{ color: "#94a3b8" }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ minHeight: 0 }}>

          {/* ── INFORMACIÓN PRINCIPAL ── */}
          <div>
            <SectionLabel icon={<Sparkles size={10} />} text="Información principal" />
            <div className="space-y-3">

              {/* ── VUELO ── */}
              {isVuelo && (
                <>
                  {/* Inline origin → destination */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className={lbl}>Origen</label>
                      <CustomSelect value={origen} onChange={setOrigen} options={ciudadOptions} placeholder="Origen" />
                    </div>
                    <div className="flex-shrink-0 pb-1.5">
                      <Plane className="w-4 h-4" style={{ color: C }} />
                    </div>
                    <div className="flex-1">
                      <label className={lbl}>Destino</label>
                      <CustomSelect value={destino} onChange={setDestino} options={ciudadOptions} placeholder="Destino" />
                    </div>
                  </div>
                  {/* Route preview chip */}
                  {origen && destino && (
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: `${C}08`, border: `1px solid ${C}25` }}>
                      <Plane className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C }} />
                      <span className="text-[12px] font-semibold text-slate-800">{vueloNombre}</span>
                    </div>
                  )}
                  {/* Secondary fields */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={lbl}>Tipo de vuelo</label>
                      <CustomSelect
                        value={tipoVuelo ?? ""}
                        onChange={(v) => setTipoVuelo((v || undefined) as ServicioSeleccionado["tipoVuelo"])}
                        options={TIPO_VUELO_OPTS}
                        placeholder="Tipo"
                      />
                    </div>
                    <div>
                      <label className={lbl}>Modalidad</label>
                      <CustomSelect value={modalidad} onChange={(v) => setModalidad(v as "Regular" | "Privado")} options={MODALIDAD_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Fecha</label>
                      <input
                        type="date"
                        value={fechaVuelo}
                        onChange={(e) => setFechaVuelo(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── HOTEL ── */}
              {isHotel && (
                <>
                  <div>
                    <label className={lbl}>Nombre del hotel</label>
                    <input ref={nombreRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Hotel Hilton Garden Inn" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className={lbl}>Ubicación</label>
                      <CustomSelect value={ubicacion} onChange={setUbicacion} options={ubicacionOptions} placeholder="— Seleccionar —" />
                    </div>
                    <div>
                      <label className={lbl}>Estrellas</label>
                      <CustomSelect value={estrellas} onChange={setEstrellas} options={CATEGORIAS} placeholder="—" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Tipo habitación</label>
                      <input list="cim-tipos-hab" value={tipoHabitacion} onChange={(e) => setTipoHabitacion(e.target.value)}
                        placeholder="Standard, Suite..." className={inputCls} />
                      <datalist id="cim-tipos-hab">
                        <option value="Standard" /><option value="Deluxe" /><option value="Suite" />
                        <option value="Junior Suite" /><option value="Vista Jardín" /><option value="Vista Mar" />
                      </datalist>
                    </div>
                    <div>
                      <label className={lbl}>Régimen</label>
                      <input list="cim-regimenes" value={desayuno} onChange={(e) => setDesayuno(e.target.value)}
                        placeholder="Desayuno incluido" className={inputCls} />
                      <datalist id="cim-regimenes">
                        <option value="Solo alojamiento" /><option value="Desayuno continental incluido" />
                        <option value="Desayuno buffet incluido" /><option value="Alimentación completa incluida" />
                        <option value="Todo incluido" />
                      </datalist>
                    </div>
                  </div>
                </>
              )}

              {/* ── TRASLADO ── */}
              {isTraslado && (
                <>
                  <div>
                    <label className={lbl}>Nombre / descripción</label>
                    <input ref={nombreRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Traslado aeropuerto - hotel" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Ruta / trayecto</label>
                      <input type="text" value={ruta} onChange={(e) => setRuta(e.target.value)}
                        placeholder="Ej: Tocumen → Ciudad" className={inputCls} />
                    </div>
                    <div>
                      <label className={lbl}>Modalidad</label>
                      <CustomSelect value={modalidad} onChange={(v) => setModalidad(v as "Regular" | "Privado")} options={MODALIDAD_OPTIONS} />
                    </div>
                  </div>
                </>
              )}

              {/* ── TOUR ── */}
              {isTour && (
                <>
                  <div>
                    <label className={lbl}>Nombre del tour</label>
                    <input ref={nombreRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Tour en lancha por San Blas" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={lbl}>Modalidad</label>
                      <CustomSelect value={modalidad} onChange={(v) => setModalidad(v as "Regular" | "Privado")} options={MODALIDAD_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Horario</label>
                      <input type="text" value={horarioCustom} onChange={(e) => setHorarioCustom(e.target.value)}
                        placeholder="8:00 AM" className={inputCls} />
                    </div>
                    <div>
                      <label className={lbl}>Duración</label>
                      <input type="text" value={duracion} onChange={(e) => setDuracion(e.target.value)}
                        placeholder="8 horas" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Entradas / incluye (si aplica)</label>
                    <input type="text" value={entradasDesc} onChange={(e) => setEntradasDesc(e.target.value)}
                      placeholder="Ej: Entrada al parque nacional incluida" className={inputCls} />
                  </div>
                </>
              )}

              {/* ── CATAMARÁN ── */}
              {isCatamaran && (
                <>
                  <div>
                    <label className={lbl}>Nombre del servicio</label>
                    <input ref={nombreRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Catamarán a Taboga" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Modalidad</label>
                      <CustomSelect value={modalidad} onChange={(v) => setModalidad(v as "Regular" | "Privado")} options={MODALIDAD_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Horario</label>
                      <input type="text" value={horarioCustom} onChange={(e) => setHorarioCustom(e.target.value)}
                        placeholder="7:30 AM" className={inputCls} />
                    </div>
                  </div>
                </>
              )}

              {/* ── OTROS ── */}
              {isOtros && (
                <>
                  <div>
                    <label className={lbl}>Nombre del servicio</label>
                    <input ref={nombreRef} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Cena especial en restaurante" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={lbl}>Modalidad</label>
                      <CustomSelect value={modalidad} onChange={(v) => setModalidad(v as "Regular" | "Privado")} options={MODALIDAD_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Horario</label>
                      <input type="text" value={horarioCustom} onChange={(e) => setHorarioCustom(e.target.value)}
                        placeholder="8:00 AM" className={inputCls} />
                    </div>
                    <div>
                      <label className={lbl}>Duración</label>
                      <input type="text" value={duracion} onChange={(e) => setDuracion(e.target.value)}
                        placeholder="2 horas" className={inputCls} />
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── TARIFAS ── */}
          <div>
            <SectionLabel icon={<Tag size={10} />} text="Tarifas" />
            <div className="space-y-2">
              {isHotel ? (
                <div>
                  <label className={lbl}>Precio por noche (USD)</label>
                  <PriceInput
                    value={precio}
                    onChange={setPrecio}
                    placeholder="0"
                    wrapperClassName="w-full max-w-[180px]"
                    inputClassName="w-full h-8 pr-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 bg-white focus:outline-none focus:ring-2 placeholder:text-slate-300 tabular-nums"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Se aplica igual a SGL · DBL · TPL</p>
                </div>
              ) : isOtros ? (
                <PriceRow
                  label="Tarifa (USD)"
                  precio={precio} setPrecio={setPrecio}
                  precioNino={precioNino} setPrecioNino={setPrecioNino}
                  ninosEnabled={ninosEnabled} showNino={ninosEnabled}
                  hintText={ninosEnabled ? "Precio niño vacío → usa precio adulto" : "Tarifa fija para este servicio"}
                />
              ) : (
                <PriceRow
                  label={isCatamaran ? "Tarifa por noche / p/p (USD)" : "Tarifa p/p (USD)"}
                  precio={precio} setPrecio={setPrecio}
                  precioNino={precioNino} setPrecioNino={setPrecioNino}
                  ninosEnabled={ninosEnabled} showNino={true}
                  hintText={
                    ninosEnabled
                      ? "Precio niño vacío → usa precio adulto"
                      : isCatamaran && fechaInicioCat && fechaFinCat && fechaFinCat > fechaInicioCat
                        ? `Total = tarifa × ${nightsBetween(fechaInicioCat, fechaFinCat)} noches × pasajeros`
                        : undefined
                  }
                />
              )}
            </div>
          </div>

          {/* ── FECHAS (catamaran only) ── */}
          {isCatamaran && (
            <div>
              <SectionLabel icon={<MapPin size={10} />} text="Estadía" />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className={lbl}>Fecha inicio</label>
                  <input
                    type="date"
                    value={fechaInicioCat}
                    onChange={(e) => {
                      setFechaInicioCat(e.target.value);
                      if (fechaFinCat && e.target.value >= fechaFinCat) setFechaFinCat("");
                    }}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl}>Fecha fin</label>
                  <input
                    type="date"
                    value={fechaFinCat}
                    min={fechaInicioCat || undefined}
                    onChange={(e) => setFechaFinCat(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {fechaInicioCat && fechaFinCat && fechaFinCat > fechaInicioCat && (
                  <div className="flex-shrink-0 flex flex-col items-center justify-center h-8 px-3 rounded-lg border border-blue-100 bg-blue-50 mb-0.5">
                    <span className="text-[13px] font-bold leading-none" style={{ color: C }}>{nightsBetween(fechaInicioCat, fechaFinCat)}</span>
                    <span className="text-[9px] text-slate-400 leading-none mt-0.5">noches</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── OBSERVACIONES ── */}
          <div>
            <SectionLabel icon={<Sparkles size={10} />} text="Observaciones" />
            <div className="relative">
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value.slice(0, MAX_NOTAS))}
                rows={2}
                placeholder="Detalles adicionales que aparecerán en la cotización…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-900 bg-white focus:outline-none focus:ring-2 placeholder:text-slate-300 resize-none"
                style={{ paddingBottom: "1.6rem" }}
              />
              <span
                className="absolute bottom-2 right-3 text-[10px] pointer-events-none"
                style={{ color: notas.length >= MAX_NOTAS ? "#ef4444" : "#94a3b8" }}
              >
                {notas.length}/{MAX_NOTAS}
              </span>
            </div>
            {notas.trim() && (
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                <div
                  className="relative w-8 h-4 rounded-full transition-colors flex-shrink-0"
                  style={{ background: notesImportant ? "#ef7b15" : "#e2e8f0" }}
                  onClick={() => setNotesImportant((v) => !v)}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${notesImportant ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-[11px] font-medium transition-colors" style={{ color: notesImportant ? "#ef7b15" : "#94a3b8" }}>
                  Marcar como importante
                </span>
              </label>
            )}
          </div>

          {/* ── IMÁGENES (last) ── */}
          <div>
            <SectionLabel icon={<ImageIcon size={10} />} text="Imágenes del servicio" />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                files.forEach((file) => {
                  compressImage(file).then((dataUrl) => {
                    setImages((prev) => [...prev, dataUrl]);
                  });
                });
                e.target.value = "";
              }}
            />
            {/* Full-width dropzone — reduced height */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-3 py-2.5 px-4"
              style={{
                borderColor: `${C}50`,
                background: `${C}06`,
                color: C,
              }}
            >
              <ImageIcon size={16} strokeWidth={1.5} />
              <div className="text-left">
                <span className="block text-[12px] font-semibold" style={{ color: "#1e293b" }}>
                  Subir imágenes del servicio
                </span>
                <span className="block text-[10px]" style={{ color: "#94a3b8" }}>
                  Haz clic para seleccionar · múltiples permitidas
                </span>
              </div>
            </button>
            {/* Thumbnails below dropzone */}
            {images.length > 0 && (
              <div className="mt-2 flex items-start gap-2 flex-wrap">
                {images.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0"
                    style={{ width: 56, height: 56 }}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                      title="Eliminar"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
                <p className="w-full text-[10px] text-slate-400 mt-0.5">
                  Máx. 3 visibles en PDF · {images.length} cargada{images.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ── FIXED FOOTER ── */}
        <footer
          className="flex items-center justify-end gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-[13px] font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-8 px-5 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 shadow-sm transition-all"
            style={{ background: C }}
          >
            <Check className="w-3.5 h-3.5" />
            {isEdit ? "Guardar cambios" : "Agregar servicio"}
          </button>
        </footer>
      </form>
    </div>
  );
}
