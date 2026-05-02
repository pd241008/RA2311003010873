import express from "express";
import cors from "cors";
import morgan from "morgan";
import { loadExpressKit, ExpressKitError } from "./config/expresskit.bridge";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

loadExpressKit(app);


app.use(ExpressKitError);

export default app;
