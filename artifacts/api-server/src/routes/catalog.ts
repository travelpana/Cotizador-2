import { Router, type IRouter } from "express";
import { loadCatalog, reloadCatalog } from "../lib/excel";

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

export default router;
