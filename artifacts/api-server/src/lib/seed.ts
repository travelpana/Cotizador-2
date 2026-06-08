import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { logger } from "./logger.js";

export async function seedDefaultUser(): Promise<void> {
  try {
    const existing = await db
      .select({ id: usuariosTable.id })
      .from(usuariosTable)
      .limit(1);

    if (existing.length > 0) return;

    const hash = await bcrypt.hash("rge2025", 10);
    await db.insert(usuariosTable).values({
      nombre: "Administrador",
      correo: "admin@rgestyletravel.com",
      contrasenaHash: hash,
      activo: true,
    });
    logger.info("Usuario por defecto creado: admin@rgestyletravel.com / rge2025");
  } catch (err) {
    logger.error({ err }, "Error al crear usuario por defecto");
  }
}
