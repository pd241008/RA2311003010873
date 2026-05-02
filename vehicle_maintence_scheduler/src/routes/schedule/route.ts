import { Router } from "express";
import { scheduleController } from "../../controllers/schedule_controller";

const router = Router();

router.get("/", scheduleController);

export default router;
