import { useMemo } from "react";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Archive,
  FileText,
  BarChart2,
  CalendarCheck,
  Building2,
  User,
  MapPin,
  Clock,
  Percent,
} from "lucide-react";
import type { CotizacionGuardada, Opportunity } from "./Guardadas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  // Ventas
  ventasHoy: number;
  ventasHoyCount: number;
  ventasMes: number;
  ventasMesCount: number;
  // Cotizaciones
  cotizacionesCreadas: number;
  cotizacionesActivas: number;
  cotizacionesArchivadas: number;
  cotizacionesConfirmadas: number;
  cotizacionesAnuladas: number;
  // Ratios
  conversionPct: number;
  // Rankings
  proximasAcciones: Array<{ id: string; quoteName: string; agencyName: string; proximaAccion: string; recordatorio?: string }>;
  agenciasMasVentas: Array<{ nombre: string; total: number; count: number }>;
  agentesMasVentas: Array<{ nombre: string; total: number; count: number }>;
  destinosMasVendidos: Array<{ destino: string; count: number; total: number }>;
}

// ─── Compute stats ────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeDashboardStats(
  guardadas: CotizacionGuardada[],
  opportunities: Opportunity[],
): DashboardStats {
  const today = startOfToday();
  const monthStart = startOfMonth();

  // ── Ventas (confirmed opportunities) ────────────────────────────────────────
  const confirmed = opportunities.filter((o) => o.status === "confirmada");
  const ventasHoy = confirmed.reduce((sum, o) => {
    const d = new Date(o.lastUpdateAt ?? o.updatedAt ?? o.createdAt);
    if (d >= today) return sum + (o.totalLatest ?? 0);
    return sum;
  }, 0);
  const ventasHoyCount = confirmed.filter((o) => {
    const d = new Date(o.lastUpdateAt ?? o.updatedAt ?? o.createdAt);
    return d >= today;
  }).length;
  const ventasMes = confirmed.reduce((sum, o) => {
    const d = new Date(o.lastUpdateAt ?? o.updatedAt ?? o.createdAt);
    if (d >= monthStart) return sum + (o.totalLatest ?? 0);
    return sum;
  }, 0);
  const ventasMesCount = confirmed.filter((o) => {
    const d = new Date(o.lastUpdateAt ?? o.updatedAt ?? o.createdAt);
    return d >= monthStart;
  }).length;

  // ── Cotizaciones counts ──────────────────────────────────────────────────────
  const cotizacionesCreadas = guardadas.length;
  const cotizacionesActivas = opportunities.filter(
    (o) => o.status !== "anulada" && o.status !== "confirmada" && o.status !== "perdida" && o.status !== "archivada"
  ).length;
  const cotizacionesArchivadas = opportunities.filter((o) => o.status === "archivada").length;
  const cotizacionesConfirmadas = confirmed.length;
  const cotizacionesAnuladas = opportunities.filter((o) => o.status === "anulada").length;

  // ── Conversión ──────────────────────────────────────────────────────────────
  const totalOpps = opportunities.filter((o) => o.status !== "archivada").length;
  const conversionPct = totalOpps > 0 ? Math.round((cotizacionesConfirmadas / totalOpps) * 100) : 0;

  // ── Próximas acciones ────────────────────────────────────────────────────────
  const proximasAcciones = opportunities
    .filter((o) => o.status !== "archivada" && o.status !== "anulada" && (o.proximaAccion?.trim() || o.recordatorio))
    .sort((a, b) => {
      const da = a.recordatorio ? new Date(a.recordatorio).getTime() : Infinity;
      const db = b.recordatorio ? new Date(b.recordatorio).getTime() : Infinity;
      return da - db;
    })
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      quoteName: o.quoteName,
      agencyName: o.agencyName,
      proximaAccion: o.proximaAccion ?? "",
      recordatorio: o.recordatorio,
    }));

  // ── Agencias con más ventas ──────────────────────────────────────────────────
  const agencyMap = new Map<string, { total: number; count: number }>();
  for (const o of confirmed) {
    const name = o.agencyName || "Sin agencia";
    const prev = agencyMap.get(name) ?? { total: 0, count: 0 };
    agencyMap.set(name, { total: prev.total + (o.totalLatest ?? 0), count: prev.count + 1 });
  }
  const agenciasMasVentas = [...agencyMap.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Agentes con más ventas ───────────────────────────────────────────────────
  const agentMap = new Map<string, { total: number; count: number }>();
  for (const o of confirmed) {
    const name = o.agentName || "Sin agente";
    const prev = agentMap.get(name) ?? { total: 0, count: 0 };
    agentMap.set(name, { total: prev.total + (o.totalLatest ?? 0), count: prev.count + 1 });
  }
  const agentesMasVentas = [...agentMap.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Destinos más vendidos ────────────────────────────────────────────────────
  const destMap = new Map<string, { count: number; total: number }>();
  for (const o of confirmed) {
    const dest = o.destination || "Sin destino";
    const prev = destMap.get(dest) ?? { count: 0, total: 0 };
    destMap.set(dest, { count: prev.count + 1, total: prev.total + (o.totalLatest ?? 0) });
  }
  const destinosMasVendidos = [...destMap.entries()]
    .map(([destino, v]) => ({ destino, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    ventasHoy,
    ventasHoyCount,
    ventasMes,
    ventasMesCount,
    cotizacionesCreadas,
    cotizacionesActivas,
    cotizacionesArchivadas,
    cotizacionesConfirmadas,
    cotizacionesAnuladas,
    conversionPct,
    proximasAcciones,
    agenciasMasVentas,
    agentesMasVentas,
    destinosMasVendidos,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n === 0) return "US$ 0";
  return `US$ ${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent ? `${accent}18` : "#f1f5f9", color: accent ?? "#64748b" }}
        >
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  items: CotizacionGuardada[];
  opportunities: Opportunity[];
}

export default function Dashboard({ items, opportunities }: Props) {
  const stats = useMemo(
    () => computeDashboardStats(items, opportunities),
    [items, opportunities],
  );

  return (
    <div className="space-y-6">
      {/* ── KPIs row 1: Ventas ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Ventas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Ventas del día"
            value={fmtMoney(stats.ventasHoy)}
            sub={`${stats.ventasHoyCount} confirmación${stats.ventasHoyCount !== 1 ? "es" : ""} hoy`}
            accent="#10b981"
          />
          <KpiCard
            icon={<BarChart2 className="w-4 h-4" />}
            label="Ventas del mes"
            value={fmtMoney(stats.ventasMes)}
            sub={`${stats.ventasMesCount} confirmación${stats.ventasMesCount !== 1 ? "es" : ""} este mes`}
            accent="#004FBB"
          />
          <KpiCard
            icon={<Percent className="w-4 h-4" />}
            label="Conversión"
            value={`${stats.conversionPct}%`}
            sub="Confirmadas / total oportunidades"
            accent="#7c3aed"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Confirmadas"
            value={String(stats.cotizacionesConfirmadas)}
            sub="Oportunidades cerradas"
            accent="#10b981"
          />
        </div>
      </div>

      {/* ── KPIs row 2: Cotizaciones ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Cotizaciones</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<FileText className="w-4 h-4" />}
            label="Creadas (total)"
            value={String(stats.cotizacionesCreadas)}
            sub="Total histórico"
            accent="#0891b2"
          />
          <KpiCard
            icon={<Clock className="w-4 h-4" />}
            label="Activas"
            value={String(stats.cotizacionesActivas)}
            sub="En seguimiento activo"
            accent="#d97706"
          />
          <KpiCard
            icon={<Archive className="w-4 h-4" />}
            label="Archivadas"
            value={String(stats.cotizacionesArchivadas)}
            sub="Sin actividad 30+ días"
            accent="#94a3b8"
          />
          <KpiCard
            icon={<XCircle className="w-4 h-4" />}
            label="Anuladas"
            value={String(stats.cotizacionesAnuladas)}
            sub="Canceladas"
            accent="#ef4444"
          />
        </div>
      </div>

      {/* ── Bottom grid: Rankings + Próximas acciones ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Próximas acciones */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-slate-900">Próximas acciones</span>
          </div>
          {stats.proximasAcciones.length === 0 ? (
            <div className="px-5 py-6 text-xs text-slate-400 text-center">No hay acciones pendientes</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.proximasAcciones.map((a) => (
                <div key={a.id} className="px-5 py-3">
                  <div className="text-sm font-semibold text-slate-800 truncate">{a.quoteName}</div>
                  <div className="text-xs text-slate-400 truncate">{a.agencyName}</div>
                  {a.proximaAccion && <div className="text-xs text-blue-600 mt-0.5 truncate">{a.proximaAccion}</div>}
                  {a.recordatorio && (
                    <div className="text-[11px] text-amber-600 mt-0.5">📅 {a.recordatorio}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agencias con más ventas */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-900">Agencias top</span>
          </div>
          {stats.agenciasMasVentas.length === 0 ? (
            <div className="px-5 py-6 text-xs text-slate-400 text-center">Sin datos de ventas aún</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.agenciasMasVentas.map((a, i) => (
                <div key={a.nombre} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{a.nombre}</div>
                    <div className="text-xs text-slate-400">{a.count} venta{a.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 shrink-0">{fmtMoney(a.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agentes con más ventas */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-bold text-slate-900">Agentes top</span>
          </div>
          {stats.agentesMasVentas.length === 0 ? (
            <div className="px-5 py-6 text-xs text-slate-400 text-center">Sin datos de ventas aún</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.agentesMasVentas.map((a, i) => (
                <div key={a.nombre} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{a.nombre}</div>
                    <div className="text-xs text-slate-400">{a.count} venta{a.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 shrink-0">{fmtMoney(a.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destinos más vendidos */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold text-slate-900">Destinos top</span>
          </div>
          {stats.destinosMasVendidos.length === 0 ? (
            <div className="px-5 py-6 text-xs text-slate-400 text-center">Sin datos de destinos aún</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.destinosMasVendidos.map((d, i) => (
                <div key={d.destino} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{d.destino}</div>
                    <div className="text-xs text-slate-400">{d.count} venta{d.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 shrink-0">{fmtMoney(d.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Coming soon notice */}
      <div className="bg-white/60 rounded-2xl ring-1 ring-slate-100 px-5 py-4 flex items-center gap-3">
        <BarChart2 className="w-5 h-5 text-slate-300 shrink-0" />
        <p className="text-xs text-slate-400">
          Los gráficos e indicadores avanzados se habilitarán en la siguiente versión del Dashboard.
          La estructura de datos ya está lista.
        </p>
      </div>
    </div>
  );
}
