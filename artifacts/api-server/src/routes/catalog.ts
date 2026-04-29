import express, { Router, type IRouter } from "express";
import { loadCatalog, reloadCatalog, getFileInfo, replaceAndReload } from "../lib/excel";

const router: IRouter = Router();

router.get("/hoteles", (_req, res) => {
  const c = loadCatalog();
  res.json(c.hoteles);
});

router.get("/tours", (_req, res) => {
  const c = loadCatalog();
  res.json(c.tours);
});

router.get("/traslados", (_req, res) => {
  const c = loadCatalog();
  res.json(c.traslados);
});

router.get("/catalog", (_req, res) => {
  const c = loadCatalog();
  res.json(c);
});

router.get("/catalog/info", (_req, res) => {
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

router.post("/reload", (_req, res) => {
  const c = reloadCatalog();
  res.json({
    ok: true,
    counts: {
      hoteles: c.hoteles.length,
      tours: c.tours.length,
      traslados: c.traslados.length,
    },
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
      const c = replaceAndReload(buffer);
      const info = getFileInfo();
      res.json({
        ok: true,
        filename: info.filename,
        loadedAt: c.loadedAt,
        counts: {
          hoteles: c.hoteles.length,
          tours: c.tours.length,
          traslados: c.traslados.length,
        },
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: (e as Error).message });
    }
  },
);

export default router;
