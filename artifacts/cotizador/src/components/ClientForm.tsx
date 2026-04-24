import type { Cliente } from "@/lib/types";
import { diffNoches } from "@/lib/calc";

interface Props {
  cliente: Cliente;
  onChange: (c: Cliente) => void;
}

export default function ClientForm({ cliente, onChange }: Props) {
  const update = (patch: Partial<Cliente>) => {
    const next = { ...cliente, ...patch };
    if (patch.fechaInicio || patch.fechaFin) {
      next.noches = diffNoches(next.fechaInicio, next.fechaFin) || next.noches;
    }
    onChange(next);
  };

  return (
    <div className="card-white p-6">
      <h2 className="text-lg font-semibold mb-4">Datos del cliente</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nombre del cliente
          </label>
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => update({ nombre: e.target.value })}
            placeholder="Ej: Familia Pérez"
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha inicio
          </label>
          <input
            type="date"
            value={cliente.fechaInicio}
            onChange={(e) => update({ fechaInicio: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fecha fin
          </label>
          <input
            type="date"
            value={cliente.fechaFin}
            onChange={(e) => update({ fechaFin: e.target.value })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Pasajeros (adultos)
          </label>
          <input
            type="number"
            min={1}
            value={cliente.pasajeros}
            onChange={(e) => update({ pasajeros: Number(e.target.value) || 1 })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Niños (4-10)
          </label>
          <input
            type="number"
            min={0}
            value={cliente.ninos}
            onChange={(e) => update({ ninos: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Noches
          </label>
          <input
            type="number"
            min={0}
            value={cliente.noches}
            onChange={(e) => update({ noches: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}
