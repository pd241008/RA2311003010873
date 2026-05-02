import path from "path";
import { Express } from "express";
import { ExpressKitConfig } from "./expresskit.config";

// RE-EXPORT THE ERROR HANDLER HERE
// This abstracts the ugly path away from the user
export { errorHandler as ExpressKitError } from "../../.expresskit/error_handling/handler";

export async function loadExpressKit(app: Express) {
  const base = path.join(process.cwd(), ".expresskit");

  const { default: default_route } = await import(
    path.join(base, "default_route")
  );

  const { load_routes } = await import(
    path.join(base, "route_loader")
  );

  app.use("/", default_route);

  const routesPath = path.join(
    process.cwd(),
    ExpressKitConfig.loadRoutesFrom
  );

  await load_routes(app, routesPath);
}
