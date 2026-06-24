interface Props {
  secondsLeft: number;
  onContinue: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const C = "#004FBB";

export default function InactivityWarning({ secondsLeft, onContinue }: Props) {
  const urgent = secondsLeft <= 60;

  return (
    <>
      <style>{`
        @keyframes iw-in {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes iw-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .iw-card { animation: iw-in 0.25s ease-out both; }
        .iw-urgent { animation: iw-pulse 1s ease-in-out infinite; }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(7,21,47,0.38)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      >
        <div
          className="iw-card"
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "36px 40px",
            width: "100%",
            maxWidth: 380,
            margin: "0 16px",
            boxShadow: "0 24px 64px rgba(4,25,65,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid rgba(255,255,255,0.8)",
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: urgent ? "#fef3c7" : `${C}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 26,
            }}
          >
            ⏱️
          </div>

          {/* Title */}
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#07152f",
              margin: "0 0 8px",
              lineHeight: 1.3,
            }}
          >
            Sesión por vencer
          </p>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: "0 0 24px",
              lineHeight: 1.5,
            }}
          >
            Por inactividad, la sesión se cerrará en
          </p>

          {/* Countdown */}
          <div
            className={urgent ? "iw-urgent" : ""}
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: urgent ? "#d97706" : C,
              margin: "0 0 28px",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {fmt(secondsLeft)}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onContinue}
            style={{
              width: "100%",
              padding: "12px",
              background: C,
              color: "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#003E96";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C;
            }}
          >
            Continuar sesión
          </button>
        </div>
      </div>
    </>
  );
}
