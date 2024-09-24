import { connect } from "mongoose";
const PORT = process.env.PORT || 3456;
connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log("DB connection successful");
  })
  .catch((err) => {
    console.error(err);
  });

import app from "./app.js";

const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);

  console.log("Unhandled rejection Occurred Shutting down ...");
  server.close();
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.log(err.name, err.message);

  console.log("Uncaught exceptoin Occurred Shutting down ...");
  server.close();
  process.exit(1);
});
