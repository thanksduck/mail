import Rule from "../../Models/ruleModel.js";
import Destination from "../../Models/dstModel.js";
import asyncErrorHandler from "../../utils/asyncErrorHandler.js";
import CustomError from "../../utils/CustomError.js";
import createSendResponse from "../../utils/createSendResponse.js";

import { createRuleRequest, d1Query } from "../../utils/prepareRequest.js";
// import { createRule, removeRule } from "../../utils/rulesRequest.js";
import { sendRule } from "../../utils/safeResponseObject.js";

import { addAlias, updateAlias, removeAlias } from "../User/userAlias.js";

const createRuleV2 = asyncErrorHandler(async (req, res, next) => {
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
  // update this and check domain from hidden function named selectDomain as this will fail if alias is not in the format of alias@domain and rather alias@subdoamin.domain
  if (!alias.split("@")[1].endsWith(validDestination.domain)) {
    return next(new CustomError("Alias from this Domain is not allowed", 400));
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

    const updatedUserQuery = await addAlias(req.user.id, {
      id: newRule._id,
      aliasEmail: alias,
      destinationEmail: destination,
      active: true,
    });
    if (!updatedUserQuery[0]) {
      return next(new CustomError("User not found or update failed", 404));
    }
    const safeRule = sendRule(newRule);
    const id = req.user.id || req.user._id;
    createSendResponse(safeRule, 201, res, "rule", id);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

const updateRuleV2 = asyncErrorHandler(async (req, res, next) => {
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
  // update this and check domain from hidden function named selectDomain as this will fail if alias is not in the format of alias@domain and rather
  if (!alias.split("@")[1].endsWith(validDestination.domain)) {
    return next(new CustomError("Alias from this Domain is not allowed", 400));
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

    const updatedUserQuery = await updateAlias(req.user.id, oldAlias, {
      aliasEmail: alias,
      destinationEmail: destination,
      active: true,
    });

    if (!updatedUserQuery[0]) {
      throw new CustomError("User not found or update failed", 404);
    }
    const safeRule = sendRule(rule);
    const lid = req.user.id || req.user._id;
    createSendResponse(safeRule, 200, res, "rule", lid);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

const toggleRuleV2 = asyncErrorHandler(async (req, res, next) => {
  const id = req.params.id;
  const rule = await Rule.findById(id);
  if (!rule) {
    return next(new CustomError("Rule not found", 404));
  }
  if (rule.username !== req.user.username) {
    return next(
      new CustomError("You are not authorized to access this rule", 401)
    );
  }

  try {
    const response = await createRuleRequest(
      "PATCH",
      rule.alias,
      rule.destination,
      rule.username
    );
    if (response.success === false) {
      return next(
        new CustomError(`${response.errors[0]} and ${response.message}`, 400)
      );
    }
    rule.enabled = !rule.enabled;
    await rule.save({ validateBeforeSave: false });
    const updatedUserQuery = await updateAlias(req.user.id, rule.alias, {
      aliasEmail: rule.alias,
      destinationEmail: rule.destination,
      active: rule.enabled,
    });
    if (!updatedUserQuery[0]) {
      throw new CustomError("User not found or update failed", 404);
    }
    const safeRule = sendRule(rule);
    const lid = req.user.id || req.user._id;
    createSendResponse(safeRule, 200, res, "rule", lid);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

const deleteRuleV2 = asyncErrorHandler(async (req, res, next) => {
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
    const updatedUserQuery = await removeAlias(req.user.id, alias);
    if (!updatedUserQuery[0]) {
      throw new CustomError("User not found or Deletion failed", 404);
    }

    const lid = req.user.id || req.user._id;
    createSendResponse(null, 204, res, "rule", lid);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export { createRuleV2, updateRuleV2, toggleRuleV2, deleteRuleV2 };