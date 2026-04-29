import express from "express";
import dotenv from "dotenv";
import securityAlignedRoutes from "./routes/securityAlignedRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

app.use(express.json());
app.use(securityAlignedRoutes);
app.use(errorHandler);

export default app;