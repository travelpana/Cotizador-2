import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ClientForm from "@/components/ClientForm";
import TravelParams from "@/components/TravelParams";
import AcomodacionSelector from "@/components/AcomodacionSelector";
import ServiciosModal from "@/components/ServiciosModal";
import ServiciosSeleccionados from "@/components/ServiciosSeleccionados";
import TotalesPanel from "@/components/TotalesPanel";
import ExportButtons from "@/components/ExportButtons";
import Itinerario from "@/components/Itinerario";
import Guardadas, {
  loadGuardadas,
  saveGuardadas,
  type CotizacionGuardada,
} from "@/components/Guardadas";
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
  fechaInicio: "",
  fechaFin: "",
  pasajeros: 2,
  ninos: 0,
  noches: 4,
};

export default function CotizadorPage() {
  const [hoteles, setHoteles] = useState<Hotel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState<Cliente>(DEFAULT_CLIENTE);
  const [acomodaciones, setAcomodaciones] = useState<Acomodacion[]>(["DBL"]);
  const [servicios, setServicios] = useState<ServicioSeleccionado[]>([]);
  const [mode, setMode] = useState<"tarifas" | "total">("total");
  const [incluirDescriptivos, setIncluirDescriptivos] = useState(false);
  const [savedKey, setSavedKey] = useState(0);
  const [serviciosOpen, setServiciosOpen] = useState(false);

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

  const handleSave = () => {
    const item: CotizacionGuardada = {
      id: `${Date.now()}`,
      fechaCreacion: new Date().toISOString(),
      cliente,
      servicios,
      acomodaciones,
    };
    const next = [item, ...loadGuardadas()].slice(0, 30);
    saveGuardadas(next);
    setSavedKey((k) => k + 1);
  };

  const handleClear = () => {
    if (
      servicios.length > 0 &&
      !confirm("¿Limpiar la cotización actual?")
    )
      return;
    setCliente(DEFAULT_CLIENTE);
    setAcomodaciones(["DBL"]);
    setServicios([]);
  };

  const handleLoadGuardada = (g: CotizacionGuardada) => {
    setCliente(g.cliente);
    setAcomodaciones(g.acomodaciones);
    setServicios(g.servicios);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onReload={fetchAll} />

      <main className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border px-6 lg:px-10 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Cotizador de Viajes
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-acomodación · cálculo en tiempo real desde tarifario Excel
              </p>
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">
              {hoteles.length} hoteles · {tours.length} tours · {traslados.length} traslados
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
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
              {/* Main column */}
              <div className="space-y-6 min-w-0">
                <ClientForm cliente={cliente} onChange={setCliente} />
                <TravelParams cliente={cliente} onChange={setCliente} />
                <AcomodacionSelector
                  selected={acomodaciones}
                  onChange={setAcomodaciones}
                />
                <ServiciosSeleccionados
                  servicios={servicios}
                  acomodaciones={acomodaciones}
                  onChange={setServicios}
                  onAdd={() => setServiciosOpen(true)}
                />
                <Itinerario
                  cliente={cliente}
                  servicios={servicios}
                  incluirDescriptivos={incluirDescriptivos}
                  onToggleDescriptivos={() =>
                    setIncluirDescriptivos((v) => !v)
                  }
                />
                <Guardadas refresh={savedKey} onLoad={handleLoadGuardada} />
              </div>

              {/* Right rail */}
              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <TotalesPanel
                  result={result}
                  cliente={cliente}
                  mode={mode}
                  onModeChange={setMode}
                />
                <ExportButtons
                  cliente={cliente}
                  servicios={servicios}
                  result={result}
                  incluirDescriptivos={incluirDescriptivos}
                  onSave={handleSave}
                  onClear={handleClear}
                />
              </aside>
            </div>
          )}
        </div>

        <footer className="px-6 lg:px-10 py-6 text-center text-xs text-muted-foreground">
          RGE Style Travel · Cotizador 2026
        </footer>
      </main>

      <ServiciosModal
        open={serviciosOpen}
        onClose={() => setServiciosOpen(false)}
        hoteles={hoteles}
        tours={tours}
        traslados={traslados}
        seleccionados={servicios}
        onChange={setServicios}
      />
    </div>
  );
}
