import { loadPlantillas, savePlantillas } from "@/lib/plantillas";
import { loadDescriptivosLS, saveDescriptivosLS } from "@/lib/descriptivos";
import { loadObservaciones, saveObservaciones } from "@/lib/observaciones";
import {
  loadHotelesLS,
  saveHotelesLS,
  loadToursLS,
  saveToursLS,
  loadTrasladosLS,
  saveTrasladosLS,
} from "@/lib/tarifas";

export type BackupType = "full" | "plantillas";

export interface RgeBackup {
  version: 1;
  type: BackupType;
  exportedAt: string;
  plantillas?: ReturnType<typeof loadPlantillas>;
  descriptivos?: ReturnType<typeof loadDescriptivosLS>;
  observaciones?: ReturnType<typeof loadObservaciones>;
  tarifas?: {
    hoteles: ReturnType<typeof loadHotelesLS>;
    tours: ReturnType<typeof loadToursLS>;
    traslados: ReturnType<typeof loadTrasladosLS>;
  };
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarRespaldoCompleto(): void {
  const backup: RgeBackup = {
    version: 1,
    type: "full",
    exportedAt: new Date().toISOString(),
    plantillas: loadPlantillas(),
    descriptivos: loadDescriptivosLS(),
    observaciones: loadObservaciones(),
    tarifas: {
      hoteles: loadHotelesLS(),
      tours: loadToursLS(),
      traslados: loadTrasladosLS(),
    },
  };
  downloadJson(backup, `RGE_Backup_${todayString()}.json`);
}

export function exportarRespaldoPlantillas(): void {
  const backup: RgeBackup = {
    version: 1,
    type: "plantillas",
    exportedAt: new Date().toISOString(),
    plantillas: loadPlantillas(),
  };
  downloadJson(backup, `RGE_Plantillas_${todayString()}.json`);
}

export type ImportResult =
  | { ok: true; tipo: BackupType }
  | { ok: false; error: string };

function isValidBackup(data: unknown): data is RgeBackup {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (d.type !== "full" && d.type !== "plantillas") return false;
  if (typeof d.exportedAt !== "string") return false;
  return true;
}

export async function importarRespaldo(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!isValidBackup(data)) {
      return { ok: false, error: "Archivo de respaldo inválido" };
    }

    if (data.plantillas !== undefined) {
      savePlantillas(data.plantillas);
    }

    if (data.type === "full") {
      if (data.descriptivos !== undefined) {
        saveDescriptivosLS(data.descriptivos);
      }
      if (data.observaciones !== undefined) {
        saveObservaciones(data.observaciones);
      }
      if (data.tarifas !== undefined) {
        saveHotelesLS(data.tarifas.hoteles ?? []);
        saveToursLS(data.tarifas.tours ?? []);
        saveTrasladosLS(data.tarifas.traslados ?? []);
      }
    }

    return { ok: true, tipo: data.type };
  } catch {
    return { ok: false, error: "Archivo de respaldo inválido" };
  }
}
