import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import cotizacionRouter from "./cotizacion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(cotizacionRouter);

export default router;
