import User from "../../Models/userModel.js";
import asyncErrorHandler from "../../utils/asyncErrorHandler.js";
import CustomError from "../../utils/CustomError.js";
import createSendResponse from "../../utils/createSendResponse.js";
import { sendUser } from "../../utils/safeResponseObject.js";

export const getUser = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  const safeUser = sendUser(user);
  createSendResponse(safeUser, 200, res, "user", id);
});

export const updatePassword = asyncErrorHandler(async (req, res, next) => {
  const { currentPassword, password, passwordConfirm } = req.body;
  if (!currentPassword || !password || !passwordConfirm) {
    return next(new CustomError("Please provide all the required fields", 400));
  }
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  const updatedUser = await user.save({ validateBeforeSave: true });
  const id = req.user.id || req.user._id || updatedUser.id || updatedUser._id;
  const safeUser = {
    username: user.username,
    name: user.name,
    email: user.email,
    alias: user.alias,
    aliasCount: user.aliasCount,
    destination: user.destination,
    destinationCount: user.destinationCount,
  };
  createSendResponse(safeUser, 200, res, "user", id);
});

export const deleteMe = asyncErrorHandler(async (req, res, next) => {
  const { password } = req.body;
  if (!password) {
    return next(new CustomError("Please provide your current password", 400));
  }
  const user = await User.findById(req.user.id).select("+password active");
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  if (!(await user.correctPassword(password, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }
  user.active = false;
  await user.save({ validateBeforeSave: false });
  console.log(`User ${user.username} deleted`);
  res.clearCookie('jwt');
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const updateMe = asyncErrorHandler(async (req, res, next) => {
  const { username, name, email } = req.body;
  const updateFields = {};
  if (username) updateFields.username = username;
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (Object.keys(updateFields).length === 0) {
    return next(new CustomError("No fields provided for update", 400));
  }

  const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
    new: true,
    runValidators: true,
    context: "query",
  });
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  const safeUser = {
    username: user.username,
    name: user.name,
    email: user.email,
    alias: user.alias,
    aliasCount: user.aliasCount,
    destination: user.destination,
    destinationCount: user.destinationCount,
  };
  createSendResponse(safeUser, 200, res, "user", req.user.id);
});
