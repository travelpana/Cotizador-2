import { useEffect, useMemo, useState } from "react";
import Sidebar, { type View } from "@/components/Sidebar";
import ClientForm, { AlojamientoBar } from "@/components/ClientForm";
import ServicioFormModal, {
  type ServicioTipo,
} from "@/components/ServicioFormModal";
import ServiciosSeleccionados from "@/components/ServiciosSeleccionados";
import ConfiguracionPanel from "@/components/ConfiguracionPanel";
import ExportButtons from "@/components/ExportButtons";
import VistaPreviaModal from "@/components/VistaPreviaModal";
import Itinerario from "@/components/Itinerario";
import Seguimiento from "@/components/Seguimiento";
import {
  loadGuardadas,
  saveGuardadas,
  type CotizacionGuardada,
  type ModoCotizacion,
} from "@/components/Guardadas";
import type { AddOption } from "@/components/AddServiceMenu";
import type {
  Acomodacion,
  Cliente,
  Hotel,
  ServicioSeleccionado,
  Tour,
  Traslado,
} from "@/lib/types";
import { api } from "@/lib/api";
import { calcularLocal } from "@/lib/calc";
import { Loader2 } from "lucide-react";

const DEFAULT_CLIENTE: Cliente = {
  nombre: "",
  correo: "",
  whatsapp: "",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>("cotizador");
  const [cliente, setCliente] = useState<Cliente>(DEFAULT_CLIENTE);
  const [acomodaciones, setAcomodaciones] = useState<Acomodacion[]>(["DBL"]);
  const [servicios, setServicios] = useState<ServicioSeleccionado[]>([]);
  const [modo, setModo] = useState<ModoCotizacion>("tarifas");
  const [incluirItinerario, setIncluirItinerario] = useState(true);
  const [incluirDescriptivos, setIncluirDescriptivos] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<CotizacionGuardada | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(CLOSED_FORM);

  const [guardadas, setGuardadas] = useState<CotizacionGuardada[]>([]);
  useEffect(() => {
    setGuardadas(loadGuardadas());
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, t, tr] = await Promise.all([
        api.hoteles(),
        api.tours(),
        api.traslados(),
      ]);
      setHoteles(h);
      setTours(t);
      setTraslados(tr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
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
    const item: CotizacionGuardada = {
      id: `${Date.now()}`,
      fechaCreacion: new Date().toISOString(),
      cliente,
      servicios,
      acomodaciones,
      modoCotizacion: modo,
    };
    const next = [item, ...guardadas].slice(0, 30);
    saveGuardadas(next);
    setGuardadas(next);
  };

  const handleClear = () => {
    if (servicios.length > 0 && !confirm("¿Limpiar la cotización actual?"))
      return;
    setCliente(DEFAULT_CLIENTE);
    setAcomodaciones(["DBL"]);
    setServicios([]);
    setModo("tarifas");
  };

  const openAdd = (option: AddOption) => {
    if (option === "manual") {
      setForm({
        open: true,
        tipo: "tour",
        isManual: true,
        allowSwitch: true,
        initial: null,
      });
    } else {
      setForm({
        open: true,
        tipo: option,
        isManual: false,
        allowSwitch: false,
        initial: null,
      });
    }
  };

  const openEdit = (s: ServicioSeleccionado) => {
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
    setCliente(g.cliente);
    setAcomodaciones(g.acomodaciones);
    setServicios(g.servicios);
    setModo(g.modoCotizacion);
    setView("cotizador");
  };
  const seguimientoDelete = (id: string) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    const next = guardadas.filter((x) => x.id !== id);
    saveGuardadas(next);
    setGuardadas(next);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewQuote(null);
  };

  const previewModo: ModoCotizacion = previewQuote?.modoCotizacion ?? modo;
  const previewCliente = previewQuote?.cliente ?? cliente;
  const previewServicios = previewQuote?.servicios ?? servicios;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onView={setView}
        seguimientoCount={guardadas.length}
        onReload={fetchAll}
      />

      <main className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border px-6 lg:px-10 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {view === "cotizador"
                  ? "Cotizador de Viajes"
                  : "Seguimiento"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {view === "cotizador"
                  ? "Multi-acomodación · cálculo en tiempo real desde tarifario Excel"
                  : "Cotizaciones guardadas en este equipo"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">
              {hoteles.length} hoteles · {tours.length} tours ·{" "}
              {traslados.length} traslados
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
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
              <div className="space-y-6 min-w-0">
                <ClientForm cliente={cliente} onChange={setCliente} />
                <AlojamientoBar
                  cliente={cliente}
                  onClienteChange={setCliente}
                  acomodaciones={acomodaciones}
                  onAcomodacionesChange={setAcomodaciones}
                />
                <ServiciosSeleccionados
                  servicios={servicios}
                  acomodaciones={acomodaciones}
                  pasajeros={cliente.pasajeros}
                  onChange={setServicios}
                  onAdd={openAdd}
                  onEdit={openEdit}
                />
                {incluirItinerario && (
                  <Itinerario
                    cliente={cliente}
                    servicios={servicios}
                    incluirDescriptivos={incluirDescriptivos}
                  />
                )}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <ConfiguracionPanel
                  modo={modo}
                  onModoChange={setModo}
                  incluirItinerario={incluirItinerario}
                  onToggleItinerario={() => setIncluirItinerario((v) => !v)}
                  incluirDescriptivos={incluirDescriptivos}
                  onToggleDescriptivos={() =>
                    setIncluirDescriptivos((v) => !v)
                  }
                />
                <ExportButtons
                  cliente={cliente}
                  servicios={servicios}
                  result={result}
                  modo={modo}
                  incluirItinerario={incluirItinerario}
                  incluirDescriptivos={incluirDescriptivos}
                  onSave={handleSave}
                  onClear={handleClear}
                  onPreview={() => {
                    setPreviewQuote(null);
                    setPreviewOpen(true);
                  }}
                />
              </aside>
            </div>
          )}
        </div>

        <footer className="px-6 lg:px-10 py-6 text-center text-xs text-muted-foreground">
          RGE Style Travel · Cotizador 2026
        </footer>
      </main>

      <ServicioFormModal
        open={form.open}
        onClose={() => setForm(CLOSED_FORM)}
        tipo={form.tipo}
        isManual={form.isManual}
        allowTipoSwitch={form.allowSwitch}
        hoteles={hoteles}
        tours={tours}
        traslados={traslados}
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
      />
    </div>
  );
}
