import { Router } from "express";
import { getInbox } from "../../controllers/priority_controller";

const router = Router();

router.get("/", getInbox);

export default router;
