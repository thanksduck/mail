import { connect } from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 3456;

const connectWithRetry = async () => {
  try {
    await connect(process.env.MONGO_URI, {});
    console.log("DB connection successful");
  } catch (err) {
    console.error("Database connection error:", err);
    console.log("Retrying DB connection in 5 seconds...");
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

const server = app.listen(PORT, (err) => {
  if (err) {
    console.error("Server connection error:", err);
  }
  console.log(`Server is running on port ${PORT}`);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection occurred:", err.name, err.message);
  server.close(() => {
    console.log("Shutting down due to unhandled rejection...");
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception occurred:", err.name, err.message);
  server.close(() => {
    console.log("Shutting down due to uncaught exception...");
    process.exit(1);
  });
});
