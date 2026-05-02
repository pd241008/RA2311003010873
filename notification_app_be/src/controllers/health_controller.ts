import { Request, Response } from "express";
import { health_service } from "../services/health_service";

export const health_controller = (_req: Request, res: Response) => {
  res.json(health_service());
};
