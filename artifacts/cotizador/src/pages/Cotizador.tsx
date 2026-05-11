import { useEffect, useMemo, useState } from "react";
import Sidebar, { type View } from "@/components/Sidebar";
import ClientForm, { AlojamientoBar } from "@/components/ClientForm";
import ServicioFormModal, {
  type ServicioTipo,
} from "@/components/ServicioFormModal";
import ServiciosSeleccionados from "@/components/ServiciosSeleccionados";
import ServiceSearchBar from "@/components/ServiceSearchBar";
import CustomItemModal from "@/components/CustomItemModal";
import ConfiguracionPanel from "@/components/ConfiguracionPanel";
import ExportButtons from "@/components/ExportButtons";
import VistaPreviaModal from "@/components/VistaPreviaModal";
import Itinerario from "@/components/Itinerario";
import Seguimiento from "@/components/Seguimiento";
import Plantillas from "@/components/Plantillas";
import Descriptivos from "@/components/Descriptivos";
import Tarifas from "@/components/Tarifas";
import {
  loadGuardadas,
  saveGuardadas,
  guardarEnSeguimiento,
  generateNumeroCotizacion,
  duplicarCotizacion,
  type CotizacionGuardada,
  type EstadoCotizacion,
  type ModoCotizacion,
} from "@/components/Guardadas";
import {
  loadPlantillas,
  savePlantillas,
  serviciosToBlocks,
  newPlantilla,
} from "@/lib/plantillas";
import {
  loadDescriptivosLS,
  mergeDescriptivos,
} from "@/lib/descriptivos";
import {
  loadHotelesLS,
  loadToursLS,
  loadTrasladosLS,
  mergeHoteles,
  mergeTours,
  mergeTraslados,
} from "@/lib/tarifas";
import type {
  Acomodacion,
  Cliente,
  ClienteValidationErrors,
  Descriptivo,
  Hotel,
  ServicioSeleccionado,
  Tour,
  Traslado,
} from "@/lib/types";
import { validateCliente } from "@/lib/types";
import { api, type CatalogInfo } from "@/lib/api";
import { calcularLocal } from "@/lib/calc";
import { Loader2 } from "lucide-react";

const DEFAULT_CLIENTE: Cliente = {
  nombre: "",
  correo: "",
  whatsapp: "",
  agente: "",
  fechaInicio: "",
  fechaFin: "",
  vigencia: "",
  pasajeros: 2,
  ninos: 0,
  noches: 1,
};

interface FormState {
  open: boolean;
  tipo: ServicioTipo;
  isManual: boolean;
  allowSwitch: boolean;
  initial: ServicioSeleccionado | null;
}

const CLOSED_FORM: FormState = {
  open: false,
  tipo: "hotel",
  isManual: false,
  allowSwitch: false,
  initial: null,
};

