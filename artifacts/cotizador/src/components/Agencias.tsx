import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Upload,
  Phone,
  Mail,
  User,
  ImageOff,
} from "lucide-react";
import {
  loadAgencias,
  saveAgencias,
  type Agencia,
} from "@/lib/agencias";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

function LogoAvatar({ agencia, size = 42 }: { agencia: Agencia; size?: number }) {
  if (agencia.logoUrl) {
    return (
      <div
        className="rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <img
          src={agencia.logoUrl}
          alt={agencia.nombre}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.33,
        background: "#004FBB",
      }}
    >
      {getInitials(agencia.nombre)}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function AgenciaModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Agencia;
  onSave: (a: Agencia) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [contacto, setContacto] = useState(initial?.contacto ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [correo, setCorreo] = useState(initial?.correo ?? "");
  const [logoError, setLogoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoUrl(result);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({
      id: initial?.id ?? genId(),
      nombre: nombre.trim(),
      logoUrl: logoUrl || undefined,
      contacto: contacto.trim() || undefined,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-900">
            {initial ? "Editar agencia" : "Nueva agencia"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Logo upload */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-[72px] h-[72px] rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                title="Subir logo"
              >
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-300">
                    <ImageOff className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Sin logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir imagen
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  PNG, JPG, SVG · recomendado 200×200px
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogoUrl(""); setLogoError(false); }}
                    className="text-[10px] text-red-500 hover:text-red-700 mt-1 transition-colors"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Nombre de agencia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: RGE Travel Agency"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>

          {/* Contacto / Teléfono / Correo */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Contacto principal
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Nombre del contacto"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+1 (000) 000-0000"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Correo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="agencia@correo.com"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!nombre.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Agencias() {
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [modal, setModal] = useState<{ open: boolean; editing?: Agencia }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setAgencias(loadAgencias());
  }, []);

  const persistAndSet = (list: Agencia[]) => {
    saveAgencias(list);
    setAgencias(list);
  };

  const handleSave = (a: Agencia) => {
    const existing = agencias.findIndex((x) => x.id === a.id);
    if (existing >= 0) {
      persistAndSet(agencias.map((x) => (x.id === a.id ? a : x)));
    } else {
      persistAndSet([...agencias, a]);
    }
    setModal({ open: false });
  };

  const handleDelete = (id: string) => {
    persistAndSet(agencias.filter((a) => a.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff6ff" }}>
            <Building2 className="w-5 h-5" style={{ color: "#004FBB" }} />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">Agencias</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {agencias.length === 0
                ? "Ninguna agencia registrada"
                : `${agencias.length} agencia${agencias.length !== 1 ? "s" : ""} registrada${agencias.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
          style={{ background: "#004FBB" }}
        >
          <Plus className="w-4 h-4" />
          Nueva agencia
        </button>
      </div>

      {/* List */}
      {agencias.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <div className="text-sm font-medium text-slate-600">No hay agencias aún</div>
          <div className="text-xs text-slate-400 mt-1">
            Agrega agencias para mostrar su logo en las tarjetas del tablero.
          </div>
          <button
            type="button"
            onClick={() => setModal({ open: true })}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold mx-auto transition-colors hover:opacity-90"
            style={{ background: "#004FBB" }}
          >
            <Plus className="w-4 h-4" />
            Agregar primera agencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agencias.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3"
            >
              <LogoAvatar agencia={a} size={48} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{a.nombre}</div>
                {a.contacto && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 truncate">
                    <User className="w-3 h-3 shrink-0" />
                    {a.contacto}
                  </div>
                )}
                {a.telefono && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 truncate">
                    <Phone className="w-3 h-3 shrink-0" />
                    {a.telefono}
                  </div>
                )}
                {a.correo && (
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {a.correo}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setModal({ open: true, editing: a })}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(a.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="text-sm font-semibold text-slate-900 mb-1">
              ¿Eliminar agencia?
            </div>
            <div className="text-xs text-slate-500 mb-4">
              Esta acción no se puede deshacer. Las cotizaciones existentes no se verán afectadas.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.open && (
        <AgenciaModal
          initial={modal.editing}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
