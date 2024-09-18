import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import createSendResponse from "../utils/createSendResponse.js";
import sendEmail from "../utils/sendEmail.js";
import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: "../config.env" });
}

export const signup = asyncErrorHandler(async (req, res, next) => {
  const { username, name, email, password, passwordConfirm } = req.body;
  if (!username || !name || !email || !password || !passwordConfirm) {
    return next(new CustomError("Please provide all the required fields", 400));
  }
  const userbody = { username, name, email, password, passwordConfirm };
  const newUser = await User.create(userbody);
  const userObject = newUser.toObject();
  delete userObject.password;
  delete userObject.isPremium;
  delete userObject.active;
  createSendResponse(userObject, 201, res, "user");
});

export const login = asyncErrorHandler(async (req, res, next) => {
  const { username, email, password } = req.body;
  const check = username || email;
  if (!check || !password) {
    return next(
      new CustomError("Username/Email and Password Both are Required", 400)
    );
  }
  const user = await User.findOne({ $or: [{ username }, { email }] }).select(
    "+password +active"
  );
  if (!user || !user.active) {
    return next(new CustomError("Incorrect username or password", 401));
  }
  if (!(await user.correctPassword(password, user.password))) {
    return next(new CustomError("Incorrect email or password", 401));
  }
  createSendResponse(user, 200, res, "user");
});

export const protect = asyncErrorHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new CustomError("You are not logged in! Please login to get access.", 401)
    );
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if(!decoded){
    return next(new CustomError("Authentication Error", 401));
  }
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new CustomError(
        "Your Login Session has been expired. Please Login Again.",
        401
      )
    );
  }
  const changed = await currentUser.isPasswordChanged(decoded.iat);
  if (changed) {
    return next(
      new CustomError(
        "User recently changed password! Please login again.",
        401
      )
    );
  }
  req.user = currentUser;
  next();
});

export const forgetPassword = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new CustomError("Please provide your email", 400));
  }
  const user = await User.findOne({ email });
  if (!user) {
    return next(new CustomError("There is no user with that email", 404));
  }
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/resetPassword/${resetToken}`;
  const message = `Forgot your password? 
  Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
      html: htmlMessage,
    });
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new CustomError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

export const resetPassword = asyncErrorHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm) {
    return next(
      new CustomError("Please provide password and passwordConfirm", 400)
    );
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new CustomError("Token is invalid or has expired", 400));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: true });
  createSendResponse(user, 200, res, "user");
});

export const logout = asyncErrorHandler(async (req, res, next) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    scure: true,
  });
  res.status(200).json({ status: "success" });
});
