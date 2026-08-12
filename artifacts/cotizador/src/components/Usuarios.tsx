import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, X, Eye, EyeOff } from "lucide-react";
import { apiAuth, type UsuarioApi } from "@/lib/api-auth";

interface FormState {
  id: number | null; // null = crear
  nombre: string;
  username: string;
  contrasena: string;
  rol: string;
  activo: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  nombre: "",
  username: "",
  contrasena: "",
  rol: "agente",
  activo: true,
};

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const { data: usuarios = [], isLoading, error: loadError } = useQuery<UsuarioApi[]>({
    queryKey: ["usuarios-admin"],
    queryFn: () => apiAuth.users.listAll(),
    staleTime: 0,
  });

  const openCreate = () => {
    setError(null);
    setShowPass(false);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (u: UsuarioApi) => {
    setError(null);
    setShowPass(false);
    setForm({
      id: u.id,
      nombre: u.nombre,
      username: u.username ?? "",
      contrasena: "",
      rol: u.rol === "administrador" ? "administrador" : "agente",
      activo: u.activo,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setError(null);
    if (!form.nombre.trim() || !form.username.trim()) {
      setError("Nombre y usuario son requeridos");
      return;
    }
    if (form.id === null && !form.contrasena) {
      setError("La contraseña es requerida para un usuario nuevo");
      return;
    }
    setSaving(true);
    try {
      if (form.id === null) {
        await apiAuth.users.create({
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          contrasena: form.contrasena,
          rol: form.rol,
          activo: form.activo,
        });
      } else {
        await apiAuth.users.update(form.id, {
          nombre: form.nombre.trim(),
          username: form.username.trim(),
          ...(form.contrasena ? { contrasena: form.contrasena } : {}),
          rol: form.rol,
          activo: form.activo,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["usuarios-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0047c7] focus:ring-2 focus:ring-[#0047c7]/15 bg-white";

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-[20px] font-bold" style={{ color: "#07152f" }}>
          Usuarios
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white transition-colors"
          style={{ backgroundColor: "#0047c7" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0043BB")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0047c7")}
        >
          <Plus className="w-4 h-4" />
          Agregar usuario
        </button>
      </div>

      {/* Lista */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="text-sm text-slate-500 py-6 text-center">Cargando usuarios…</div>
        ) : loadError ? (
          <div className="text-sm text-red-600 py-6 text-center">
            No se pudieron cargar los usuarios. {loadError instanceof Error ? loadError.message : ""}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <th className="py-2 pr-3 font-semibold">Nombre</th>
                <th className="py-2 pr-3 font-semibold">Usuario</th>
                <th className="py-2 pr-3 font-semibold">Rol</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 w-[60px] text-right font-semibold">Editar</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-2.5 pr-3 font-medium" style={{ color: "#07152f" }}>
                    {u.nombre}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">{u.username ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={
                        u.rol === "administrador"
                          ? { backgroundColor: "rgba(0,71,199,0.10)", color: "#0043BB" }
                          : { backgroundColor: "#f1f5f9", color: "#64748b" }
                      }
                    >
                      {u.rol === "administrador" ? "Administrador" : "Agente"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                      style={{ color: u.activo ? "#15803d" : "#94a3b8" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: u.activo ? "#22c55e" : "#cbd5e1" }}
                      />
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      title="Editar usuario"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0043BB] hover:bg-[#EDF4FF] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear/editar */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(7,21,47,0.45)" }}
          onClick={() => !saving && setForm(null)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-[16px] font-bold" style={{ color: "#07152f" }}>
                {form.id === null ? "Agregar usuario" : "Editar usuario"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                  Nombre
                </label>
                <input
                  className={inputStyle}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                  Nombre de usuario
                </label>
                <input
                  className={inputStyle}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="usuario"
                  autoCapitalize="none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                  Contraseña {form.id !== null && <span className="normal-case font-normal">(dejar en blanco para no cambiarla)</span>}
                </label>
                <div className="relative">
                  <input
                    className={inputStyle}
                    type={showPass ? "text" : "password"}
                    value={form.contrasena}
                    onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                    placeholder={form.id === null ? "Contraseña" : "Nueva contraseña"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500 mb-1">
                  Rol
                </label>
                <div className="flex gap-2">
                  {(["agente", "administrador"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, rol: r })}
                      className="flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors"
                      style={
                        form.rol === r
                          ? { border: "2px solid #0047c7", backgroundColor: "rgba(0,71,199,0.06)", color: "#0043BB" }
                          : { border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#64748b" }
                      }
                    >
                      {r === "administrador" ? "Administrador" : "Agente"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500">
                  Estado
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  className="flex items-center gap-2"
                >
                  <span className="text-[12px] font-medium" style={{ color: form.activo ? "#15803d" : "#94a3b8" }}>
                    {form.activo ? "Activo" : "Inactivo"}
                  </span>
                  <span
                    className="relative inline-flex w-10 h-6 rounded-full transition-colors"
                    style={{ backgroundColor: form.activo ? "#0047c7" : "#cbd5e1" }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                      style={{ left: form.activo ? 18 : 2 }}
                    />
                  </span>
                </button>
              </div>

              {error && (
                <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#0047c7" }}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
