import { Router } from "express";
import { ExpressKitConfig } from "../src/config/expresskit.config";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    framework: "ExpressKit",
    status: "running",
    message: ExpressKitConfig.defaultRouteMessage,
  });
});

export default router;
