import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const MONTHS_SHORT = [
  "ENE","FEB","MAR","ABR","MAY","JUN",
  "JUL","AGO","SEP","OCT","NOV","DIC",
];
const DAYS_ES = ["LU","MA","MI","JU","VI","SÁ","DO"];

const CLR_SELECTED = "#004FBB";
const CLR_TEXT = "#041941";
const CLR_ACCENT = "#E6AE33";

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO() {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}
function fmtDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

interface Props {
  value: string;
  onChange: (iso: string) => void;
}

export default function FlightDateCalendar({ value, onChange }: Props) {
  const today = todayISO();
  const init = value ? parseISO(value) : parseISO(today);

  const [viewYear, setViewYear] = useState(init.y);
  const [viewMonth, setViewMonth] = useState(init.m);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const YEAR_START = 2023;
  const YEAR_END = 2031;

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

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const navBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 7,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#f8fafc", border: "1px solid #e2e8f0",
    cursor: "pointer", color: CLR_TEXT, outline: "none", flexShrink: 0,
  };

  return (
    <div style={{ background: "#fff", padding: "12px 10px 14px", userSelect: "none", width: 272 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" onClick={prevMonth} style={navBtn}>
          <ChevronLeft size={13} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowYearPicker(false); setShowMonthPicker(v => !v); }}
              style={{ fontSize: 12, fontWeight: 700, color: CLR_TEXT, background: showMonthPicker ? "rgba(0,79,187,0.08)" : "transparent", border: "1.5px solid " + (showMonthPicker ? "rgba(0,79,187,0.25)" : "transparent"), borderRadius: 7, padding: "2px 5px", cursor: "pointer", outline: "none" }}
            >
              {MONTHS_ES[viewMonth]}
            </button>
            {showMonthPicker && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,30,90,0.18), 0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,79,187,0.14)", padding: "6px", zIndex: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, width: 160 }}
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

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMonthPicker(false); setShowYearPicker(v => !v); }}
              style={{ fontSize: 12, fontWeight: 700, color: CLR_TEXT, background: showYearPicker ? "rgba(0,79,187,0.08)" : "transparent", border: "1.5px solid " + (showYearPicker ? "rgba(0,79,187,0.25)" : "transparent"), borderRadius: 7, padding: "2px 5px", cursor: "pointer", outline: "none" }}
            >
              {viewYear}
            </button>
            {showYearPicker && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,30,90,0.18)", border: "1px solid rgba(0,79,187,0.14)", padding: "4px 3px", zIndex: 10, width: 80, maxHeight: 150, overflowY: "auto" }}
              >
                {Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i).map(yr => (
                  <button
                    key={yr}
                    type="button"
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#94a3b8", paddingBottom: 5, letterSpacing: "0.07em" }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} style={{ height: 32 }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = toISO(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === today;
          return (
            <div key={iso} style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => onChange(iso)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? "#fff" : isToday ? CLR_ACCENT : CLR_TEXT,
                  background: isSelected ? CLR_SELECTED : "transparent",
                  border: isToday && !isSelected ? `1.5px solid ${CLR_ACCENT}` : "1.5px solid transparent",
                  cursor: "pointer",
                  outline: "none",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {value && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "rgba(0,79,187,0.08)", color: CLR_SELECTED, border: "1px solid rgba(0,79,187,0.25)" }}>
            {fmtDisplay(value)}
          </div>
        </div>
      )}
    </div>
  );
}
