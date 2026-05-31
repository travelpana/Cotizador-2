import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Hotel as HotelIcon,
  MapPin,
  Plus,
  Save,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Bus,
  RefreshCw,
  Upload,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Hotel, Tour, Traslado } from "@/lib/types";
import type { CatalogInfo } from "@/lib/api";
import type { HotelLocal, TourLocal, TrasladoLocal } from "@/lib/tarifas";
import {
  duplicarHotel,
  duplicarTour,
  duplicarTraslado,
  exportarRespaldo,
  hotelFromApi,
  loadHotelesLS,
  loadToursLS,
  loadTrasladosLS,
  newHotelLocal,
  newTourLocal,
  newTrasladoLocal,
  saveHotelesLS,
  saveToursLS,
  saveTrasladosLS,
  tourFromApi,
  trasladoFromApi,
} from "@/lib/tarifas";
import { fmt } from "@/lib/calc";

/* ─── Constants ─── */

const ESTRELLAS_OPTS = ["★★★", "★★★★", "★★★★★"];
const UBICACION_OPTS = [
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
const DESAYUNO_OPTS = ["Incluido", "No incluido", "Sin régimen"];

/* ─── Shared form styles ─── */

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-400";
const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer";
const numCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 text-right font-mono";
const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

/* ─── Modal wrapper ─── */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

/* ─── Status pill ─── */

function StatusPill({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${activo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

/* ─── Row action buttons ─── */

function RowActions({ onEdit, onDuplicate, onToggle, activo }: { onEdit: () => void; onDuplicate: () => void; onToggle: () => void; activo: boolean }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onToggle} title={activo ? "Desactivar" : "Activar"} className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
        {activo ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
      <button onClick={onDuplicate} title="Duplicar" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">
        Editar
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HOTELES TAB
══════════════════════════════════════════════════════ */

function HotelesTab({ apiHoteles, onChanged }: { apiHoteles: Hotel[]; onChanged: () => void }) {
  const [items, setItems] = useState<HotelLocal[]>(loadHotelesLS);
  const [editing, setEditing] = useState<HotelLocal | null>(null);

  const persist = (next: HotelLocal[]) => { saveHotelesLS(next); setItems(next); onChanged(); };

  const handleSave = (h: HotelLocal) => {
    const exists = items.some(x => x.id === h.id);
    persist(exists ? items.map(x => x.id === h.id ? h : x) : [h, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este hotel?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = apiHoteles.filter(h => !existing.has(h.id));
    if (!toImport.length) { alert("Todos los hoteles del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} hoteles desde el tarifario?`)) return;
    persist([...toImport.map(hotelFromApi), ...items]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {apiHoteles.length > 0 && (
            <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Importar del tarifario ({apiHoteles.length})
            </button>
          )}
        </div>
        <button onClick={() => setEditing(newHotelLocal())} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo hotel
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<HotelIcon className="w-8 h-8 text-emerald-400" />} msg="Sin hoteles locales" onNew={() => setEditing(newHotelLocal())} newLabel="Crear hotel" />
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Nombre</Th><Th>Categoría</Th><Th>Ubicación</Th><Th>Régimen</Th>
                <Th align="right">DBL</Th><Th align="right">SGL</Th><Th align="right">TPL</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map(h => (
                <tr key={h.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!h.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate">{h.nombre || <span className="italic text-slate-400">Sin nombre</span>}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{h.estrellas}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[130px] truncate">{h.ubicacion}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{h.desayuno}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.DBL)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.SGL)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(h.precios.TPL)}</td>
                  <td className="px-4 py-3"><StatusPill activo={h.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(h)} onDuplicate={() => persist([duplicarHotel(h), ...items])} onToggle={() => handleToggle(h.id)} activo={h.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.createdAt === editing.updatedAt && !items.some(x => x.id === editing.id) ? "Nuevo hotel" : "Editar hotel"} onClose={() => setEditing(null)}>
          <HotelForm hotel={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 mr-2 transition-colors">Cancelar</button>
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HotelForm({ hotel: h, onChange }: { hotel: HotelLocal; onChange: (h: HotelLocal) => void }) {
  const set = (patch: Partial<HotelLocal>) => onChange({ ...h, ...patch });
  const setP = (k: keyof typeof h.precios, v: number) => onChange({ ...h, precios: { ...h.precios, [k]: v } });
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Nombre del hotel</label>
        <input value={h.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej: Hotel Marriott Panama" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Categoría / Estrellas</label>
          <select value={h.estrellas} onChange={e => set({ estrellas: e.target.value, categoria: e.target.value })} className={selectCls}>
            {ESTRELLAS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Régimen (desayuno)</label>
          <select value={h.desayuno} onChange={e => set({ desayuno: e.target.value })} className={selectCls}>
            {DESAYUNO_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ubicación</label>
          <select value={h.ubicacion} onChange={e => set({ ubicacion: e.target.value })} className={selectCls}>
            {UBICACION_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipo habitación</label>
          <input value={h.tipoHabitacion} onChange={e => set({ tipoHabitacion: e.target.value })} placeholder="Estándar" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Vigencia</label>
        <input value={h.vigencia} onChange={e => set({ vigencia: e.target.value })} placeholder="Ej: Ene–Dic 2026" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Tarifas por noche (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {(["SGL", "DBL", "TPL", "CHD"] as const).map(k => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{k}</div>
              <input type="number" min={0} step={0.01} value={h.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !h.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${h.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${h.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TOURS TAB
══════════════════════════════════════════════════════ */

function ToursTab({ apiTours, onChanged }: { apiTours: Tour[]; onChanged: () => void }) {
  const [items, setItems] = useState<TourLocal[]>(loadToursLS);
  const [editing, setEditing] = useState<TourLocal | null>(null);

  const persist = (next: TourLocal[]) => { saveToursLS(next); setItems(next); onChanged(); };

  const handleSave = (t: TourLocal) => {
    const exists = items.some(x => x.id === t.id);
    persist(exists ? items.map(x => x.id === t.id ? t : x) : [t, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este tour?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = apiTours.filter(t => !existing.has(t.id));
    if (!toImport.length) { alert("Todos los tours del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} tours desde el tarifario?`)) return;
    persist([...toImport.map(tourFromApi), ...items]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {apiTours.length > 0 && (
            <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Importar del tarifario ({apiTours.length})
            </button>
          )}
        </div>
        <button onClick={() => setEditing(newTourLocal())} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo tour
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<MapPin className="w-8 h-8 text-purple-400" />} msg="Sin tours locales" onNew={() => setEditing(newTourLocal())} newLabel="Crear tour" />
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Código</Th><Th>Nombre</Th><Th>Tipo servicio</Th>
                <Th align="right">2-5 pax</Th><Th align="right">1 pax</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!t.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{t.nombre || <span className="italic text-slate-400">Sin nombre</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.tipoServicio === "Privado" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                      {t.tipoServicio ?? "Regular"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p2_5)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p1)}</td>
                  <td className="px-4 py-3"><StatusPill activo={t.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(t)} onDuplicate={() => persist([duplicarTour(t), ...items])} onToggle={() => handleToggle(t.id)} activo={t.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={!items.some(x => x.id === editing.id) ? "Nuevo tour" : "Editar tour"} onClose={() => setEditing(null)}>
          <TourForm tour={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 mr-2 transition-colors">Cancelar</button>
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TourForm({ tour: t, onChange }: { tour: TourLocal; onChange: (t: TourLocal) => void }) {
  const set = (patch: Partial<TourLocal>) => onChange({ ...t, ...patch });
  const setP = (k: keyof typeof t.precios, v: number) => {
    const precios = { ...t.precios, [k]: v };
    onChange({ ...t, precios, precio_por_persona: precios.p2_5 });
  };
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
        El <strong>Código RGE</strong> vincula el tour con su descriptivo. Si editas un tour del tarifario, usa su código original (ej: RGE-020).
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Código RGE (ID)</label>
          <input value={t.id} onChange={e => set({ id: e.target.value.toUpperCase() })} placeholder="RGE-020" className={inputCls + " font-mono"} />
        </div>
        <div>
          <label className={labelCls}>Tipo servicio</label>
          <select value={t.tipoServicio ?? "Regular"} onChange={e => set({ tipoServicio: e.target.value as "Regular" | "Privado" })} className={selectCls}>
            <option value="Regular">Regular</option>
            <option value="Privado">Privado</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Nombre del tour</label>
        <input value={t.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Ej: City Tour & Canal de Panamá" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Categoría</label>
          <input value={t.categoria} onChange={e => set({ categoria: e.target.value })} placeholder="Ej: City Tour" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Horario</label>
          <input value={t.horario} onChange={e => set({ horario: e.target.value })} placeholder="Ej: Lun–Sab · 08:00am · 5h" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tarifas por persona (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {([["p1", "1 pax"], ["p2_5", "2–5 pax"], ["p6_10", "6–10 pax"], ["chd", "Niño"]] as const).map(([k, lbl]) => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{lbl}</div>
              <input type="number" min={0} step={0.01} value={t.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !t.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${t.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${t.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TRASLADOS TAB
══════════════════════════════════════════════════════ */

function TrasladosTab({ apiTraslados, onChanged }: { apiTraslados: Traslado[]; onChanged: () => void }) {
  const [items, setItems] = useState<TrasladoLocal[]>(loadTrasladosLS);
  const [editing, setEditing] = useState<TrasladoLocal | null>(null);

  const persist = (next: TrasladoLocal[]) => { saveTrasladosLS(next); setItems(next); onChanged(); };

  const handleSave = (t: TrasladoLocal) => {
    const exists = items.some(x => x.id === t.id);
    persist(exists ? items.map(x => x.id === t.id ? t : x) : [t, ...items]);
    setEditing(null);
  };
  const handleDelete = (id: string) => { if (!confirm("¿Eliminar este traslado?")) return; persist(items.filter(x => x.id !== id)); };
  const handleToggle = (id: string) => persist(items.map(x => x.id === id ? { ...x, activo: !x.activo, updatedAt: new Date().toISOString() } : x));
  const handleImport = () => {
    const existing = new Set(items.map(x => x.id));
    const toImport = apiTraslados.filter(t => !existing.has(t.id));
    if (!toImport.length) { alert("Todos los traslados del tarifario ya están en la lista."); return; }
    if (!confirm(`¿Importar ${toImport.length} traslados desde el tarifario?`)) return;
    persist([...toImport.map(trasladoFromApi), ...items]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {apiTraslados.length > 0 && (
            <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Importar del tarifario ({apiTraslados.length})
            </button>
          )}
        </div>
        <button onClick={() => setEditing(newTrasladoLocal())} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo traslado
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Bus className="w-8 h-8 text-orange-400" />} msg="Sin traslados locales" onNew={() => setEditing(newTrasladoLocal())} newLabel="Crear traslado" />
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <Th>Ruta</Th><Th>Modalidad</Th>
                <Th align="right">2-5 pax</Th><Th align="right">1 pax</Th>
                <Th>Estado</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${!t.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[220px] truncate">{t.nombre || <span className="italic text-slate-400">Sin nombre</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.tipo === "Privado" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                      {t.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p2_5)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{fmt(t.precios.p1)}</td>
                  <td className="px-4 py-3"><StatusPill activo={t.activo} /></td>
                  <td className="px-4 py-3">
                    <RowActions onEdit={() => setEditing(t)} onDuplicate={() => persist([duplicarTraslado(t), ...items])} onToggle={() => handleToggle(t.id)} activo={t.activo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={!items.some(x => x.id === editing.id) ? "Nuevo traslado" : "Editar traslado"} onClose={() => setEditing(null)}>
          <TrasladoForm traslado={editing} onChange={setEditing} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {items.some(x => x.id === editing.id) && (
              <button onClick={() => { handleDelete(editing.id); setEditing(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 mr-2 transition-colors">Cancelar</button>
            <button onClick={() => handleSave({ ...editing, updatedAt: new Date().toISOString() })} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TrasladoForm({ traslado: t, onChange }: { traslado: TrasladoLocal; onChange: (t: TrasladoLocal) => void }) {
  const set = (patch: Partial<TrasladoLocal>) => onChange({ ...t, ...patch });
  const setP = (k: keyof typeof t.precios, v: number) => {
    const precios = { ...t.precios, [k]: v };
    onChange({ ...t, precios, precio_por_persona: precios.p2_5 });
  };
  const num = (val: string) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ruta origen</label>
          <input value={t.rutaOrigen ?? ""} onChange={e => set({ rutaOrigen: e.target.value, nombre: `${e.target.value} → ${t.rutaDestino ?? ""}`.trim() })} placeholder="Ej: Aeropuerto Tocumen" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ruta destino</label>
          <input value={t.rutaDestino ?? ""} onChange={e => set({ rutaDestino: e.target.value, nombre: `${t.rutaOrigen ?? ""} → ${e.target.value}`.trim() })} placeholder="Ej: Hotel Centro" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nombre / Descripción ruta</label>
        <input value={t.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Se genera automáticamente desde Origen → Destino" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Modalidad</label>
          <select value={t.tipo} onChange={e => set({ tipo: e.target.value as "Regular" | "Privado" })} className={selectCls}>
            <option value="Regular">Regular</option>
            <option value="Privado">Privado</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Categoría</label>
          <input value={t.categoria} onChange={e => set({ categoria: e.target.value })} placeholder="Ej: Aeropuerto" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Tarifas por persona (USD)</label>
        <div className="grid grid-cols-4 gap-2">
          {([["p1", "1 pax"], ["p2_5", "2–5 pax"], ["p6_10", "6–10 pax"], ["chd", "Niño"]] as const).map(([k, lbl]) => (
            <div key={k}>
              <div className="text-[10px] text-center text-slate-500 mb-1 font-semibold">{lbl}</div>
              <input type="number" min={0} step={0.01} value={t.precios[k] || ""} onChange={e => setP(k, num(e.target.value))} placeholder="0" className={numCls} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600">Activo</label>
        <div onClick={() => set({ activo: !t.activo })} className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${t.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
          <div className={`w-4 h-4 rounded-full bg-white mt-0.5 shadow transition-transform ${t.activo ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </div>
    </div>
  );
}

/* ─── Shared helpers ─── */

function Th({ children, align }: { children?: React.ReactNode; align?: "right" | "left" }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function EmptyState({ icon, msg, onNew, newLabel }: { icon: React.ReactNode; msg: string; onNew: () => void; newLabel: string }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">{icon}</div>
      <p className="text-sm font-medium text-slate-600">{msg}</p>
      <p className="text-xs text-slate-400">Los datos del tarifario Excel siguen disponibles en el cotizador.</p>
      <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
        <Plus className="w-4 h-4" />{newLabel}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */

type TarifasTab = "hoteles" | "tours" | "traslados";

interface Props {
  apiHoteles: Hotel[];
  apiTours: Tour[];
  apiTraslados: Traslado[];
  onChanged: () => void;
  onUpload: (file: File) => Promise<void>;
  fileInfo?: CatalogInfo | null;
  onReload?: () => Promise<void>;
  fileInfoBrasil?: CatalogInfo | null;
  onReloadBrasil?: () => Promise<void>;
  onUploadBrasil?: (file: File) => Promise<void>;
}

const TABS: { key: TarifasTab; label: string; icon: React.ReactNode }[] = [
  { key: "hoteles",   label: "Hoteles",   icon: <HotelIcon className="w-3.5 h-3.5" /> },
  { key: "tours",     label: "Tours",     icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: "traslados", label: "Traslados", icon: <Bus className="w-3.5 h-3.5" /> },
];

type ReloadStatus = "idle" | "loading" | "success" | "error";

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

export default function Tarifas({ apiHoteles, apiTours, apiTraslados, onChanged, onUpload, fileInfo, onReload, fileInfoBrasil, onReloadBrasil, onUploadBrasil }: Props) {
  const [tab, setTab] = useState<TarifasTab>("hoteles");
  const [reloadStatus, setReloadStatus] = useState<ReloadStatus>("idle");
  const [reloadStatusBrasil, setReloadStatusBrasil] = useState<ReloadStatus>("idle");

  const lsCounts = useMemo(() => ({
    hoteles: loadHotelesLS().length,
    tours: loadToursLS().length,
    traslados: loadTrasladosLS().length,
  }), []);

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      if (input.files?.[0]) await onUpload(input.files[0]);
    };
    input.click();
  };

  const handleReload = async () => {
    if (!onReload || reloadStatus === "loading") return;
    setReloadStatus("loading");
    try {
      await onReload();
      setReloadStatus("success");
      window.setTimeout(() => setReloadStatus("idle"), 2800);
    } catch {
      setReloadStatus("error");
      window.setTimeout(() => setReloadStatus("idle"), 3500);
    }
  };

  const reloadLabel = { idle: "Recargar tarifario", loading: "Actualizando...", success: "Actualizado", error: "Error al recargar" }[reloadStatus];
  const reloadIcon = reloadStatus === "loading" ? <RefreshCw className="w-4 h-4 animate-spin" /> : reloadStatus === "success" ? <Check className="w-4 h-4" /> : reloadStatus === "error" ? <AlertCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />;
  const reloadCls = reloadStatus === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : reloadStatus === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";

  const handleReloadBrasil = async () => {
    if (!onReloadBrasil || reloadStatusBrasil === "loading") return;
    setReloadStatusBrasil("loading");
    try {
      await onReloadBrasil();
      setReloadStatusBrasil("success");
      window.setTimeout(() => setReloadStatusBrasil("idle"), 2800);
    } catch {
      setReloadStatusBrasil("error");
      window.setTimeout(() => setReloadStatusBrasil("idle"), 3500);
    }
  };

  const handleUploadBrasilClick = () => {
    if (!onUploadBrasil) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      if (input.files?.[0]) await onUploadBrasil(input.files[0]);
    };
    input.click();
  };

  const reloadLabelBrasil = { idle: "Recargar tarifario", loading: "Actualizando...", success: "Actualizado", error: "Error al recargar" }[reloadStatusBrasil];
  const reloadIconBrasil = reloadStatusBrasil === "loading" ? <RefreshCw className="w-4 h-4 animate-spin" /> : reloadStatusBrasil === "success" ? <Check className="w-4 h-4" /> : reloadStatusBrasil === "error" ? <AlertCircle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />;
  const reloadClsBrasil = reloadStatusBrasil === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : reloadStatusBrasil === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestión de tarifas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tarifas locales con prioridad sobre el Excel · El tarifario Excel sigue como respaldo
          </p>
        </div>
        <button onClick={exportarRespaldo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Exportar respaldo
        </button>
      </div>

      {/* Info-only tarifario cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Tarifario General</p>
              <p className="text-sm font-medium text-slate-800 truncate">{fileInfo?.filename ?? "TARIFARIO.xlsx"}</p>
              <p className="text-xs text-slate-400 mt-0.5">Cargado {formatRelativeTime(fileInfo?.loadedAt)}</p>
              {fileInfo?.counts && (
                <p className="text-xs text-slate-400 mt-0.5">{fileInfo.counts.hoteles} hoteles · {fileInfo.counts.tours} tours · {fileInfo.counts.traslados} traslados</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-0.5">Tarifario Brasil</p>
              <p className="text-sm font-medium text-slate-800 truncate">{fileInfoBrasil?.filename ?? "TARIFARIO_BRASIL.xlsx"}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {fileInfoBrasil?.counts && fileInfoBrasil.counts.hoteles > 0
                  ? `Cargado ${formatRelativeTime(fileInfoBrasil.loadedAt)}`
                  : "Sin archivo cargado"}
              </p>
              {fileInfoBrasil?.counts && fileInfoBrasil.counts.hoteles > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">{fileInfoBrasil.counts.hoteles} hoteles · {fileInfoBrasil.counts.tours} tours · {fileInfoBrasil.counts.traslados} traslados</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon}
            {label}
            {lsCounts[key] > 0 && (
              <span className="ml-1 text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
                {lsCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "hoteles" && <HotelesTab apiHoteles={apiHoteles} onChanged={onChanged} />}
      {tab === "tours" && <ToursTab apiTours={apiTours} onChanged={onChanged} />}
      {tab === "traslados" && <TrasladosTab apiTraslados={apiTraslados} onChanged={onChanged} />}

      {/* Herramientas de Tarifario */}
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Herramientas de Tarifario</p>
          <p className="text-xs text-slate-400 mt-0.5">Acciones administrativas para reemplazar o recargar los archivos Excel.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* General */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">General</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleReload}
                disabled={reloadStatus === "loading" || !onReload}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${reloadCls}`}
              >
                {reloadIcon}
                {reloadLabel}
              </button>
              <button
                onClick={handleUploadClick}
                disabled={reloadStatus === "loading"}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm bg-white hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                Reemplazar / Subir nuevo
              </button>
            </div>
          </div>

          {/* Brasil */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Brasil</p>
            <div className="flex flex-col gap-2">
              {fileInfoBrasil?.counts && fileInfoBrasil.counts.hoteles > 0 && (
                <button
                  onClick={handleReloadBrasil}
                  disabled={reloadStatusBrasil === "loading" || !onReloadBrasil}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${reloadClsBrasil}`}
                >
                  {reloadIconBrasil}
                  {reloadLabelBrasil}
                </button>
              )}
              <button
                onClick={handleUploadBrasilClick}
                disabled={reloadStatusBrasil === "loading" || !onUploadBrasil}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-white text-sm hover:bg-emerald-50 transition-colors disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {fileInfoBrasil?.counts && fileInfoBrasil.counts.hoteles > 0 ? "Reemplazar / Subir nuevo" : "Subir tarifario Brasil"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
