import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
  Tier,
} from "./types";

export function pickTier(pasajeros: number): Tier {
  if (pasajeros <= 1) return "p1";
  if (pasajeros <= 5) return "p2_5";
  return "p6_10";
}

export function tierLabel(t: Tier): string {
  if (t === "p1") return "1 pax";
  if (t === "p2_5") return "2-5 pax";
  return "6-10 pax";
}

export function priceForTier(
  precios: { p1?: number; p2_5?: number; p6_10?: number },
  tier: Tier,
): number {
  return precios[tier] ?? 0;
}

export function diffNoches(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function addDays(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function calcularLocal(
  servicios: ServicioSeleccionado[],
  acomodaciones: Acomodacion[],
  cliente: Cliente,
): CotizacionResult {
  const acoms =
    acomodaciones.length > 0 ? acomodaciones : (["DBL"] as Acomodacion[]);
  const noches = Math.max(0, cliente.noches || 0);
  const pasajeros = Math.max(1, cliente.pasajeros || 1);
  const ninos = Math.max(0, cliente.ninos || 0);

  const out = [] as CotizacionResult["servicios"];

  for (const s of servicios) {
    const preciosPorAcom: Record<Acomodacion, number> = {
      SGL: 0,
      DBL: 0,
      TPL: 0,
      CHD: 0,
    };
    const totalesPorAcom: Record<Acomodacion, number> = {
      SGL: 0,
      DBL: 0,
      TPL: 0,
      CHD: 0,
    };

    if (s.tipo === "hotel") {
      preciosPorAcom.SGL = s.precios.SGL ?? 0;
      preciosPorAcom.DBL = s.precios.DBL ?? 0;
      preciosPorAcom.TPL = s.precios.TPL ?? 0;
      preciosPorAcom.CHD = s.precios.CHD ?? 0;
      for (const a of acoms) {
        totalesPorAcom[a] = preciosPorAcom[a] * noches * pasajeros;
      }
      out.push({
        id: s.id,
        tipo: "hotel",
        nombre: s.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${noches} noches × ${pasajeros} pax`,
      });
    } else {
      const tier = s.tarifaOverride ?? pickTier(pasajeros);
      const unit = priceForTier(s.precios, tier);
      const chdUnit = s.precios.chd ?? 0;
      preciosPorAcom.SGL = unit;
      preciosPorAcom.DBL = unit;
      preciosPorAcom.TPL = unit;
      preciosPorAcom.CHD = chdUnit;
      const totalUnit = unit * pasajeros + chdUnit * ninos;
      for (const a of acoms) {
        totalesPorAcom[a] = totalUnit;
      }
      out.push({
        id: s.id,
        tipo: s.tipo,
        nombre: s.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${pasajeros} pax (${tierLabel(tier)})${ninos ? ` + ${ninos} niños` : ""}`,
        tierAplicado: tier,
        unitAplicado: unit,
      });
    }
  }

  const totales: Record<Acomodacion, number> = {
    SGL: 0,
    DBL: 0,
    TPL: 0,
    CHD: 0,
  };
  for (const sv of out) {
    for (const a of acoms) {
      totales[a] += sv.totalesPorAcomodacion[a];
    }
  }

  return {
    servicios: out,
    totalesPorAcomodacion: totales,
    acomodaciones: acoms,
    noches,
    pasajeros,
    ninos,
  };
}
