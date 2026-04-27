import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import cotizacionRouter from "./cotizacion";
import descriptivosRouter from "./descriptivos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(cotizacionRouter);
router.use(descriptivosRouter);

export default router;
