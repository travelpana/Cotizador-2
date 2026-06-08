import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const JWT_SECRET = process.env.SESSION_SECRET ?? "rge-jwt-secret-dev-2025";
const JWT_EXPIRES = "30d";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body ?? {};
    if (!correo || !contrasena) {
      return res.status(400).json({ error: "Correo y contraseña requeridos" });
    }
    const [user] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.correo, String(correo).trim().toLowerCase()))
      .limit(1);

    if (!user || !user.activo) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const valid = await bcrypt.compare(String(contrasena), user.contrasenaHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const payload = { id: user.id, nombre: user.nombre, correo: user.correo };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token, user: payload });
  } catch {
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

router.get("/auth/me", (req, res) => {
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
    return res.json({ id: payload.id, nombre: payload.nombre, correo: payload.correo });
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
});

export default router;
