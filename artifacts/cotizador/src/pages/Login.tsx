import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import logoRge from "@assets/style-travel-blue-2_1780272470978.png";

type Phase = "form" | "greeting" | "fadeout";

export default function Login() {
  const { user, login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [greetingName, setGreetingName] = useState("");

  if (user && phase === "form") {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !contrasena) {
      setError("Ingresa tu usuario y contraseña");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), contrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }
      login(data.user, data.token);
      const nombre: string = (data.user?.nombre ?? username).split(" ")[0];
      setGreetingName(nombre);
      setPhase("greeting");
      setTimeout(() => setPhase("fadeout"), 1650);
      setTimeout(() => navigate("/"), 2000);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 14,
    color: "#07152f",
    background: "#f8fafc",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 6,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  };

  const isGreeting = phase === "greeting" || phase === "fadeout";

  return (
    <>
      <style>{`
        @keyframes rge-wave {
          0%   { transform: rotate(0deg);   }
          15%  { transform: rotate(18deg);  }
          30%  { transform: rotate(-8deg);  }
          45%  { transform: rotate(18deg);  }
          60%  { transform: rotate(-4deg);  }
          75%  { transform: rotate(12deg);  }
          100% { transform: rotate(0deg);   }
        }
        @keyframes rge-greet-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes rge-greet-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .rge-wave-emoji {
          display: inline-block;
          transform-origin: 70% 80%;
          animation: rge-wave 1.4s ease-in-out;
        }
        .rge-greet-content {
          animation: rge-greet-in 0.35s ease-out both;
        }
        .rge-greet-content.fadeout {
          animation: rge-greet-out 0.35s ease-in both;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #EBF4FF 0%, #F0F7FF 50%, #E8F2FF 100%)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(255,255,255,0.75)",
              boxShadow: "0 24px 60px rgba(4,25,65,0.14), inset 0 1px 0 rgba(255,255,255,0.8)",
              borderRadius: 28,
              padding: "40px 36px",
            }}
          >
            {/* Logo — always visible */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <img
                src={logoRge}
                alt="RGE Style Travel"
                style={{ height: 54, width: "auto", objectFit: "contain" }}
              />
            </div>

            {/* ── GREETING ── */}
            {isGreeting ? (
              <div
                className={`rge-greet-content${phase === "fadeout" ? " fadeout" : ""}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 0 8px",
                }}
              >
                <span
                  className="rge-wave-emoji"
                  style={{ fontSize: 48, lineHeight: 1 }}
                  aria-hidden="true"
                >
                  👋
                </span>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#07152f",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Hola, {greetingName}
                </p>
              </div>
            ) : (
              /* ── FORM ── */
              <>
                <h1
                  style={{
                    textAlign: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#07152f",
                    marginBottom: 28,
                    marginTop: 0,
                  }}
                >
                  Bienvenido
                </h1>

                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="username" style={labelStyle}>
                      Usuario
                    </label>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder=""
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#004FBB";
                        e.target.style.background = "#fff";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.background = "#f8fafc";
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label htmlFor="contrasena" style={labelStyle}>
                      Contraseña
                    </label>
                    <input
                      id="contrasena"
                      type="password"
                      autoComplete="current-password"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      placeholder=""
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#004FBB";
                        e.target.style.background = "#fff";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.background = "#f8fafc";
                      }}
                    />
                  </div>

                  {error && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: loading ? "#93b8e8" : "#004FBB",
                      color: "#fff",
                      border: "none",
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      letterSpacing: "0.02em",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#003E96";
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#004FBB";
                    }}
                  >
                    {loading ? "Iniciando sesión…" : "Iniciar sesión"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
