import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAYS_ES = ["LU","MA","MI","JU","VI","SÁ","DO"];

const CLR_SELECTED   = "#004FBB";
const CLR_RANGE_BG   = "rgba(0,79,187,0.10)";
const CLR_TEXT       = "#041941";
const CLR_ACCENT     = "#E6AE33";
const CAL_WIDTH      = 316;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayISO(): string {
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}

function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  fechaInicio: string;
  fechaFin: string;
  selecting: "inicio" | "fin";
  anchorEl: HTMLElement | null;
  onSelect: (inicio: string, fin: string, done: boolean) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PremiumRangePicker({
  open,
  fechaInicio,
  fechaFin,
  selecting,
  anchorEl,
  onSelect,
  onClose,
}: Props) {
  const today = todayISO();

  const getInitialView = useCallback(() => {
    const ref = selecting === "fin" && fechaFin ? fechaFin
              : fechaInicio ? fechaInicio
              : today;
    const p = parseISO(ref);
    return { year: p.y, month: p.m };
  }, [selecting, fechaFin, fechaInicio, today]);

  const [viewYear, setViewYear]   = useState(() => getInitialView().year);
  const [viewMonth, setViewMonth] = useState(() => getInitialView().month);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [pos, setPos]             = useState<{ top: number; left: number } | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  // Re-sync view when calendar opens
  useEffect(() => {
    if (!open) return;
    const { year, month } = getInitialView();
    setViewYear(year);
    setViewMonth(month);
    setHoverDate(null);
  }, [open, getInitialView]);

  // Position to the LEFT of the anchor element
  useEffect(() => {
    if (!open || !anchorEl) return;

    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: Math.max(8, rect.left - CAL_WIDTH - 10),
      });
    };

    update();
    window.addEventListener("resize",  update);
    window.addEventListener("scroll",  update, true);
    return () => {
      window.removeEventListener("resize",  update);
      window.removeEventListener("scroll",  update, true);
    };
  }, [open, anchorEl]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideCal    = !calRef.current?.contains(target);
      const outsideAnchor = !anchorEl?.contains(target);
      if (outsideCal && outsideAnchor) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, anchorEl, onClose]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Day click ───────────────────────────────────────────────────────────────
  const handleDayClick = (iso: string) => {
    if (selecting === "inicio") {
      const keepFin = fechaFin && fechaFin > iso ? fechaFin : "";
      onSelect(iso, keepFin, false);
    } else {
      if (!fechaInicio || iso > fechaInicio) {
        onSelect(fechaInicio, iso, true);
      } else if (iso === fechaInicio) {
        // Same day — treat as single-night: fin = next day
        const next = new Date(iso + "T00:00:00");
        next.setDate(next.getDate() + 1);
        const nextISO = toISO(next.getFullYear(), next.getMonth(), next.getDate());
        onSelect(iso, nextISO, true);
      } else {
        // Clicked before inicio → reset, this becomes new inicio
        onSelect(iso, "", false);
      }
    }
  };

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = (() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1; // Mon = 0
  })();

  const activeEnd = selecting === "fin" && hoverDate ? hoverDate : fechaFin;
  const hasRange  = !!(fechaInicio && activeEnd && activeEnd > fechaInicio);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={calRef}
      style={{
        position:     "fixed",
        top:          pos.top,
        left:         pos.left,
        width:        CAL_WIDTH,
        zIndex:       9999,
        background:   "#fff",
        borderRadius: 20,
        boxShadow:    "0 24px 64px rgba(0,30,90,0.20), 0 4px 16px rgba(0,0,0,0.08)",
        border:       "1px solid rgba(0,79,187,0.14)",
        padding:      "16px 14px 18px",
        userSelect:   "none",
      }}
    >
      {/* ── Month navigation ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button type="button" onClick={prevMonth} style={navBtn}>
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: CLR_TEXT, letterSpacing: "0.02em" }}>
          {MONTHS_ES[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} style={navBtn}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {DAYS_ES.map((d) => (
          <div key={d} style={{
            textAlign:    "center",
            fontSize:     9,
            fontWeight:   700,
            color:        "#94a3b8",
            paddingBottom: 6,
            letterSpacing: "0.07em",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {/* Offset empty cells */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} style={{ height: 36 }} />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = toISO(viewYear, viewMonth, day);

          const isStart    = iso === fechaInicio;
          const isEnd      = iso === activeEnd;
          const inRange    = hasRange && iso > fechaInicio && iso < activeEnd;
          const isToday    = iso === today;
          const isSelected = isStart || isEnd;

          // Range band: show on days strictly between start and end
          const showBandFull  = inRange;
          const showBandRight = isStart && hasRange; // right half of start
          const showBandLeft  = isEnd   && hasRange && fechaInicio < iso; // left half of end

          // Hover preview (no band on end until hovered)
          const showHoverBand = selecting === "fin" && hoverDate && fechaInicio &&
            iso > fechaInicio && iso <= hoverDate && !isSelected;

          return (
            <div
              key={iso}
              style={{ position: "relative", height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {/* Range background bands */}
              {showBandFull && (
                <div style={{ position: "absolute", inset: "4px 0", background: CLR_RANGE_BG }} />
              )}
              {showHoverBand && !showBandFull && (
                <div style={{ position: "absolute", inset: "4px 0", background: "rgba(0,79,187,0.06)" }} />
              )}
              {showBandRight && (
                <div style={{ position: "absolute", top: 4, bottom: 4, left: "50%", right: 0, background: CLR_RANGE_BG }} />
              )}
              {showBandLeft && (
                <div style={{ position: "absolute", top: 4, bottom: 4, left: 0, right: "50%", background: CLR_RANGE_BG }} />
              )}

              {/* Day button */}
              <button
                type="button"
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => selecting === "fin" && setHoverDate(iso)}
                onMouseLeave={() => selecting === "fin" && setHoverDate(null)}
                style={{
                  position:        "relative",
                  zIndex:          1,
                  width:           32,
                  height:          32,
                  borderRadius:    "50%",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  fontSize:        12,
                  fontWeight:      isSelected ? 700 : 400,
                  color:           isSelected ? "#fff" : isToday ? CLR_ACCENT : CLR_TEXT,
                  background:      isSelected ? CLR_SELECTED : "transparent",
                  border:          isToday && !isSelected
                                     ? `1.5px solid ${CLR_ACCENT}`
                                     : "1.5px solid transparent",
                  cursor:          "pointer",
                  outline:         "none",
                  transition:      "background 0.1s, color 0.1s",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Selecting indicator ── */}
      <div style={{
        marginTop:    12,
        paddingTop:   10,
        borderTop:    "1px solid #f1f5f9",
        display:      "flex",
        gap:          8,
        justifyContent: "center",
      }}>
        <Chip active={selecting === "inicio"} label="Llegada"  value={fechaInicio} />
        <span style={{ color: "#cbd5e1", alignSelf: "center", fontSize: 12 }}>→</span>
        <Chip active={selecting === "fin"}   label="Salida"   value={fechaFin}    />
      </div>
    </div>,
    document.body
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ active, label, value }: { active: boolean; label: string; value: string }) {
  let display = label;
  if (value) {
    const [, m, d] = value.split("-").map(Number);
    const MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    display = `${String(d).padStart(2,"0")} ${MES[m-1]}`;
  }
  return (
    <div style={{
      padding:       "3px 10px",
      borderRadius:  20,
      fontSize:      11,
      fontWeight:    600,
      background:    active ? "rgba(0,79,187,0.08)" : "#f8fafc",
      color:         active ? CLR_SELECTED : "#94a3b8",
      border:        active ? "1px solid rgba(0,79,187,0.25)" : "1px solid #e2e8f0",
    }}>
      {display}
    </div>
  );
}

// ─── Nav button style ─────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width:          28,
  height:         28,
  borderRadius:   8,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  background:     "#f8fafc",
  border:         "1px solid #e2e8f0",
  cursor:         "pointer",
  color:          CLR_TEXT,
  outline:        "none",
};
