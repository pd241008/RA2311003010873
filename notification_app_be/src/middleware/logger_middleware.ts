import { Request, Response, NextFunction } from "express";
import { Log } from "logging_middleware";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  Log("Backend", "DEBUG", "http", `Incoming request: ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "ERROR" : "INFO";
    Log("Backend", level, "http", `${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
  });
  
  next();
};
