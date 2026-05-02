import { Request, Response, NextFunction } from "express";

export const health_middleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next();
};
