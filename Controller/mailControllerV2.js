import Rule from "../Models/ruleModel.js";
import User from "../Models/userModel.js";
import Destination from "../Models/dstModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";

import { createRuleRequest, d1Query } from "../utils/prepareRequest.js";
import { sendRule } from "../utils/safeResponseObject.js";

export const createRuleV2 = asyncErrorHandler(async (req, res, next) => {
  let { alias, destination } = req.body;
  if (!alias || !destination) {
    return next(
      new CustomError("Required fields are missing, alias and destination", 400)
    );
  }
  alias = alias.toLowerCase();
  destination = destination.toLowerCase();
  const username = req.user.username;
  const validDestination = await Destination.findOne({ destination });
  if (!validDestination || validDestination.username !== username) {
    return next(new CustomError("Destination Not Found", 401));
  }
  if (!validDestination.verified) {
    return next(
      new CustomError("Destination Not Verified Yet Check your mail/spam", 401)
    );
  }
  if (alias.split("@")[1] !== validDestination.domain) {
    return next(
      new CustomError("Alias and Destination domain does not match", 400)
    );
  }
  const existingAlias = await Rule.findOne({ alias });
  if (existingAlias) {
    return next(new CustomError("Alias or Rule Already Exist", 400));
  }
  if (!alias || !destination || !username) {
    return next(
      new CustomError(
        "Please provide all the required fields , alias , destination , username",
        400
      )
    );
  }
  try {
    const domain = alias.split("@")[1];

    // const response = await d1Query("INSERT INTO rules (alias, destination, username, domain) VALUES (?, ?, ?, ?)", [alias, destination, username, domain]);
    const response = await createRuleRequest(
      "POST",
      // domain,
      alias,
      destination,
      username
    );
    if (response.success === false) {
      return next(
        new CustomError(`${response.errors[0]} and ${response.message}`, 400)
      );
    }

    const newRule = await Rule.create({
      alias,
      destination,
      username,
      ruleId: alias,
      name: `Automated - created by ${username}`,
      enabled: true,
    });

    await User.findByIdAndUpdate(
      req.user.id,
      [
        {
          $addFields: {
            alias: {
              $cond: {
                if: { $in: [alias, "$alias"] },
                then: "$alias",
                else: { $concatArrays: ["$alias", [alias]] },
              },
            },
            destination: {
              $cond: {
                if: { $in: [destination, "$destination"] },
                then: "$destination",
                else: { $concatArrays: ["$destination", [destination]] },
              },
            },
          },
        },
        {
          $set: {
            aliasCount: { $size: "$alias" },
            destinationCount: { $size: "$destination" },
          },
        },
      ],
      { new: true, validateBeforeSave: false }
    );
    const safeRule = sendRule(newRule);
    const id = req.user.id || req.user._id;
    createSendResponse(safeRule, 201, res, "rule", id);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export const updateRuleV2 = asyncErrorHandler(async (req, res, next) => {
  const id = req.params.id;
  let rule;
  try {
    rule = await Rule.findById(id);
  } catch (error) {
    return next(new CustomError(`Rule Does not Found`, 404));
  }
  const oldAlias = rule.alias;
  const oldDestination = rule.destination;
  if (!rule.enabled) {
    return next(new CustomError("Rule Does not found", 404));
  }
  if (rule.username !== req.user.username) {
    return next(new CustomError("Unauthorized", 401));
  }
  let { alias, destination } = req.body;
  alias = alias.toLowerCase();
  destination = destination.toLowerCase();
  if (!alias || !destination) {
    return next(
      new CustomError("Required fields are missing, alias and destination", 400)
    );
  }
  // check if destination is valid and verified and belongs to the user
  const validDestination = await Destination.findOne({
    destination,
    username: req.user.username,
  });
  if (!validDestination) {
    return next(new CustomError("Destination Not Found", 401));
  }
  if (!validDestination.verified) {
    return next(
      new CustomError("Destination Not Verified Yet Check your mail/spam", 401)
    );
  }
  if (alias.split("@")[1] !== validDestination.domain) {
    return next(
      new CustomError("Alias and Destination domain does not match", 400)
    );
  }
  try {
    // First API call to update the existing rule to inactive
    const removeRule = await createRuleRequest(
      "DELETE",
      oldAlias,
      oldDestination,
      rule.username
    );
    if (removeRule.success === false) {
      return next(
        new CustomError(
          `${removeRule.errors[0]} and ${removeRule.message}`,
          400
        )
      );
    }
    const response = await createRuleRequest(
      "POST",
      alias,
      destination,
      rule.username
    );
    if (response.success === false) {
      return next(
        new CustomError(`${response.errors[0]} and ${response.message}`, 400)
      );
    }

    rule.alias = alias;
    rule.destination = destination;
    rule.name = `Automated - created by ${rule.username}`;
    rule.enabled = true;
    rule.ruleId = alias;
    await rule.save({ validateBeforeSave: false });
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      [
        {
          $set: {
            alias: {
              $map: {
                input: "$alias",
                as: "item",
                in: {
                  $cond: [{ $eq: ["$$item", oldAlias] }, alias, "$$item"],
                },
              },
            },
            destination: {
              $map: {
                input: "$destination",
                as: "item",
                in: {
                  $cond: [
                    { $eq: ["$$item", oldDestination] },
                    destination,
                    "$$item",
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            aliasCount: { $size: "$alias" },
            destinationCount: { $size: "$destination" },
          },
        },
      ],
      { new: true, validateBeforeSave: false }
    );

    if (!updatedUser) {
      throw new CustomError("User not found or update failed", 404);
    }
    const safeRule = sendRule(rule);
    const lid = req.user.id || req.user._id;
    createSendResponse(safeRule, 200, res, "rule", lid);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export const deleteRuleV2 = asyncErrorHandler(async (req, res, next) => {
  const id = req.params.id;
  const rule = await Rule.findById(id);
  if (!rule) {
    return next(new CustomError("Rule not found", 404));
  }

  const { alias, username, destination } = rule;

  if (username !== req.user.username) {
    return next(
      new CustomError("You are not authorized to access this rule", 401)
    );
  }
  try {
    // const response = await d1Query(
    //   "UPDATE rules SET active = 0 WHERE alias = ?",
    //   [alias]
    // );
    const response = await createRuleRequest(
      "DELETE",
      alias,
      destination,
      username
    );
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    await Rule.findByIdAndDelete(id);
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: {
          alias: alias,
        },
      },
      { new: true, validateBeforeSave: false }
    );

    if (!updatedUser) {
      throw new CustomError("User not found or Deletion failed", 404);
    }
    if (updatedUser) {
      updatedUser.aliasCount = updatedUser.alias.length;
      await updatedUser.save({ new: true, validateBeforeSave: false });
    }

    const id = req.user.id || req.user._id;
    createSendResponse(null, 204, res, "rule", id);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});
