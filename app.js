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

// app.set('trust proxy', 1 /* 1. serve by nginx 2. Cloudflare DNS proxy right now 1 is fine for me since i extract IP myself from cloudflare */)
// app.get('/ip', (request, response) => response.send(request.ip))

app.use(helmet());
app.use(hpp());
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  console.log("Morgan is enabled");
  app.use(morgan("dev"));
}
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  const limiter = rateLimit({
    max: process.env.RATE_LIMIT_MAX,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again in an hour",
  });

  const authLimiter = rateLimit({
    max: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message:
      "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
  });
  app.use("/api", limiter);
  app.use("/api/v1/auth", authLimiter);
  app.use((req, res, next) => {
    req.requestedAt = new Date().toISOString();
    next();
  });
  app.use(morgan("combined"));
}

app.use(express.json({ limit: "10kb" }));

// ROUTES
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user/:username", userRouter);
app.use("/api/v1/mail", mailRouter);

app.use("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    currentTime: req.requestedAt,
    ipAddress: req.ip,
    message: `version 0.0.0.20.9 server is running`,
  });
});

app.all("*", (req, res, next) => {
  next(new CustomError(`Resource ${req.originalUrl} Not Found`, 404));
});

app.use(globalErrorHandler);
export default app;
