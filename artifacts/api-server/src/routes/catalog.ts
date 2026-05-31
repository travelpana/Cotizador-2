import express, { Router, type IRouter } from "express";
import {
  loadCatalog,
  reloadCatalog,
  getFileInfo,
  replaceAndReload,
  loadBrasilCatalog,
  reloadBrasilCatalog,
  getBrasilFileInfo,
  replaceAndReloadBrasil,
} from "../lib/excel";

const router: IRouter = Router();

function isBrasil(req: express.Request): boolean {
  return req.query["mercado"] === "brasil";
}

router.get("/hoteles", (req, res) => {
  const c = isBrasil(req) ? loadBrasilCatalog() : loadCatalog();
  res.json(c.hoteles);
});

router.get("/tours", (req, res) => {
  const c = isBrasil(req) ? loadBrasilCatalog() : loadCatalog();
  res.json(c.tours);
});

router.get("/traslados", (req, res) => {
  const c = isBrasil(req) ? loadBrasilCatalog() : loadCatalog();
  res.json(c.traslados);
});

router.get("/catalog", (req, res) => {
  const c = isBrasil(req) ? loadBrasilCatalog() : loadCatalog();
  res.json(c);
});

router.get("/catalog/info", (req, res) => {
  if (isBrasil(req)) {
    const info = getBrasilFileInfo();
    const c = loadBrasilCatalog();
    res.json({
      filename: info.filename,
      loadedAt: info.loadedAt,
      exists: info.exists,
      counts: {
        hoteles: c.hoteles.length,
        tours: c.tours.length,
        traslados: c.traslados.length,
      },
    });
    return;
  }
  const info = getFileInfo();
  const c = loadCatalog();
  res.json({
    filename: info.filename,
    loadedAt: info.loadedAt,
    counts: {
      hoteles: c.hoteles.length,
      tours: c.tours.length,
      traslados: c.traslados.length,
    },
  });
});

router.post("/reload", (req, res) => {
  if (isBrasil(req)) {
    const c = reloadBrasilCatalog();
    res.json({
      ok: true,
      counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length },
      loadedAt: c.loadedAt,
    });
    return;
  }
  const c = reloadCatalog();
  res.json({
    ok: true,
    counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length },
    loadedAt: c.loadedAt,
  });
});

router.post(
  "/upload",
  express.raw({ type: "*/*", limit: "50mb" }),
  (req, res) => {
    try {
      const buffer = req.body as Buffer;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        res.status(400).json({ ok: false, error: "Archivo vacío o inválido" });
        return;
      }
      if (isBrasil(req)) {
        const c = replaceAndReloadBrasil(buffer);
        const info = getBrasilFileInfo();
        res.json({
          ok: true,
          filename: info.filename,
          loadedAt: c.loadedAt,
          counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length },
        });
        return;
      }
      const c = replaceAndReload(buffer);
      const info = getFileInfo();
      res.json({
        ok: true,
        filename: info.filename,
        loadedAt: c.loadedAt,
        counts: { hoteles: c.hoteles.length, tours: c.tours.length, traslados: c.traslados.length },
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: (e as Error).message });
    }
  },
);

export default router;
