import { Router } from "express";
import { runScheduler } from "../../controllers/schedule_controller";

const router = Router();

router.get("/", runScheduler);

export default router;
