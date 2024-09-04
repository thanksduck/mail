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

export default function createSendResponse(user, statusCode, res) {
  const token = signToken(user._id);
  const options = {
    maxAge: process.env.COOCKIE_EXPIRES,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.cookie("jwt", token, options);
  user.password = undefined;
  user._id = undefined;
  user.__v = undefined;
  res.status(statusCode).json({
    status: "success",
    data: {
      user,
    },
  });
}
