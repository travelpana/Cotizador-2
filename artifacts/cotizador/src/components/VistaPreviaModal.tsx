import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { buildPropuestaBody, buildPropuestaData } from "@/lib/propuesta";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
  actividadesOverride: Record<number, string>;
  onActividadesOverrideChange: (
    next: Record<number, string>,
  ) => void;
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
  actividadesOverride,
  onActividadesOverrideChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overrideRef = useRef(actividadesOverride);
  overrideRef.current = actividadesOverride;
  const onChangeRef = useRef(onActividadesOverrideChange);
  onChangeRef.current = onActividadesOverrideChange;

  const data = useMemo(
    () =>
      buildPropuestaData({
        cliente,
        servicios,
        result,
        modo,
        incluirItinerario,
        incluirDescriptivos,
        actividadesOverride,
        editable: true,
      }),
    [
      cliente,
      servicios,
      result,
      modo,
      incluirItinerario,
      incluirDescriptivos,
      actividadesOverride,
    ],
  );

  const bodyHtml = useMemo(() => buildPropuestaBody(data), [data]);

  useEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;

    const findCell = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null;
      const el = target.closest<HTMLElement>("[data-edit-actividad]");
      return el ?? null;
    };

    const handleBlur = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      const dia = Number(el.getAttribute("data-edit-actividad"));
      if (!Number.isFinite(dia)) return;
      const newText = (el.textContent ?? "").trim();
      const current = overrideRef.current ?? {};
      if ((current[dia] ?? null) === newText) return;
      const next = { ...current };
      if (newText) next[dia] = newText;
      else delete next[dia];
      onChangeRef.current(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      el.style.background = "#fff7ed";
      el.style.boxShadow = "0 0 0 2px #f97316";
    };

    const handleBlurStyle = (e: FocusEvent) => {
      const el = findCell(e.target);
      if (!el) return;
      el.style.background = "";
      el.style.boxShadow = "";
    };

    root.addEventListener("focusout", handleBlur, true);
    root.addEventListener("focusout", handleBlurStyle, true);
    root.addEventListener("focusin", handleFocus, true);
    root.addEventListener("keydown", handleKeyDown);
    return () => {
      root.removeEventListener("focusout", handleBlur, true);
      root.removeEventListener("focusout", handleBlurStyle, true);
      root.removeEventListener("focusin", handleFocus, true);
      root.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, bodyHtml]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Propuesta de Servicios"
      subtitle="Vista previa idéntica al PDF y correo · El itinerario es editable"
      size="xl"
    >
      <div className="bg-slate-100 p-4 max-h-[72vh] overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <div
            ref={containerRef}
            className="propuesta-preview"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
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
