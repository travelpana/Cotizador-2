import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import { CalendarDays, X } from "lucide-react";

interface Props {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  placeholderStart?: string;
  placeholderEnd?: string;
  showNights?: boolean;
  error?: boolean;
  allowPast?: boolean;
}

function diffNoches(a: string, b: string): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
}

function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholderStart = "Llegada",
  placeholderEnd = "Salida",
  showNights = true,
  error = false,
  allowPast = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      mode: "range",
      dateFormat: "Y-m-d",
      showMonths: 2,
      minDate: allowPast ? undefined : "today",
      disableMobile: true,
      defaultDate: [startDate, endDate].filter(Boolean) as string[],
      onChange(selectedDates) {
        const [s, e] = selectedDates;
        if (s && e) {
          onChange(toISO(s), toISO(e));
        } else if (s && !e) {
          const next = new Date(s);
          next.setDate(next.getDate() + 1);
          onChange(toISO(s), "");
          fpRef.current?.setDate([s, next], false);
        }
      },
      onReady(_d, _s, fp) {
        fp.calendarContainer.classList.add("rge-fp-calendar");
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!fpRef.current) return;
    const current = fpRef.current.selectedDates;
    const currentStart = current[0] ? toISO(current[0]) : "";
    const currentEnd = current[1] ? toISO(current[1]) : "";
    if (currentStart !== startDate || currentEnd !== endDate) {
      fpRef.current.setDate([startDate, endDate].filter(Boolean) as string[], false);
    }
  }, [startDate, endDate]);

  const nights = showNights ? diffNoches(startDate, endDate) : 0;
  const hasRange = startDate && endDate;
  const ringCls = error
    ? "ring-2 ring-red-300 border-red-400"
    : "border-slate-200 focus-within:ring-2 focus-within:ring-[#2563eb]/30 focus-within:border-[#2563eb]";

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    fpRef.current?.clear();
    onChange("", "");
  };

  return (
    <div
      className={`relative flex items-center h-10 rounded-xl border bg-white cursor-pointer transition-all ${ringCls}`}
      onClick={() => fpRef.current?.open()}
    >
      <div className="flex items-center gap-2 pl-3 flex-1 min-w-0">
        <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className={`font-medium truncate ${startDate ? "text-slate-900" : "text-slate-400"}`}>
            {startDate ? fmtDisplay(startDate) : placeholderStart}
          </span>
          <span className="text-slate-300 flex-shrink-0">→</span>
          <span className={`font-medium truncate ${endDate ? "text-slate-900" : "text-slate-400"}`}>
            {endDate ? fmtDisplay(endDate) : placeholderEnd}
          </span>
        </div>
      </div>
      {showNights && hasRange && nights > 0 && (
        <span className="ml-1 px-2 py-0.5 rounded-full bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-bold flex-shrink-0 mr-1">
          {nights} noche{nights !== 1 ? "s" : ""}
        </span>
      )}
      {hasRange ? (
        <button
          type="button"
          onClick={clear}
          className="p-1.5 mr-1 text-slate-400 hover:text-slate-700 flex-shrink-0 rounded-lg hover:bg-slate-100"
          aria-label="Limpiar fechas"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="w-2 mr-2" />
      )}
      <input
        ref={inputRef}
        type="text"
        readOnly
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        aria-label="Seleccionar rango de fechas"
      />
    </div>
  );
}
