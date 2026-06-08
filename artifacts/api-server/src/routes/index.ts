import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import cotizacionRouter from "./cotizacion";
import descriptivosRouter from "./descriptivos";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(cotizacionRouter);
router.use(descriptivosRouter);
router.use(authRouter);

export default router;
