import { Router } from "express";
import { getInboxController } from "../../controllers/priority_controller";

const router = Router();

router.get("/", getInboxController);

export default router;
