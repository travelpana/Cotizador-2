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

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholderStart = "Llegada",
  placeholderEnd = "Salida",
  showNights = true,
  error = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    fpRef.current = flatpickr(inputRef.current, {
      mode: "range",
      dateFormat: "Y-m-d",
      showMonths: 2,
      minDate: undefined,
      disableMobile: true,
      defaultDate: [startDate, endDate].filter(Boolean) as string[],
      onChange(selectedDates) {
        const [s, e] = selectedDates;
        if (s && e) {
          const toISO = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const start = toISO(s);
          const end = toISO(e);
          onChange(start, end);
        } else if (s && !e) {
          const toISO = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    const toISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const currentStart = current[0] ? toISO(current[0]) : "";
    const currentEnd = current[1] ? toISO(current[1]) : "";
    if (currentStart !== startDate || currentEnd !== endDate) {
      const dates = [startDate, endDate].filter(Boolean) as string[];
      fpRef.current.setDate(dates, false);
    }
  }, [startDate, endDate]);

  const nights = showNights ? diffNoches(startDate, endDate) : 0;
  const hasRange = startDate && endDate;
  const ringCls = error
    ? "ring-2 ring-red-300 border-red-400"
    : "ring-0 border-slate-200 focus-within:ring-2 focus-within:ring-[#2f4ea2]/25 focus-within:border-[#2f4ea2]";

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    fpRef.current?.clear();
    onChange("", "");
  };

  return (
    <>
      <style>{CALENDAR_CSS}</style>
      <div
        className={`relative flex items-center gap-0 h-10 rounded-xl border bg-white cursor-pointer transition-all ${ringCls}`}
        onClick={() => fpRef.current?.open()}
      >
        <div className="flex items-center gap-2 pl-3 flex-1 min-w-0">
          <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span
              className={`font-medium truncate ${startDate ? "text-slate-900" : "text-slate-400"}`}
            >
              {startDate ? fmtDisplay(startDate) : placeholderStart}
            </span>
            <span className="text-slate-300 flex-shrink-0">→</span>
            <span
              className={`font-medium truncate ${endDate ? "text-slate-900" : "text-slate-400"}`}
            >
              {endDate ? fmtDisplay(endDate) : placeholderEnd}
            </span>
          </div>
        </div>
        {showNights && hasRange && nights > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-[#2f4ea2]/10 text-[#2f4ea2] text-[10px] font-bold flex-shrink-0 mr-1">
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
          aria-label="Seleccionar fechas"
        />
      </div>
    </>
  );
}

const CALENDAR_CSS = `
.rge-fp-calendar {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
  background: #ffffff !important;
  border: 0 !important;
  border-radius: 18px !important;
  box-shadow: 0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08) !important;
  padding: 16px !important;
}

.rge-fp-calendar .flatpickr-months {
  padding: 0 0 10px !important;
}

.rge-fp-calendar .flatpickr-month {
  background: transparent !important;
  color: #1e293b !important;
  height: 36px !important;
}

.rge-fp-calendar .flatpickr-current-month {
  color: #1e293b !important;
  font-weight: 700 !important;
  font-size: 15px !important;
  padding-top: 6px !important;
}

.rge-fp-calendar .flatpickr-current-month .numInputWrapper span {
  border-color: rgba(0,0,0,0.08) !important;
}

.rge-fp-calendar .flatpickr-prev-month,
.rge-fp-calendar .flatpickr-next-month {
  color: #64748b !important;
  fill: #64748b !important;
  padding: 8px !important;
  border-radius: 10px !important;
  top: 4px !important;
}

.rge-fp-calendar .flatpickr-prev-month:hover,
.rge-fp-calendar .flatpickr-next-month:hover {
  background: #f1f5f9 !important;
  color: #1e293b !important;
  fill: #1e293b !important;
}

.rge-fp-calendar .flatpickr-weekdays {
  background: transparent !important;
}

.rge-fp-calendar .flatpickr-weekday {
  color: #94a3b8 !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  background: transparent !important;
}

.rge-fp-calendar .flatpickr-day {
  color: #1e293b !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 10px !important;
  border: none !important;
  height: 38px !important;
  line-height: 38px !important;
  max-width: 38px !important;
}

.rge-fp-calendar .flatpickr-day:hover:not(.selected):not(.startRange):not(.endRange):not(.inRange) {
  background: #f1f5f9 !important;
  color: #1e293b !important;
}

.rge-fp-calendar .flatpickr-day.today {
  border: 2px solid #2f4ea2 !important;
  font-weight: 700 !important;
  color: #2f4ea2 !important;
}

.rge-fp-calendar .flatpickr-day.today.selected,
.rge-fp-calendar .flatpickr-day.today.startRange,
.rge-fp-calendar .flatpickr-day.today.endRange {
  border-color: transparent !important;
  color: #fff !important;
}

.rge-fp-calendar .flatpickr-day.selected,
.rge-fp-calendar .flatpickr-day.startRange,
.rge-fp-calendar .flatpickr-day.endRange {
  background: #2f4ea2 !important;
  color: #ffffff !important;
  border-radius: 10px !important;
  border: none !important;
  font-weight: 700 !important;
}

.rge-fp-calendar .flatpickr-day.startRange {
  border-radius: 10px 0 0 10px !important;
}

.rge-fp-calendar .flatpickr-day.endRange {
  border-radius: 0 10px 10px 0 !important;
}

.rge-fp-calendar .flatpickr-day.startRange.endRange {
  border-radius: 10px !important;
}

.rge-fp-calendar .flatpickr-day.inRange {
  background: #dbeafe !important;
  color: #1e3a8a !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  border: none !important;
}

.rge-fp-calendar .flatpickr-day.flatpickr-disabled,
.rge-fp-calendar .flatpickr-day.prevMonthDay,
.rge-fp-calendar .flatpickr-day.nextMonthDay {
  color: #cbd5e1 !important;
}

.rge-fp-calendar .flatpickr-rContainer {
  display: flex !important;
  gap: 16px !important;
}

.rge-fp-calendar .numInputWrapper:hover {
  background: transparent !important;
}
`;