export default function CotizadorPage() {
  const [hoteles, setHoteles] = useState<Hotel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [descriptivos, setDescriptivos] = useState<Descriptivo[]>([]);
  const [fileInfo, setFileInfo] = useState<CatalogInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>("cotizador");
  const [cliente, setCliente] = useState<Cliente>(DEFAULT_CLIENTE);
  const [validationErrors, setValidationErrors] =
    useState<ClienteValidationErrors>({});
  const [acomodaciones, setAcomodaciones] = useState<Acomodacion[]>(["DBL"]);
  const [servicios, setServicios] = useState<ServicioSeleccionado[]>([]);
  const [modo, setModo] = useState<ModoCotizacion>("tarifas");
  const [incluirItinerario, setIncluirItinerario] = useState(false);
  const [incluirDescriptivos, setIncluirDescriptivos] = useState(false);
  const [incluirDescriptivoCompleto, setIncluirDescriptivoCompleto] =
    useState(false);
  const [actividadesOverride, setActividadesOverride] = useState<
    Record<number, string>
  >({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<CotizacionGuardada | null>(
    null,
  );
  // Stable cotización code for the current draft. Generated lazily on first
  // export/preview/save and reused across PDF, email, WhatsApp and Seguimiento
  // so all surfaces show the same code (e.g. RGE-HF9ZMW).
  const [currentNumero, setCurrentNumero] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(CLOSED_FORM);
  const [customOpen, setCustomOpen] = useState(false);
  const [customEditing, setCustomEditing] =
    useState<ServicioSeleccionado | null>(null);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);

  const [guardadas, setGuardadas] = useState<CotizacionGuardada[]>([]);
  useEffect(() => {
    setGuardadas(loadGuardadas());
  }, []);

  const [plantillasCount, setPlantillasCount] = useState(
    () => loadPlantillas().length,
  );

  const refreshPlantillasCount = () => {
    setPlantillasCount(loadPlantillas().length);
  };

  const [lsDescriptivosVersion, setLsDescriptivosVersion] = useState(0);
  const handleDescriptivosChanged = () => {
    setLsDescriptivosVersion((v) => v + 1);
  };

  const mergedDescriptivos = useMemo(() => {
    const lsItems = loadDescriptivosLS();
    return mergeDescriptivos(lsItems, descriptivos);
  }, [descriptivos, lsDescriptivosVersion]);

  const [lsTarifasVersion, setLsTarifasVersion] = useState(0);
  const handleTarifasChanged = () => setLsTarifasVersion((v) => v + 1);

  const mergedHoteles = useMemo(
    () => mergeHoteles(loadHotelesLS(), hoteles),
    [hoteles, lsTarifasVersion],
  );
  const mergedTours = useMemo(
    () => mergeTours(loadToursLS(), tours),
    [tours, lsTarifasVersion],
  );
  const mergedTraslados = useMemo(
    () => mergeTraslados(loadTrasladosLS(), traslados),
    [traslados, lsTarifasVersion],
  );

  const [toast, setToast] = useState<{
    msg: string;
    tone: "info" | "error";
  } | null>(null);
  const showToast = (msg: string, tone: "info" | "error" = "info") => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleClienteChange = (next: Cliente) => {
    setCliente(next);
    if (Object.keys(validationErrors).length > 0) {
      const { errors } = validateCliente(next);
      setValidationErrors(errors);
    }
  };

  const validateBeforeAction = (): boolean => {
    const { ok, errors } = validateCliente(cliente);
    setValidationErrors(errors);
    if (!ok) {
      showToast("Completa los datos obligatorios", "error");
    }
    return ok;
  };

  const getOrCreateNumero = (): string => {
    if (currentNumero) return currentNumero;
    const fresh = generateNumeroCotizacion();
    setCurrentNumero(fresh);
    return fresh;
  };

  const handleAutoSave = () => {
    const numero = getOrCreateNumero();
    const { saved, items } = guardarEnSeguimiento({
      cliente,
      servicios,
      acomodaciones,
      modo,
      numeroCotizacion: numero,
    });
    setGuardadas(items);
    if (saved) showToast("Cotización guardada en seguimiento");
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, t, tr, ds, info] = await Promise.all([
        api.hoteles(),
        api.tours(),
        api.traslados(),
        api.descriptivos().catch(() => [] as Descriptivo[]),
        api.catalogInfo().catch(() => null),
      ]);
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
      setDescriptivos(ds);
      setFileInfo(info);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTarifarioReload = async () => {
    try {
      const { hoteles: h, tours: t, traslados: tr, descriptivos: ds, loadedAt } =
        await api.reloadAll();
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
      setDescriptivos(ds);
      setFileInfo((prev) => ({
        filename: prev?.filename ?? "TARIFARIO.xlsx",
        loadedAt,
        counts: { hoteles: h.length, tours: t.length, traslados: tr.length },
      }));
      showToast(
        `Tarifario actualizado · ${h.length} hoteles · ${t.length} tours · ${tr.length} traslados`,
      );
    } catch (e) {
      console.error("[Recargar tarifario]", e);
      showToast("Error al recargar el tarifario", "error");
      throw e;
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const result = await api.uploadTarifario(file);
      const [h, t, tr, ds] = await Promise.all([
        api.hoteles(),
        api.tours(),
        api.traslados(),
        api.descriptivos().catch(() => [] as Descriptivo[]),
      ]);
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
      setDescriptivos(ds);
      setFileInfo({
        filename: result.filename,
        loadedAt: result.loadedAt,
        counts: result.counts,
      });
      showToast(
        `Nuevo tarifario cargado correctamente · ${result.counts.hoteles} hoteles · ${result.counts.tours} tours`,
      );
    } catch (e) {
      console.error("[Subir tarifario]", e);
      showToast((e as Error).message || "Error al subir el tarifario", "error");
      throw e;
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const result = useMemo(
    () => calcularLocal(servicios, acomodaciones, cliente),
    [servicios, acomodaciones, cliente],
  );

  const previewResult = useMemo(() => {
    if (!previewQuote) return result;
    return calcularLocal(
      previewQuote.servicios,
      previewQuote.acomodaciones,
      previewQuote.cliente,
    );
  }, [previewQuote, result]);

  const handleSave = () => {
    const numero = getOrCreateNumero();
    const item: CotizacionGuardada = {
      id: `${Date.now()}`,
      fechaCreacion: new Date().toISOString(),
      numeroCotizacion: numero,
      cliente,
      servicios,
      acomodaciones,
      modoCotizacion: modo,
    };
    const next = [item, ...guardadas].slice(0, 30);
    saveGuardadas(next);
    setGuardadas(next);
    showToast(`Cotización ${numero} guardada`);
  };

  const handleClear = () => {
    if (servicios.length > 0 && !confirm("¿Limpiar la cotización actual?"))
      return;
    setCliente(DEFAULT_CLIENTE);
    setValidationErrors({});
    setAcomodaciones(["DBL"]);
    setServicios([]);
    setModo("tarifas");
    setCurrentNumero(null);
  };

  const handleQuickAdd = (s: ServicioSeleccionado) => {
    setServicios((prev) => {
      const exists = prev.some((x) => x.tipo === s.tipo && x.id === s.id);
      if (exists)
        return prev.map((x) => (x.tipo === s.tipo && x.id === s.id ? s : x));
      return [...prev, s];
    });
    setHighlightedServiceId(s.id);
    showToast(customEditing ? "Servicio actualizado" : "Servicio agregado");
    window.setTimeout(() => {
      setHighlightedServiceId((curr) => (curr === s.id ? null : curr));
    }, 1500);
  };

  const openEdit = (s: ServicioSeleccionado) => {
    if (s.tipo === "vuelo") {
      setCustomEditing(s);
      setCustomOpen(true);
      return;
    }
    setForm({
      open: true,
      tipo: s.tipo,
      isManual: !!s.manual,
      allowSwitch: !!s.manual,
      initial: s,
    });
  };

  const handleFormSave = (s: ServicioSeleccionado) => {
    const exists = servicios.some(
      (x) => x.tipo === s.tipo && x.id === s.id,
    );
    if (exists) {
      setServicios(
        servicios.map((x) => (x.tipo === s.tipo && x.id === s.id ? s : x)),
      );
    } else {
      setServicios([...servicios, s]);
    }
    setForm(CLOSED_FORM);
  };

  // Seguimiento handlers
  const seguimientoView = (g: CotizacionGuardada) => {
    setPreviewQuote(g);
    setPreviewOpen(true);
  };
  const seguimientoEdit = (g: CotizacionGuardada) => {
    setCliente({ ...DEFAULT_CLIENTE, ...g.cliente });
    setValidationErrors({});
    setAcomodaciones(g.acomodaciones);
    setServicios(g.servicios);
    setModo(g.modoCotizacion);
    setCurrentNumero(g.numeroCotizacion);
    setView("cotizador");
  };
  const seguimientoDelete = (id: string) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    const next = guardadas.filter((x) => x.id !== id);
    saveGuardadas(next);
    setGuardadas(next);
  };
  const seguimientoDuplicate = (g: CotizacionGuardada) => {
    const copia = duplicarCotizacion(g);
    const next = [copia, ...guardadas].slice(0, 50);
    saveGuardadas(next);
    setGuardadas(next);
    showToast(`Cotización duplicada como ${copia.numeroCotizacion}`);
  };
  const seguimientoUpdateEstado = (id: string, estado: EstadoCotizacion) => {
    const next = guardadas.map((g) =>
      g.id === id ? { ...g, estado } : g,
    );
    saveGuardadas(next);
    setGuardadas(next);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewQuote(null);
  };

  const handleUsarPlantilla = (servicios: ServicioSeleccionado[]) => {
    setServicios(servicios);
    setCurrentNumero(null);
    setView("cotizador");
    showToast(
      servicios.length > 0
        ? `Plantilla cargada · ${servicios.length} servicio${servicios.length !== 1 ? "s" : ""} agregado${servicios.length !== 1 ? "s" : ""}`
        : "Plantilla cargada (sin servicios en el tarifario actual)",
    );
  };

  const handleGuardarComoPlantilla = () => {
    if (servicios.length === 0) return;
    const nombre = window.prompt("Nombre para la nueva plantilla:");
    if (!nombre?.trim()) return;
    const plantilla = newPlantilla(nombre.trim());
    plantilla.bloques = serviciosToBlocks(servicios);
    const existing = loadPlantillas();
    const next = [plantilla, ...existing];
    savePlantillas(next);
    setPlantillasCount(next.length);
    showToast(`Plantilla "${plantilla.nombre}" guardada`);
  };

  const previewModo: ModoCotizacion = previewQuote?.modoCotizacion ?? modo;
  const previewCliente = previewQuote?.cliente ?? cliente;
  const previewServicios = previewQuote?.servicios ?? servicios;
  const previewNumero =
    previewQuote?.numeroCotizacion ?? currentNumero ?? "";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onView={(v) => {
          if (v === "plantillas") refreshPlantillasCount();
          setView(v);
        }}
        seguimientoCount={guardadas.length}
        plantillasCount={plantillasCount}
        fileInfo={fileInfo}
        onReload={handleTarifarioReload}
        onUpload={handleUpload}
      />

      <main className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border px-6 lg:px-10 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {view === "cotizador"
                  ? "Cotizador de Viajes"
                  : view === "seguimiento"
                    ? "Seguimiento"
                    : view === "plantillas"
                      ? "Plantillas"
                      : view === "descriptivos"
                        ? "Descriptivos"
                        : "Tarifas"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {view === "cotizador"
                  ? "Multi-acomodación · cálculo en tiempo real desde tarifario Excel"
                  : view === "seguimiento"
                    ? "Cotizaciones guardadas en este equipo"
                    : view === "plantillas"
                      ? "Estructuras reutilizables para circuitos y multi-destino"
                      : view === "descriptivos"
                        ? "Biblioteca de descriptivos turísticos vinculados al tarifario"
                        : "Administra hoteles, tours y traslados · localStorage + Excel"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">
              {mergedHoteles.length} hoteles · {mergedTours.length} tours ·{" "}
              {mergedTraslados.length} traslados
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-md p-12 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div>Cargando tarifario desde Excel…</div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-red-500">
              <div className="font-medium text-red-700">
                Error cargando datos
              </div>
              <div className="text-sm text-slate-700 mt-1">{error}</div>
              <button
                onClick={fetchAll}
                className="mt-3 px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : view === "seguimiento" ? (
            <Seguimiento
              items={guardadas}
              onView={seguimientoView}
              onEdit={seguimientoEdit}
              onDelete={seguimientoDelete}
              onDuplicate={seguimientoDuplicate}
              onUpdateEstado={seguimientoUpdateEstado}
            />
          ) : view === "plantillas" ? (
            <Plantillas
              hoteles={mergedHoteles}
              tours={mergedTours}
              traslados={mergedTraslados}
              onUsarPlantilla={(svcs) => {
                handleUsarPlantilla(svcs);
                refreshPlantillasCount();
              }}
            />
          ) : view === "descriptivos" ? (
            <Descriptivos
              apiDescriptivos={descriptivos}
              onChanged={handleDescriptivosChanged}
            />
          ) : view === "tarifas" ? (
            <Tarifas
              apiHoteles={hoteles}
              apiTours={tours}
              apiTraslados={traslados}
              onChanged={handleTarifasChanged}
              onUpload={handleUpload}
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
              <div className="space-y-6 min-w-0">
                <ClientForm
                  cliente={cliente}
                  onChange={handleClienteChange}
                  errors={validationErrors}
                />
                <AlojamientoBar
                  cliente={cliente}
                  onClienteChange={handleClienteChange}
                  acomodaciones={acomodaciones}
                  onAcomodacionesChange={setAcomodaciones}
                />
                <ServiceSearchBar
                  hoteles={mergedHoteles}
                  tours={mergedTours}
                  traslados={mergedTraslados}
                  globalFechaInicio={cliente.fechaInicio}
                  globalFechaFin={cliente.fechaFin}
                  onPick={handleQuickAdd}
                />
                <ServiciosSeleccionados
                  servicios={servicios}
                  acomodaciones={acomodaciones}
                  pasajeros={cliente.pasajeros}
                  highlightedId={highlightedServiceId}
                  onChange={setServicios}
                  onEdit={openEdit}
                  onAddCustom={() => setCustomOpen(true)}
                />
                {incluirItinerario && (
                  <Itinerario
                    cliente={cliente}
                    servicios={servicios}
                    incluirDescriptivos={incluirDescriptivos}
                    actividadesOverride={actividadesOverride}
                    onActividadesOverrideChange={setActividadesOverride}
                  />
                )}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                {servicios.length > 0 && (
                  <button
                    type="button"
                    onClick={handleGuardarComoPlantilla}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-xs font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/></svg>
                    Guardar cotización como plantilla
                  </button>
                )}
                <ConfiguracionPanel
                  modo={modo}
                  onModoChange={setModo}
                  incluirItinerario={incluirItinerario}
                  onToggleItinerario={() => setIncluirItinerario((v) => !v)}
                  incluirDescriptivos={incluirDescriptivos}
                  onToggleDescriptivos={() =>
                    setIncluirDescriptivos((v) => !v)
                  }
                  incluirDescriptivoCompleto={incluirDescriptivoCompleto}
                  onToggleDescriptivoCompleto={() =>
                    setIncluirDescriptivoCompleto((v) => !v)
                  }
                />
                <ExportButtons
                  cliente={cliente}
                  servicios={servicios}
                  result={result}
                  modo={modo}
                  incluirItinerario={incluirItinerario}
                  incluirDescriptivos={incluirDescriptivos}
                  incluirDescriptivoCompleto={incluirDescriptivoCompleto}
                  descriptivos={mergedDescriptivos}
                  actividadesOverride={actividadesOverride}
                  onSave={handleSave}
                  onClear={handleClear}
                  onPreview={() => {
                    getOrCreateNumero();
                    setPreviewQuote(null);
                    setPreviewOpen(true);
                  }}
                  onAutoSave={handleAutoSave}
                  validateBeforeAction={validateBeforeAction}
                  getNumeroCotizacion={getOrCreateNumero}
                />
              </aside>
            </div>
          )}
        </div>

        <footer className="px-6 lg:px-10 py-6 text-center text-xs text-muted-foreground">
          RGE Style Travel · Cotizador 2026
        </footer>
      </main>

      <CustomItemModal
        open={customOpen}
        onClose={() => {
          setCustomOpen(false);
          setCustomEditing(null);
        }}
        onSave={(s) => {
          handleQuickAdd(s);
          setCustomEditing(null);
        }}
        globalFechaInicio={cliente.fechaInicio}
        globalFechaFin={cliente.fechaFin}
        globalNinos={cliente.ninos}
        initial={customEditing}
      />

      <ServicioFormModal
        open={form.open}
        onClose={() => setForm(CLOSED_FORM)}
        tipo={form.tipo}
        isManual={form.isManual}
        allowTipoSwitch={form.allowSwitch}
        hoteles={mergedHoteles}
        tours={mergedTours}
        traslados={mergedTraslados}
        initial={form.initial}
        globalPasajeros={cliente.pasajeros}
        globalFechaInicio={cliente.fechaInicio}
        globalFechaFin={cliente.fechaFin}
        onSave={handleFormSave}
      />

      <VistaPreviaModal
        open={previewOpen}
        onClose={closePreview}
        cliente={previewCliente}
        servicios={previewServicios}
        result={previewResult}
        modo={previewModo}
        incluirItinerario={incluirItinerario}
        incluirDescriptivos={incluirDescriptivos}
        incluirDescriptivoCompleto={incluirDescriptivoCompleto}
        descriptivos={mergedDescriptivos}
        actividadesOverride={actividadesOverride}
        onActividadesOverrideChange={setActividadesOverride}
        numeroCotizacion={previewNumero}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm shadow-lg ring-1 animate-in fade-in slide-in-from-bottom-2 ${
            toast.tone === "error"
              ? "bg-red-600 ring-red-500/30"
              : "bg-slate-900 ring-white/10"
          }`}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                toast.tone === "error" ? "#fecaca" : "#2596be",
            }}
          />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
