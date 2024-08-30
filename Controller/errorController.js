import CustomError from "../utils/CustomError.js";

const devError = (res, err) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const prodError = (res, err) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR: ", err);

    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
}

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    devError(res, err);
  } else if (process.env.NODE_ENV === "production") {
    prodError(res, err);
  }
}