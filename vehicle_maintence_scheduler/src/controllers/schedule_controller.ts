import { Request, Response } from "express";
import { generateSchedule } from "../services/scheduler_service";
import { Log } from "logging_middleware";

export const runScheduler = async (req: Request, res: Response) => {
  try {
    Log("Backend", "INFO", "controller", "received request to generate schedule");
    const results = await generateSchedule();
    res.json({ success: true, data: results });
  } catch (error: any) {
    Log("Backend", "ERROR", "controller", `failed to generate schedule: ${error.message}`);
    res.status(500).json({ success: false, error: "server error" });
  }
};
