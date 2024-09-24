import jwt from "jsonwebtoken";

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

export default function createSendResponse(
  user,
  statusCode,
  res,
  responseName,
  lid
) {
  const id = lid || user.id || user._id;
  const token = signToken(id);
  const options = {
    maxAge: process.env.COOCKIE_EXPIRES,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
    options.sameSite = "strict";
  }

  res.cookie("jwt", token, options);

  if (Array.isArray(user)) {
    // Directly return the response if user is an array
    return res.status(statusCode).json({
      status: "success",
      data: {
        [responseName]: user,
      },
    });
  }

  // Remove sensitive fields if they exist


  const data = {
    [responseName]: user,
  };

  res.status(statusCode).json({
    status: "success",
    data,
  });
}
