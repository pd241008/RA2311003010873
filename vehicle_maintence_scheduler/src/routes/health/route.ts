import { Router } from "express";
import { health_controller } from "../../controllers/health_controller";
import { health_middleware } from "../../middleware/health_middleware";

const router = Router();

router.get("/", health_middleware, health_controller);

export default router;
