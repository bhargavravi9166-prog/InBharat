import { Router, type IRouter } from "express";
import healthRouter from "./health";
import heritageRouter from "./heritage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(heritageRouter);

export default router;
