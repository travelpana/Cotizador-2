import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { buildPropuestaHtml } from "@/lib/propuesta";
import { useMemo } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
}

export default function VistaPreviaModal({
  open,
  onClose,
  cliente,
  servicios,
  result,
  modo,
  incluirItinerario,
  incluirDescriptivos,
}: Props) {
  const html = useMemo(
    () =>
      buildPropuestaHtml({
        cliente,
        servicios,
        result,
        modo,
        incluirItinerario,
        incluirDescriptivos,
      }),
    [cliente, servicios, result, modo, incluirItinerario, incluirDescriptivos],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propuesta de Servicios"
      subtitle="Vista previa idéntica al PDF y correo enviado al cliente"
      size="xl"
    >
      <div className="bg-slate-100 p-4">
        <iframe
          title="Vista previa de propuesta"
          srcDoc={html}
          className="w-full h-[72vh] bg-white rounded-lg shadow-sm border border-slate-200"
        />
      </div>
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
