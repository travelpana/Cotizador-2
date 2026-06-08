/**
 * seedUsers — Lista de usuarios iniciales del sistema.
 *
 * Para agregar más usuarios, añade una entrada a SEED_USERS.
 * Las contraseñas se guardan hasheadas; aquí se ponen en texto plano.
 * Solo se crean los usuarios que NO existan en la base de datos (por correo).
 */

import bcrypt from "bcryptjs";
import { db, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

interface SeedUser {
  nombre: string;
  correo: string;
  password: string;
  activo: boolean;
}

const SEED_USERS: SeedUser[] = [
  {
    nombre: "Administrador",
    correo: "admin@rgestyletravel.com",
    password: "rge2025",
    activo: true,
  },
  // Para agregar más usuarios, copia el bloque anterior y edita los campos:
  // {
  //   nombre: "Nombre Apellido",
  //   correo: "usuario@rgestyletravel.com",
  //   password: "contraseña-segura",
  //   activo: true,
  // },
];

export async function seedUsers(): Promise<void> {
  try {
    for (const u of SEED_USERS) {
      const correo = u.correo.trim().toLowerCase();
      const [existing] = await db
        .select({ id: usuariosTable.id })
        .from(usuariosTable)
        .where(eq(usuariosTable.correo, correo))
        .limit(1);

      if (existing) {
        logger.debug({ correo }, "Usuario ya existe, omitiendo seed");
        continue;
      }

      const contrasenaHash = await bcrypt.hash(u.password, 10);
      await db.insert(usuariosTable).values({
        nombre: u.nombre,
        correo,
        contrasenaHash,
        activo: u.activo,
      });
      logger.info({ correo }, "Usuario inicial creado");
    }
  } catch (err) {
    logger.error({ err }, "Error al ejecutar seedUsers");
  }
}
