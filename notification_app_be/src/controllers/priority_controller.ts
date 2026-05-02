import { Request, Response } from "express";
import { getPriorityInbox } from "../services/priority_service";
import { Log } from "logging_middleware";

export const getInboxController = async (req: Request, res: Response) => {
  try {
    const topN = req.query.limit ? parseInt(req.query.limit as string) : 10;
    Log("Backend", "INFO", "priority-controller", `Request to fetch top ${topN} priority inbox items`);
    const results = await getPriorityInbox(topN);
    res.json({ success: true, data: results });
  } catch (error: any) {
    Log("Backend", "ERROR", "priority-controller", `Failed to fetch inbox: ${error.message}`);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
