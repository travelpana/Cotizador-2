import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Sparkles, Plane } from "lucide-react";
import type { Acomodacion, ServicioSeleccionado } from "@/lib/types";

type CustomTipo = "hotel" | "traslado" | "tour" | "vuelo";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (s: ServicioSeleccionado) => void;
  globalFechaInicio?: string;
  globalFechaFin?: string;
  /** Global niños count from Alojamiento — gates the precio niño field. */
  globalNinos?: number;
  /** When provided, the modal opens in edit mode pre-filled with this service. */
  initial?: ServicioSeleccionado | null;
}

const TIPO_OPTIONS: { value: CustomTipo; label: string }[] = [
  { value: "hotel", label: "Hotelería" },
  { value: "traslado", label: "Traslado" },
  { value: "tour", label: "Tours" },
  { value: "vuelo", label: "Vuelos" },
];

const ALL_ACOM: Acomodacion[] = ["SGL", "DBL", "TPL", "CHD"];

const CIUDADES_VUELO = ["Panamá", "Bocas del Toro"] as const;

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
  const [tipo, setTipo] = useState<CustomTipo>("tour");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [precioNino, setPrecioNino] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [origen, setOrigen] = useState<string>(CIUDADES_VUELO[0]);
  const [destino, setDestino] = useState<string>(CIUDADES_VUELO[1]);
  const [idaVuelta, setIdaVuelta] = useState<boolean>(true);
  const nombreRef = useRef<HTMLInputElement>(null);

  const ninosEnabled = globalNinos > 0;

  useEffect(() => {
    if (open) {
      if (initial) {
        const initTipo: CustomTipo =
          initial.tipo === "vuelo"
            ? "vuelo"
            : initial.tipo === "hotel"
              ? "hotel"
              : initial.tipo === "tour"
                ? "tour"
                : "traslado";
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
        setOrigen(initial.origen ?? CIUDADES_VUELO[0]);
        setDestino(initial.destino ?? CIUDADES_VUELO[1]);
        const arrowCount = (initial.nombre.match(/→/g) ?? []).length;
        setIdaVuelta(initial.tipo === "vuelo" ? arrowCount >= 2 : true);
      } else {
        setTipo("tour");
        setNombre("");
        setPrecio("");
        setPrecioNino("");
        setNotas("");
        setOrigen(CIUDADES_VUELO[0]);
        setDestino(CIUDADES_VUELO[1]);
        setIdaVuelta(true);
      }
      window.setTimeout(() => nombreRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!ninosEnabled && precioNino !== "") {
      setPrecioNino("");
    }
  }, [ninosEnabled, precioNino]);

  const isVuelo = tipo === "vuelo";

  const vueloNombre = useMemo(
    () =>
      idaVuelta
        ? `${origen} → ${destino} → ${origen}`
        : `${origen} → ${destino}`,
    [origen, destino, idaVuelta],
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
      notas: notas.trim() || undefined,
      ...(tipo === "hotel"
        ? {
            fechaInicio: globalFechaInicio || undefined,
            fechaFin: globalFechaFin || undefined,
          }
        : {}),
      ...(isVuelo
        ? {
            origen,
            destino,
            unitOverride: value,
          }
        : {}),
    };

    onSave(servicio);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {isVuelo ? (
                <Plane className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">
                {isEdit
                  ? isVuelo
                    ? "Editar vuelo"
                    : "Editar ítem personalizado"
                  : isVuelo
                    ? "Vuelo personalizado"
                    : "Ítem personalizado"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isVuelo
                  ? "Selecciona origen y destino del vuelo"
                  : "Agrega un servicio que no está en el tarifario"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Tipo de servicio
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as CustomTipo)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {isVuelo ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Origen
                  </label>
                  <select
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CIUDADES_VUELO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Destino
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CIUDADES_VUELO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">
                  Ida y vuelta
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={idaVuelta}
                  onClick={() => setIdaVuelta((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    idaVuelta ? "bg-primary" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      idaVuelta ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <div className="text-xs text-slate-600">
                  Nombre generado:{" "}
                  <span className="font-semibold text-slate-900">
                    {vueloNombre}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Nombre del servicio
              </label>
              <input
                ref={nombreRef}
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Cena especial en restaurante"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Precio (USD)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={precio}
                onChange={(e) => setPrecio(e.target.value.replace(/[^0-9]/g, ""))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 tabular-nums"
              />
            </div>
            {tipo !== "hotel" && (
              <div>
                <label
                  className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wide transition-colors ${
                    ninosEnabled ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  Precio niño (USD)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={precioNino}
                  onChange={(e) => setPrecioNino(e.target.value.replace(/[^0-9]/g, ""))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  disabled={!ninosEnabled}
                  title={
                    ninosEnabled ? undefined : "Disponible cuando se agregan niños"
                  }
                  className={`w-full h-10 px-3.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-300 tabular-nums transition-all duration-200 ${
                    ninosEnabled
                      ? "border-slate-200 text-slate-900"
                      : "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                  }`}
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 -mt-2">
            {tipo === "hotel"
              ? "Se aplicará el mismo valor a todas las acomodaciones"
              : isVuelo
                ? ninosEnabled
                  ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                  : "Precio por persona del vuelo (puedes editarlo más tarde)"
                : ninosEnabled
                  ? "Si dejas el precio de niño vacío, se usará el precio de adulto"
                  : "Precio por persona, igual para todos los rangos"}
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales que aparecerán en la cotización"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200/60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {isEdit ? "Guardar" : "Agregar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
