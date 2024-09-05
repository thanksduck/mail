import jwt from "jsonwebtoken";
import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: "./config.env" });
}
function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

export default function createSendResponse(user, statusCode, res, responseName) {
  const token = signToken(user._id);
  const options = {
    maxAge: process.env.COOCKIE_EXPIRES,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
    options.sameSite = "strict";
  }

  res.cookie("jwt", token, options);
  delete user.password
  delete user._id;
  user.__v = undefined;
  const data = {
    [responseName]: user,
  };

  res.status(statusCode).json({
    status: "success",
    data,
  });
}
