import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usuariosTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import type { Response, NextFunction } from "express";

export const JWT_SECRET = process.env.SESSION_SECRET ?? "rge-jwt-secret-dev-2025";
const JWT_EXPIRES = "30d";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, contrasena } = req.body ?? {};

  try {
    if (!username || !contrasena) {
      console.log("[AUTH] Fallo: campos vacíos", { username: !!username, contrasena: !!contrasena });
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    const normalized = String(username).trim().toLowerCase();
    console.log("[AUTH] Buscando usuario:", normalized);

    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.username, normalized))
      .limit(1);

    if (!user) {
      console.log("[AUTH] Fallo: usuario no encontrado:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "usuario no encontrado" });
    }

    if (!user.activo) {
      console.log("[AUTH] Fallo: usuario inactivo:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "usuario inactivo" });
    }

    const valid = await bcrypt.compare(String(contrasena), user.contrasenaHash);
    console.log("[AUTH] bcrypt.compare resultado:", valid, "para usuario:", normalized);

    if (!valid) {
      console.log("[AUTH] Fallo: contraseña incorrecta para:", normalized);
      return res.status(401).json({ error: "Credenciales inválidas", motivo: "contraseña incorrecta" });
    }

    const payload = { id: user.id, nombre: user.nombre, correo: user.correo ?? "" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    console.log("[AUTH] Login exitoso:", normalized);
    return res.json({ token, user: { ...payload, rol: user.rol } });
  } catch (err) {
    console.error("[AUTH] Error interno:", err);
    return res.status(500).json({ error: "Error al iniciar sesión", motivo: "error interno" });
  }
});

router.get("/auth/users", requireAuth, async (_req, res) => {
  try {
    const users = await db
      .select({ id: usuariosTable.id, nombre: usuariosTable.nombre, username: usuariosTable.username })
      .from(usuariosTable)
      .where(eq(usuariosTable.activo, true));
    return res.json(users);
  } catch (err) {
    console.error("[AUTH] Error listando usuarios:", err);
    return res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// ─── Gestión de usuarios (solo administradores) ───────────────────────────────

async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [me] = await db
      .select({ rol: usuariosTable.rol, activo: usuariosTable.activo })
      .from(usuariosTable)
      .where(eq(usuariosTable.id, req.userId!))
      .limit(1);
    if (!me || !me.activo || me.rol !== "administrador") {
      res.status(403).json({ error: "Solo administradores" });
      return;
    }
    next();
  } catch (err) {
    console.error("[AUTH] Error verificando rol:", err);
    res.status(500).json({ error: "Error interno" });
  }
}

router.get("/auth/users/all", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usuariosTable.id,
        nombre: usuariosTable.nombre,
        username: usuariosTable.username,
        rol: usuariosTable.rol,
        activo: usuariosTable.activo,
      })
      .from(usuariosTable)
      .orderBy(usuariosTable.nombre);
    return res.json(users);
  } catch (err) {
    console.error("[AUTH] Error listando todos los usuarios:", err);
    return res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

router.post("/auth/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nombre, username, contrasena, rol, activo } = req.body ?? {};
    if (!nombre?.trim() || !username?.trim() || !contrasena) {
      return res.status(400).json({ error: "Nombre, usuario y contraseña son requeridos" });
    }
    const normalized = String(username).trim().toLowerCase();
    const [existing] = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .where(eq(usuariosTable.username, normalized))
      .limit(1);
    if (existing) {
      return res.status(409).json({ error: "Ese nombre de usuario ya existe" });
    }
    const contrasenaHash = await bcrypt.hash(String(contrasena), 10);
    const [row] = await db
      .insert(usuariosTable)
      .values({
        nombre: String(nombre).trim(),
        username: normalized,
        contrasenaHash,
        rol: rol === "administrador" ? "administrador" : "agente",
        activo: activo !== false,
      })
      .returning({
        id: usuariosTable.id,
        nombre: usuariosTable.nombre,
        username: usuariosTable.username,
        rol: usuariosTable.rol,
        activo: usuariosTable.activo,
      });
    return res.json(row);
  } catch (err) {
    console.error("[AUTH] Error creando usuario:", err);
    return res.status(500).json({ error: "Error al crear usuario" });
  }
});

router.put("/auth/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });
    const { nombre, username, contrasena, rol, activo } = req.body ?? {};

    const set: Record<string, unknown> = {};
    if (nombre !== undefined) {
      if (!String(nombre).trim()) return res.status(400).json({ error: "El nombre no puede estar vacío" });
      set.nombre = String(nombre).trim();
    }
    if (username !== undefined) {
      const normalized = String(username).trim().toLowerCase();
      if (!normalized) return res.status(400).json({ error: "El usuario no puede estar vacío" });
      const [dup] = await db
        .select({ id: usuariosTable.id })
        .from(usuariosTable)
        .where(eq(usuariosTable.username, normalized))
        .limit(1);
      if (dup && dup.id !== id) {
        return res.status(409).json({ error: "Ese nombre de usuario ya existe" });
      }
      set.username = normalized;
    }
    if (contrasena) {
      set.contrasenaHash = await bcrypt.hash(String(contrasena), 10);
    }
    if (rol !== undefined) {
      set.rol = rol === "administrador" ? "administrador" : "agente";
    }
    if (activo !== undefined) {
      set.activo = activo !== false;
    }
    if (Object.keys(set).length === 0) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    // Evitar quedarse sin administradores: si este cambio demota o desactiva
    // a un administrador activo, debe existir al menos otro admin activo.
    const demotes = set.rol !== undefined && set.rol !== "administrador";
    const deactivates = set.activo === false;
    if (demotes || deactivates) {
      const [target] = await db
        .select({ rol: usuariosTable.rol, activo: usuariosTable.activo })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, id))
        .limit(1);
      if (target && target.rol === "administrador" && target.activo) {
        const otherAdmins = await db
          .select({ id: usuariosTable.id })
          .from(usuariosTable)
          .where(and(
            eq(usuariosTable.rol, "administrador"),
            eq(usuariosTable.activo, true),
            ne(usuariosTable.id, id),
          ));
        if (otherAdmins.length === 0) {
          return res.status(400).json({ error: "No puedes desactivar o cambiar el rol del único administrador activo" });
        }
      }
    }

    const [row] = await db
      .update(usuariosTable)
      .set(set)
      .where(eq(usuariosTable.id, id))
      .returning({
        id: usuariosTable.id,
        nombre: usuariosTable.nombre,
        username: usuariosTable.username,
        rol: usuariosTable.rol,
        activo: usuariosTable.activo,
      });
    if (!row) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(row);
  } catch (err) {
    console.error("[AUTH] Error actualizando usuario:", err);
    return res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autenticado" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as {
      id: number;
      nombre: string;
      correo: string;
    };
    let rol: string | undefined;
    try {
      const [row] = await db
        .select({ rol: usuariosTable.rol })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, payload.id))
        .limit(1);
      rol = row?.rol;
    } catch (err) {
      console.error("[AUTH] Error consultando rol en /auth/me:", err);
    }
    return res.json({ id: payload.id, nombre: payload.nombre, correo: payload.correo, rol });
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
});

export default router;
