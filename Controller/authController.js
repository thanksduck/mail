import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import createSendResponse from "../utils/createSendResponse.js";
import sendEmail from "../utils/sendEmail.js";
import { sendUser } from "../utils/safeResponseObject.js";

export const signup = asyncErrorHandler(async (req, res, next) => {
  const { username, name, email, password, passwordConfirm } = req.body;

  if (!username || !name || !email || !password || !passwordConfirm) {
    return next(new CustomError("Please provide all the required fields", 400));
  }

  const userBody = { username, name, email, password, passwordConfirm };
  const newUser = await User.create(userBody);
  const id = newUser.id || newUser._id;
  const safeUser = sendUser(newUser);
  createSendResponse(safeUser, 201, res, "user", id);
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
  if (!user || !user.active || user.provider) {
    return next(new CustomError("Incorrect username or password", 401));
  }
  if (!(await user.correctPassword(password, user.password))) {
    return next(new CustomError("Incorrect email or password", 401));
  }
  const id = user.id || user._id;
  const safeUser = sendUser(user);
  createSendResponse(safeUser, 200, res, "user", id);
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
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      new CustomError(
        "Your Login Session has been expired. Please Login Again.",
        401
      )
    );
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

  const resetURL = `${req.get(
    "referrer"
  )}auth/reset-password/${resetToken}`;

  const message = `Forgot your password?
    Click on the given link to reset your password: ${resetURL}.
    If you didn't forget your password, please ignore this email!
    With love,
    One Alias Services.`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: `Reset Link sent to ${user.email}`,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new CustomError(
        "There was an error sending the email. Try again later!",
        500
      )
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
  await user.save();

  const safeUser = sendUser(user);
  createSendResponse(safeUser, 200, res, "user", user._id);
});

export const logout = asyncErrorHandler(async (req, res, next) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    scure: true,
  });
  res.status(200).json({ status: "success" });
});
