import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vibedeoRouter from "./vibedeo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vibedeoRouter);

export default router;
