import type {
  Acomodacion,
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "./types";

function tieredPrice(
  precios: { p1?: number; p2_5?: number; p6_10?: number },
  pasajeros: number,
): number {
  const p1 = precios.p1 ?? 0;
  const p25 = precios.p2_5 ?? 0;
  const p610 = precios.p6_10 ?? 0;
  if (pasajeros <= 1) return p1 || p25;
  if (pasajeros <= 5) return p25;
  if (pasajeros <= 10) return p610 || p25;
  return p610 || p25;
}

export function diffNoches(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function calcularLocal(
  servicios: ServicioSeleccionado[],
  acomodaciones: Acomodacion[],
  cliente: Cliente,
): CotizacionResult {
  const acoms = acomodaciones.length > 0 ? acomodaciones : (["DBL"] as Acomodacion[]);
  const noches = Math.max(0, cliente.noches || 0);
  const pasajeros = Math.max(1, cliente.pasajeros || 1);
  const ninos = Math.max(0, cliente.ninos || 0);

  const out = [] as CotizacionResult["servicios"];

  for (const s of servicios) {
    const preciosPorAcom: Record<Acomodacion, number> = { SGL: 0, DBL: 0, TPL: 0, CHD: 0 };
    const totalesPorAcom: Record<Acomodacion, number> = { SGL: 0, DBL: 0, TPL: 0, CHD: 0 };

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
      const unit = tieredPrice(s.precios, pasajeros);
      const chdUnit = s.precios.chd ?? 0;
      preciosPorAcom.SGL = unit;
      preciosPorAcom.DBL = unit;
      preciosPorAcom.TPL = unit;
      preciosPorAcom.CHD = chdUnit;
      for (const a of acoms) {
        totalesPorAcom[a] = unit * pasajeros + chdUnit * ninos;
      }
      out.push({
        id: s.id,
        tipo: s.tipo,
        nombre: s.nombre,
        preciosPorAcomodacion: preciosPorAcom,
        totalesPorAcomodacion: totalesPorAcom,
        detalle: `${pasajeros} pax${ninos ? ` + ${ninos} niños` : ""}`,
      });
    }
  }

  const totales: Record<Acomodacion, number> = { SGL: 0, DBL: 0, TPL: 0, CHD: 0 };
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
