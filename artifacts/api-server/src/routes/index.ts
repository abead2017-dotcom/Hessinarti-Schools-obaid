import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import storageRouter from "./storage.js";
import mobileAuthRouter from "./mobile-auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(mobileAuthRouter);

export default router;
