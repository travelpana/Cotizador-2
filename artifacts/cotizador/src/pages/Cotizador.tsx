import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ClientForm from "@/components/ClientForm";
import SelectorAcomodacion from "@/components/SelectorAcomodacion";
import Servicios from "@/components/Servicios";
import Totales from "@/components/Totales";
import Itinerario from "@/components/Itinerario";
import Exportaciones from "@/components/Exportaciones";
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
  const [showTarifas, setShowTarifas] = useState(true);
  const [incluirDescriptivos, setIncluirDescriptivos] = useState(false);
  const [savedKey, setSavedKey] = useState(0);

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
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-8 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Cotizador de Viajes
              </h1>
              <p className="text-sm text-muted-foreground">
                Multi-acomodación · cálculo en tiempo real desde tarifario Excel
              </p>
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">
              {hoteles.length} hoteles · {tours.length} tours · {traslados.length} traslados
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
          {loading ? (
            <div className="card-white p-12 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div>Cargando tarifario desde Excel…</div>
            </div>
          ) : error ? (
            <div className="card-white p-6 border-l-4 border-red-500">
              <div className="font-medium text-red-700">Error cargando datos</div>
              <div className="text-sm text-slate-700 mt-1">{error}</div>
              <button
                onClick={fetchAll}
                className="mt-3 px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <ClientForm cliente={cliente} onChange={setCliente} />
                  <Servicios
                    hoteles={hoteles}
                    tours={tours}
                    traslados={traslados}
                    seleccionados={servicios}
                    onChange={setServicios}
                  />
                </div>
                <div className="space-y-6">
                  <SelectorAcomodacion
                    selected={acomodaciones}
                    onChange={setAcomodaciones}
                  />
                  <Guardadas refresh={savedKey} onLoad={handleLoadGuardada} />
                </div>
              </div>

              <Totales
                result={result}
                showTarifas={showTarifas}
                onToggle={() => setShowTarifas((v) => !v)}
              />

              <Itinerario
                cliente={cliente}
                servicios={servicios}
                incluirDescriptivos={incluirDescriptivos}
                onToggleDescriptivos={() => setIncluirDescriptivos((v) => !v)}
              />

              <Exportaciones
                cliente={cliente}
                servicios={servicios}
                result={result}
                incluirDescriptivos={incluirDescriptivos}
                onSave={handleSave}
                onClear={handleClear}
              />
            </>
          )}
        </div>

        <footer className="px-8 py-6 text-center text-xs text-muted-foreground">
          RGE Style Travel · Cotizador 2026
        </footer>
      </main>
    </div>
  );
}
