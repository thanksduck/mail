import User from "../Models/userModel.js";
import Rule from "../Models/ruleModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";

export const getUser = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  createSendResponse(user, 200, res);
});

export const getUserRouting = asyncErrorHandler(async (req, res, next) => {
  const { username } = req.user;
  const rules = await Rule.find({ username });
  if (!rules) {
    return next(new CustomError(`${username} has no Routing Rules`, 404));
  }
  const alias = [];
  const destination = [];
  const rulesArray = [];

  rules.forEach((rule) => {
    if (!alias.includes(rule.alias)) {
      alias.push(rule.alias);
    }
    if (!destination.includes(rule.destination)) {
      destination.push(rule.destination);
    }
    rulesArray.push({ alias: rule.alias, destination: rule.destination });
  });
  const user = {
    _id: req.user.id,
    username,
    alias,
    aliasCount: alias.length,
    destination,
    destinationCount: destination.length,
    rules: rulesArray,
    rulesCount: rulesArray.length,
  };

  createSendResponse(user, 200, res);
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
  const updatedUser = await user.save();
  const userObject = updatedUser.toObject();
  delete userObject.password;
  delete userObject.isPremium;
  delete userObject.active;
  createSendResponse(userObject, 200, res);
});

export const deleteMe = asyncErrorHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user.id, { active: false });
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  res.status(204).json({
    status: "success",
    data: null,
  });
});


export const updateMe = asyncErrorHandler(async (req, res, next) => {
  const { username, name, email } = req.body;
  if (!username || !name || !email) {
    return next(new CustomError("Please provide all the required fields", 400));
  }
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { username, name, email },
    { new: true }
  );
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.isPremium;
  delete userObject.active;
  createSendResponse(userObject, 200, res);
});