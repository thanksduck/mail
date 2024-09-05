import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: "./config.env" });
}
import express from "express";
import morgan from "morgan";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import mailRouter from "./routes/mailRoutes.js";

import CustomError from "./utils/CustomError.js";
import globalErrorHandler from "./Controller/errorController.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
const app = express();

app.use(helmet());
app.use(hpp());
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  console.log("Morgan is enabled");
  app.use(morgan("dev"));
}
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
}

const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour",
});

app.use("/api", limiter);

app.use((req, res, next) => {
  req.requestedAt = new Date().toISOString();
  next();
});

app.use(express.json({ limit: "10kb" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user/:username", userRouter);
app.use("/api/v1/mail", mailRouter);

app.use("/health", (req, res) => {

  res.status(200).json({
    status: "success",
    message: "version 1.0.0.5.9 server is running",
  });
});

app.all("*", (req, res, next) => {
  next(new CustomError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);
export default app;
