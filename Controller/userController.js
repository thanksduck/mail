import User from "../Models/userModel.js";
import Rule from "../Models/ruleModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";

export const getUser = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) {
    return next(new CustomError("User not found", 404,id));
  }
  createSendResponse(user, 200, res,"user");
});


export const updatePassword = asyncErrorHandler(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    return next(new CustomError("Please provide all the required fields", 400));
  }
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  const updatedUser = await user.save({ validateBeforeSave: true });
  createSendResponse(updatedUser, 200, res,"user");
});

export const deleteMe = asyncErrorHandler(async (req, res, next) => {
  const { currentPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password active");
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }
  user.active = false;
  await user.save({ validateBeforeSave: false });
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
  user.isPremium = undefined;
  user.active = undefined;
  createSendResponse(user, 200, res,"user");
});
