import { type ReactNode, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Trash2,
  X,
  Check,
  Upload,
  Phone,
  Mail,
  ImageOff,
  Search,
  Star,
  Users,
  User,
  ChevronDown,
} from "lucide-react";
import {
  saveAgencia,
  deleteAgencia,
  saveAgente,
  deleteAgente,
  AMERICAS_COUNTRIES,
  type Agencia,
  type AgenteAgencia,
} from "@/lib/agencias";
import { apiAuth } from "@/lib/api-auth";

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

// ─── Agency Modal (creation only) ─────────────────────────────────────────────

function AgenciaModal({
  onSave,
  onClose,
}: {
  onSave: (a: Agencia) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [predeterminada, setPredeterminada] = useState(false);
  const [pais, setPais] = useState("");
  const [logoError, setLogoError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    onSave({
      id: genId(),
      nombre: nombre.trim(),
      logoUrl: logoUrl || undefined,
      telefono: telefono.trim() || undefined,
      correo: correo.trim() || undefined,
      predeterminada,
      pais: pais.trim() || undefined,
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="font-bold text-slate-900">Nueva agencia</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Logo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-[72px] h-[72px] rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
                title="Subir logo"
              >
                {logoUrl && !logoError ? (
                  <img src={logoUrl} alt="" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
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
                <p className="text-[10px] text-slate-400 mt-1.5">PNG, JPG, SVG · recomendado 200×200px</p>
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
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
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Ej: RGE Travel Agency"
              autoFocus
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>

          {/* País */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">País</label>
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Seleccionar país...</option>
              {AMERICAS_COUNTRIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Teléfono / Correo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Teléfono</label>
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
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Correo</label>
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

          {/* Predeterminada */}
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                predeterminada ? "border-[#E6AE33] bg-[#E6AE33]" : "border-slate-300 bg-white group-hover:border-[#E6AE33]"
              }`}
              onClick={() => setPredeterminada((v) => !v)}
            >
              {predeterminada && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-slate-700 font-medium">Agencia predeterminada</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!nombre.trim()}
            className="w-9 h-9 rounded-xl bg-[#004FBB] hover:bg-[#003E96] text-white flex items-center justify-center shadow-sm transition-colors disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Agent Row (existing) ───────────────────────────────────────────────

function AgenteRow({
  ag,
  onSave,
  onDelete,
}: {
  ag: AgenteAgencia;
  onSave: (a: AgenteAgencia) => void;
  onDelete: (id: string) => void;
}) {
  const [nombre, setNombre] = useState(ag.nombre);
  const [correo, setCorreo] = useState(ag.correo ?? "");
  const [telefono, setTelefono] = useState(ag.telefono ?? "");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { setNombre(ag.nombre); }, [ag.nombre]);
  useEffect(() => { setCorreo(ag.correo ?? ""); }, [ag.correo]);
  useEffect(() => { setTelefono(ag.telefono ?? ""); }, [ag.telefono]);

  const commit = () => {
    if (!nombre.trim()) return;
    const updated: AgenteAgencia = {
      ...ag,
      nombre: nombre.trim(),
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
    };
    if (
      updated.nombre !== ag.nombre ||
      (updated.correo ?? "") !== (ag.correo ?? "") ||
      (updated.telefono ?? "") !== (ag.telefono ?? "")
    ) {
      onSave(updated);
    }
  };

  const inCls =
    "bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none px-0 py-0.5 transition-colors min-w-0 w-full text-[11px]";

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
        <User className="w-3 h-3 text-slate-500" />
      </div>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setNombre(ag.nombre); e.currentTarget.blur(); }
        }}
        placeholder="Nombre"
        className={inCls + " font-semibold text-slate-800 text-[12px]"}
        style={{ flex: "2 1 0" }}
      />
      <input
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        placeholder="Correo"
        className={inCls + " text-slate-500"}
        style={{ flex: "2 1 0" }}
      />
      <input
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        placeholder="Teléfono"
        className={inCls + " text-slate-500"}
        style={{ flex: "1.5 1 0" }}
      />
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {deleteConfirm ? (
          <>
            <button
              type="button"
              onClick={() => onDelete(ag.id)}
              className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded-md bg-red-50 transition-colors"
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── New Agent Row ─────────────────────────────────────────────────────────────

function NewAgenteRow({
  agenciaId,
  onSave,
  onCancel,
}: {
  agenciaId: string;
  onSave: (a: AgenteAgencia) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const nombreRef = useRef<HTMLInputElement>(null);
  const correoRef = useRef<HTMLInputElement>(null);
  const telefonoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nombreRef.current?.focus(); }, []);

  const save = () => {
    if (!nombre.trim()) { onCancel(); return; }
    onSave({
      id: genId(),
      agenciaId,
      nombre: nombre.trim(),
      correo: correo.trim() || undefined,
      telefono: telefono.trim() || undefined,
    });
  };

  const inCls =
    "bg-transparent border-b border-slate-300 focus:border-primary focus:outline-none px-0 py-0.5 transition-colors min-w-0 w-full text-[11px] placeholder:text-slate-300";

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-blue-50 ring-1 ring-primary/20">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <User className="w-3 h-3 text-primary" />
      </div>
      <input
        ref={nombreRef}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") correoRef.current?.focus();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Nombre *"
        className={inCls + " font-semibold text-slate-800 text-[12px]"}
        style={{ flex: "2 1 0" }}
      />
      <input
        ref={correoRef}
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") telefonoRef.current?.focus();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Correo"
        className={inCls + " text-slate-600"}
        style={{ flex: "2 1 0" }}
      />
      <input
        ref={telefonoRef}
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={save}
        placeholder="Teléfono"
        className={inCls + " text-slate-600"}
        style={{ flex: "1.5 1 0" }}
      />
      <div className="flex gap-0.5 shrink-0">
        <button
          type="button"
          onClick={save}
          disabled={!nombre.trim()}
          className="w-6 h-6 flex items-center justify-center rounded-md bg-primary text-white disabled:opacity-40 transition-colors"
          title="Guardar"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-400 transition-colors"
          title="Cancelar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Agents Sub-section ───────────────────────────────────────────────────────

function AgentesSection({
  agencia,
  agentes,
  onAgenteSave,
  onAgenteDelete,
}: {
  agencia: Agencia;
  agentes: AgenteAgencia[];
  onAgenteSave: (a: AgenteAgencia) => Promise<void>;
  onAgenteDelete: (id: string) => Promise<void>;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const mine = agentes.filter((a) => a.agenciaId === agencia.id);

  const handleSave = async (ag: AgenteAgencia) => {
    await onAgenteSave(ag);
    setAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    await onAgenteDelete(id);
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div
        className="flex items-center justify-between mb-2 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          <Users className="w-3.5 h-3.5" />
          Agentes
          {mine.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {mine.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expanded && !addingNew && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAddingNew(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-colors"
            >
              <Plus className="w-3 h-3" />
              Agregar agente
            </button>
          )}
          <ChevronDown
            className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </div>

      {expanded && (
        mine.length === 0 && !addingNew ? (
          <div className="text-[11px] text-slate-400 italic py-1">Sin agentes registrados</div>
        ) : (
          <div className="space-y-0.5">
            {mine.map((ag) => (
              <AgenteRow
                key={ag.id}
                ag={ag}
                onSave={(updated) => onAgenteSave(updated)}
                onDelete={handleDelete}
              />
            ))}
            {addingNew && (
              <NewAgenteRow
                agenciaId={agencia.id}
                onSave={handleSave}
                onCancel={() => setAddingNew(false)}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}

// ─── Delete Agency Confirmation Modal ─────────────────────────────────────────

function DeleteAgenciaModal({
  nombre,
  onConfirm,
  onClose,
}: {
  nombre: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <span className="text-lg leading-none">⚠️</span>
            Eliminar agencia
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-slate-700">
            ¿Está seguro de que desea eliminar la agencia{" "}
            <span className="font-semibold text-slate-900">"{nombre}"</span>?
          </p>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">Esta acción eliminará:</p>
            <ul className="space-y-1">
              {["La agencia", "Todos los agentes asociados", "La relación con cotizaciones futuras"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-red-600">
                  <span className="mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500 font-medium">Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#dc2626" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b91c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
          >
            Eliminar agencia
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agency Card (inline editing) ─────────────────────────────────────────────

function AgenciaCard({
  agencia,
  agentes,
  onSave,
  onDelete,
  onAgenteSave,
  onAgenteDelete,
  isNew = false,
  onFirstSave,
}: {
  agencia: Agencia;
  agentes: AgenteAgencia[];
  onSave: (a: Agencia) => void;
  onDelete: (id: string) => void;
  onAgenteSave: (a: AgenteAgencia) => Promise<void>;
  onAgenteDelete: (id: string) => Promise<void>;
  isNew?: boolean;
  onFirstSave?: () => void;
}) {
  const [nombre, setNombre] = useState(agencia.nombre);
  const [pais, setPais] = useState(agencia.pais ?? "");
  const [paisError, setPaisError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNombre(agencia.nombre); }, [agencia.nombre]);
  useEffect(() => { setPais(agencia.pais ?? ""); }, [agencia.pais]);
  useEffect(() => { if (isNew) nombreRef.current?.focus(); }, [isNew]);

  const saveField = (patch: Partial<Agencia>) => {
    if (isNew) {
      const finalAgencia = { ...agencia, nombre: nombre.trim(), pais, ...patch };
      if (!finalAgencia.nombre.trim() || !finalAgencia.pais?.trim()) return;
      onSave(finalAgencia);
      onFirstSave?.();
      return;
    }
    onSave({ ...agencia, ...patch });
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => saveField({ logoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const commitNombre = () => {
    const n = nombre.trim();
    if (!n) {
      if (!isNew) setNombre(agencia.nombre);
      return;
    }
    if (!isNew && n === agencia.nombre) return;
    saveField({ nombre: n });
  };

  const handlePaisChange = (v: string) => {
    setPais(v);
    if (!v && !isNew) {
      setPaisError(true);
      return;
    }
    setPaisError(false);
    saveField({ pais: v || undefined });
  };

  const nombreEmpty = isNew && !nombre.trim();
  const paisEmpty = isNew && !pais.trim();

  return (
    <div className={`rounded-2xl shadow-sm p-4 transition-colors ${isNew ? "bg-blue-50 ring-1 ring-blue-200" : "bg-white ring-1 ring-slate-100"}`}>
      <div className="flex items-start gap-3">
        {/* Clickable logo */}
        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fileRef.current?.click()}
          title="Cambiar logo"
          style={{ width: 48, height: 48 }}
        >
          <LogoAvatar agencia={agencia} size={48} />
          <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="w-3.5 h-3.5 text-white" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoFile}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Nombre inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={commitNombre}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setNombre(agencia.nombre); e.currentTarget.blur(); }
              }}
              placeholder={isNew ? "Nombre de agencia *" : "Nombre de agencia"}
              className={`text-sm font-bold text-slate-900 bg-transparent border-b py-0.5 transition-colors w-full focus:outline-none ${
                nombreEmpty ? "border-blue-300 placeholder:text-blue-400" : "border-transparent hover:border-slate-200 focus:border-primary"
              }`}
            />
            {agencia.predeterminada && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                style={{ backgroundColor: "#FEF3C7", color: "#E6AE33", border: "1px solid #E6AE33" }}
              >
                <Star className="w-2.5 h-2.5" />
                Predeterminada
              </span>
            )}
          </div>

          {/* País selector inline */}
          <select
            value={pais}
            onChange={(e) => handlePaisChange(e.target.value)}
            className={`text-[11px] bg-transparent border rounded-lg px-1 py-0.5 transition-colors cursor-pointer focus:outline-none ${
              paisError ? "border-red-300 text-red-500 focus:border-red-400" :
              paisEmpty ? "border-blue-300 text-blue-400 focus:border-blue-400" :
              "border-transparent text-slate-500 hover:border-slate-200 focus:border-primary"
            }`}
            style={{ maxWidth: "100%" }}
          >
            <option value="">{isNew ? "País *" : "Sin país"}</option>
            {AMERICAS_COUNTRIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {agencia.telefono && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
              <Phone className="w-3 h-3 shrink-0" />
              {agencia.telefono}
            </div>
          )}
          {agencia.correo && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              {agencia.correo}
            </div>
          )}
        </div>

        {/* Delete only */}
        <button
          type="button"
          onClick={() => onDelete(agencia.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Agents sub-section */}
      <AgentesSection
        agencia={agencia}
        agentes={agentes}
        onAgenteSave={onAgenteSave}
        onAgenteDelete={onAgenteDelete}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Agencias({ notificationSlot }: { notificationSlot?: ReactNode }) {
  const [pendingNew, setPendingNew] = useState<Agencia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const createNewDraft = () => {
    if (!pendingNew) {
      setPendingNew({ id: genId(), nombre: "", pais: "", predeterminada: false });
    }
  };

  const { data: agencias = [] } = useQuery<Agencia[]>({
    queryKey: ["agencias"],
    queryFn: () => apiAuth.agencias.list() as Promise<Agencia[]>,
    staleTime: 0,
  });

  const { data: agentes = [] } = useQuery<AgenteAgencia[]>({
    queryKey: ["agentes"],
    queryFn: () => apiAuth.agentes.list() as Promise<AgenteAgencia[]>,
    staleTime: 0,
  });

  const handleSave = async (a: Agencia) => {
    await saveAgencia(a);
    setShowCreateModal(false);
  };

  const handleInlineSave = async (a: Agencia) => {
    await saveAgencia(a);
  };

  const handleDelete = async (id: string) => {
    await deleteAgencia(id);
    setDeleteConfirm(null);
  };

  const handleAgenteSave = async (ag: AgenteAgencia) => {
    await saveAgente(ag);
  };

  const handleAgenteDelete = async (id: string) => {
    await deleteAgente(id);
  };

  const COUNTRY_FLAG: Record<string, string> = {
    "Colombia": "🇨🇴",
    "Costa Rica": "🇨🇷",
    "Ecuador": "🇪🇨",
    "El Salvador": "🇸🇻",
    "Estados Unidos": "🇺🇸",
    "Guatemala": "🇬🇹",
    "Honduras": "🇭🇳",
    "México": "🇲🇽",
    "Nicaragua": "🇳🇮",
    "Panamá": "🇵🇦",
    "Perú": "🇵🇪",
    "República Dominicana": "🇩🇴",
    "Venezuela": "🇻🇪",
    "Argentina": "🇦🇷",
    "Brasil": "🇧🇷",
    "Chile": "🇨🇱",
    "Bolivia": "🇧🇴",
    "Cuba": "🇨🇺",
    "Jamaica": "🇯🇲",
    "Uruguay": "🇺🇾",
    "Paraguay": "🇵🇾",
    "Haití": "🇭🇹",
    "Trinidad y Tobago": "🇹🇹",
    "Canadá": "🇨🇦",
    "Bahamas": "🇧🇸",
    "Barbados": "🇧🇧",
    "Guyana": "🇬🇾",
    "Surinam": "🇸🇷",
    "Belice": "🇧🇿",
    "Dominica": "🇩🇲",
    "Granada": "🇬🇩",
    "Santa Lucía": "🇱🇨",
  };

  const filteredAgencias = agencias.filter((a) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      a.nombre.toLowerCase().includes(q) ||
      (a.correo?.toLowerCase().includes(q) ?? false) ||
      (a.pais?.toLowerCase().includes(q) ?? false)
    );
  });

  // Group by country, sorted alphabetically; agencies without country go last
  const groupedByPais: Array<{ pais: string; agencias: typeof filteredAgencias }> = [];
  const paisMap = new Map<string, typeof filteredAgencias>();
  for (const a of filteredAgencias) {
    const key = a.pais?.trim() || "";
    const arr = paisMap.get(key) ?? [];
    arr.push(a);
    paisMap.set(key, arr);
  }
  const sortedPaises = Array.from(paisMap.keys()).sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, "es");
  });
  for (const pais of sortedPaises) {
    const list = (paisMap.get(pais) ?? []).slice().sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
    groupedByPais.push({ pais, agencias: list });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl"
        style={{
          backgroundColor: "rgba(0,36,126,0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 2px 12px rgba(0,36,126,0.18)",
        }}
      >
        <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ backgroundColor: "#eec774" }} />
        <span className="text-white text-xl font-bold tracking-[0.12em]">AGENCIAS</span>
        <span className="text-xs font-medium text-blue-100/80 whitespace-nowrap">
          {agencias.length} agencia{agencias.length !== 1 ? "s" : ""} · {agentes.length} agente{agentes.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={createNewDraft}
            disabled={!!pendingNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#004FBB] text-xs font-bold transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva agencia
          </button>
          {notificationSlot}
        </div>
      </div>

      {/* Search */}
      {agencias.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar agencia..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 shadow-sm"
          />
        </div>
      )}

      {/* New agency draft card — always at top */}
      {pendingNew && (
        <AgenciaCard
          key={pendingNew.id}
          agencia={pendingNew}
          agentes={[]}
          onSave={handleInlineSave}
          onDelete={() => setPendingNew(null)}
          onAgenteSave={handleAgenteSave}
          onAgenteDelete={handleAgenteDelete}
          isNew
          onFirstSave={() => setPendingNew(null)}
        />
      )}

      {/* List */}
      {agencias.length === 0 && !pendingNew ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <div className="text-sm font-medium text-slate-600">No hay agencias aún</div>
          <div className="text-xs text-slate-400 mt-1">
            Agrega agencias para mostrar su logo en las tarjetas del tablero.
          </div>
          <button
            type="button"
            onClick={createNewDraft}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold mx-auto transition-colors hover:opacity-90"
            style={{ background: "#004FBB" }}
          >
            <Plus className="w-4 h-4" />
            Agregar primera agencia
          </button>
        </div>
      ) : filteredAgencias.length === 0 && !pendingNew ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
          <Search className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          <div className="text-sm font-medium text-slate-500">Sin resultados para "{search}"</div>
        </div>
      ) : agencias.length > 0 ? (
        <div className="space-y-6">
          {groupedByPais.map(({ pais: grupoPais, agencias: grupoAgencias }) => (
            <div key={grupoPais || "__sin_pais__"}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base leading-none">
                  {grupoPais ? (COUNTRY_FLAG[grupoPais] ?? "🌐") : "🌐"}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {grupoPais || "Sin país"}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({grupoAgencias.length})
                </span>
                <div className="flex-1 h-px bg-slate-100 ml-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grupoAgencias.map((a) => (
                  <AgenciaCard
                    key={a.id}
                    agencia={a}
                    agentes={agentes}
                    onSave={handleInlineSave}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onAgenteSave={handleAgenteSave}
                    onAgenteDelete={handleAgenteDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Delete confirm */}
      {deleteConfirm && (() => {
        const agenciaAEliminar = agencias.find((a) => a.id === deleteConfirm);
        return (
          <DeleteAgenciaModal
            nombre={agenciaAEliminar?.nombre ?? ""}
            onConfirm={() => handleDelete(deleteConfirm)}
            onClose={() => setDeleteConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
