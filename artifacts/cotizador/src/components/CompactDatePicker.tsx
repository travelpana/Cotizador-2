import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_SHORT = [
  "ENE","FEB","MAR","ABR","MAY","JUN",
  "JUL","AGO","SEP","OCT","NOV","DIC",
];
const DAYS_ES = ["LU","MA","MI","JU","VI","SÁ","DO"];

const CLR_SELECTED = "#1351c1";
const CLR_TEXT     = "#041941";
const CLR_ACCENT   = "#E6AE33";
const CAL_WIDTH    = 260;
const YEAR_START   = 2023;
const YEAR_END     = 2031;

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO(): string {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
function fmtDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  minDate?: string;
  label?: string;
}

export default function CompactDatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  minDate,
}: Props) {
  const today = todayISO();
  const effectiveMin = minDate;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker]   = useState(false);

  const triggerRef  = useRef<HTMLDivElement>(null);
  const calRef      = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  const getInitialView = useCallback(() => {
    const ref = value || today;
    const p = parseISO(ref);
    return { year: p.y, month: p.m };
  }, [value, today]);

  const [viewYear, setViewYear]   = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);

  useEffect(() => {
    if (!open) return;
    const { year, month } = getInitialView();
    setViewYear(year);
    setViewMonth(month);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  }, [open, getInitialView]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      let left = rect.left;
      let top  = rect.bottom + 6;
      if (left + CAL_WIDTH > window.innerWidth - 8) left = window.innerWidth - CAL_WIDTH - 8;
      if (left < 8) left = 8;
      if (top + 340 > window.innerHeight - 8) top = rect.top - 340;
      setPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!calRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const el = yearListRef.current.querySelector("[data-selected='true']") as HTMLElement | null;
      if (el) el.scrollIntoView({ block: "center" });
    }
  }, [showYearPicker]);

  const prevMonth = () => {
    setShowMonthPicker(false); setShowYearPicker(false);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setShowMonthPicker(false); setShowYearPicker(false);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (iso: string) => {
    if (effectiveMin && iso < effectiveMin) return;
    onChange(iso);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const isOpen = open && pos;

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative flex items-center h-8 rounded-lg border bg-white cursor-pointer transition-all select-none ${
          isOpen
            ? "ring-2 ring-[#1351c1]/20 border-[#1351c1]"
            : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-1.5 pl-2.5 flex-1 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className={`text-[12px] font-medium truncate ${value ? "text-slate-800" : "text-slate-400"}`}>
            {value ? fmtDisplay(value) : placeholder}
          </span>
        </div>
        <div className="w-2 mr-1" />
      </div>

      {isOpen && createPortal(
        <div
          ref={calRef}
          onClick={e => e.stopPropagation()}
          style={{
            position:     "fixed",
            top:          pos!.top,
            left:         pos!.left,
            width:        CAL_WIDTH,
            zIndex:       99999,
            background:   "#ffffff",
            borderRadius: 16,
            boxShadow:    "0 20px 60px rgba(0,30,90,0.22), 0 4px 16px rgba(0,0,0,0.10)",
            border:       "1px solid rgba(19,81,193,0.14)",
            padding:      "14px 12px 0",
            userSelect:   "none",
            animation:    "cdp-fadein 0.12s ease",
          }}
        >
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button type="button" onClick={prevMonth} style={navBtn}>
              <ChevronLeft size={13} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {/* Month picker */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowYearPicker(false); setShowMonthPicker(v => !v); }}
                  style={{ fontSize: 12, fontWeight: 700, color: CLR_TEXT, background: showMonthPicker ? "rgba(19,81,193,0.08)" : "transparent", border: "1.5px solid " + (showMonthPicker ? "rgba(19,81,193,0.25)" : "transparent"), borderRadius: 7, padding: "2px 5px", cursor: "pointer", outline: "none" }}
                >
                  {MONTHS_ES[viewMonth]}
                </button>
                {showMonthPicker && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,30,90,0.18)", border: "1px solid rgba(19,81,193,0.14)", padding: "6px", zIndex: 10001, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, width: 156, animation: "cdp-fadein 0.1s ease" }}
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMonth(i); setShowMonthPicker(false); }}
                        style={{ fontSize: 10, fontWeight: i === viewMonth ? 700 : 500, color: i === viewMonth ? "#fff" : CLR_TEXT, background: i === viewMonth ? CLR_SELECTED : "transparent", border: "1.5px solid " + (i === viewMonth ? CLR_SELECTED : "transparent"), borderRadius: 6, padding: "4px 0", cursor: "pointer", outline: "none", textAlign: "center" }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year picker */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMonthPicker(false); setShowYearPicker(v => !v); }}
                  style={{ fontSize: 12, fontWeight: 700, color: CLR_TEXT, background: showYearPicker ? "rgba(19,81,193,0.08)" : "transparent", border: "1.5px solid " + (showYearPicker ? "rgba(19,81,193,0.25)" : "transparent"), borderRadius: 7, padding: "2px 5px", cursor: "pointer", outline: "none" }}
                >
                  {viewYear}
                </button>
                {showYearPicker && (
                  <div
                    ref={yearListRef}
                    onClick={e => e.stopPropagation()}
                    style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,30,90,0.18)", border: "1px solid rgba(19,81,193,0.14)", padding: "5px 3px", zIndex: 10001, width: 80, maxHeight: 140, overflowY: "auto", animation: "cdp-fadein 0.1s ease" }}
                  >
                    {Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i).map(yr => (
                      <button
                        key={yr}
                        type="button"
                        data-selected={yr === viewYear ? "true" : "false"}
                        onClick={() => { setViewYear(yr); setShowYearPicker(false); }}
                        style={{ display: "block", width: "100%", fontSize: 11, fontWeight: yr === viewYear ? 700 : 500, color: yr === viewYear ? "#fff" : CLR_TEXT, background: yr === viewYear ? CLR_SELECTED : "transparent", border: "none", borderRadius: 6, padding: "4px 0", cursor: "pointer", outline: "none", textAlign: "center" }}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={nextMonth} style={navBtn}>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 8, fontWeight: 700, color: "#94a3b8", paddingBottom: 4, letterSpacing: "0.06em" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`e${i}`} style={{ height: 32 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isToday    = iso === today;
              const isDisabled = !!(effectiveMin && iso < effectiveMin);

              return (
                <div key={iso} style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => !isDisabled && handleDayClick(iso)}
                    disabled={isDisabled}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 400,
                      color:  isDisabled ? "#d1d5db" : isSelected ? "#fff" : isToday ? CLR_ACCENT : CLR_TEXT,
                      background: isSelected ? CLR_SELECTED : "transparent",
                      border: isToday && !isSelected ? `1.5px solid ${CLR_ACCENT}` : "1.5px solid transparent",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      outline: "none",
                      transition: "background 0.1s, color 0.1s",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 10, padding: "8px 0 10px", display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              style={{ fontSize: 11, fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", outline: "none" }}
            >
              Quitar fecha
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: CLR_SELECTED, border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer", outline: "none" }}
            >
              Listo
            </button>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes cdp-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

const navBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 7,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "#f8fafc", border: "1px solid #e2e8f0",
  cursor: "pointer", color: CLR_TEXT, outline: "none",
};
