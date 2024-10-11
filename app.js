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
  const customLogFormat = ":remote-addr [:date[web]] request-[ :method :url HTTP/:http-version ] response- [ :status :res[content-length]B - :response-time ms ] extra- [ :referrer ]";
  app.use(morgan(customLogFormat));
}

app.use(express.json({ limit: "100kb" }));

// ROUTES
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user/:username", userRouter);
app.use("/api/v1/mail", mailRouter);

app.use("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    ipAddress: req.ip,
    message: `version 0.0.1.10.10 server is running`,
  });
});

app.all("*", (req, res, next) => {
  next(new CustomError(`Resource ${req.originalUrl} Not Found`, 404));
});

app.use(globalErrorHandler);
export default app;
