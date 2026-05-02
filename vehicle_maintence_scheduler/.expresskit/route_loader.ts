import fs from "fs";
import path from "path";
import { Express } from "express";
import { ExpressKitConfig } from "../src/config/expresskit.config";

export async function load_routes(app: Express, routesPath: string) {
  if (!fs.existsSync(routesPath)) return;

  const entries = fs.readdirSync(routesPath);

  for (const entry of entries) {
    const base = path.join(routesPath, entry, "route");

    const file =
      fs.existsSync(base + ".ts")
        ? base + ".ts"
        : fs.existsSync(base + ".js")
        ? base + ".js"
        : null;

    if (!file) continue;

    const mod = await import(file);
    app.use(`${ExpressKitConfig.routePrefix}/${entry}`, mod.default);
  }
}
