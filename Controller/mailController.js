import Rule from "../Models/ruleModel.js";
import User from "../Models/userModel.js";
import Destination from "../Models/dstModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";
import axios from "axios";

export const createRule = asyncErrorHandler(async (req, res, next) => {
  const { alias, destination } = req.body;
  const username = req.user.username;
  const validDestination = await Destination.findOne({ destination });
  if (!validDestination || validDestination.username !== username) {
    return next(new CustomError("Destination Not Found", 401));
  }
  if (!validDestination.verified) {
    return next(new CustomError("Destination Not Verified Yet Check your mail/spam", 401));
  }
  const existingAlias = await Rule.findOne({ alias });
  if (existingAlias ) {
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
    const options = {
      method: "POST",
      url: `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/email/routing/rules`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        actions: [{ type: "forward", value: [destination] }],
        enabled: true,
        matchers: [{ field: "to", type: "literal", value: alias }],
        name: `Automated - created by ${username}`,
        priority: 0,
      },
    };

    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }

    const newRule = await Rule.create({
      alias,
      destination,
      username,
      ruleId: response.data.result.id,
      name: response.data.result.name,
      enabled: response.data.enabled,
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

    newRule.RuleId = newRule._id;
    newRule._id = req.user.id;
    createSendResponse(newRule, 201, res);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export const readRule = asyncErrorHandler(async (req, res, next) => {
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
  rule.ruleId = id;
  rule._id = req.user.id;
  createSendResponse(rule, 200, res);
});

export const updateRule = asyncErrorHandler(async (req, res, next) => {
  const id = req.params.id;
  const rule = await Rule.findById(id);
  if (!rule) {
    return next(new CustomError("Rule not found", 404));
  }
  if (rule.username !== req.user.username) {
    return next(new CustomError("Unauthorized", 401));
  }
  const { alias, destination } = req.body;
  if (!alias || !destination) {
    return next(
      new CustomError("Required fields are missing, alias and destination", 400)
    );
  }
  try {
    const options = {
      method: "PUT",
      url: `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/email/routing/rules/${rule.ruleId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        actions: [{ type: "forward", value: [destination] }],
        enabled: true,
        matchers: [{ field: "to", type: "literal", value: alias }],
        name: `Automated - created by ${req.user.username}`,
        priority: 0,
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    rule.alias = alias;
    rule.destination = destination;
    rule.name = response.data.result.name;
    rule.enabled = response.data.enabled;
    await rule.save({ validateBeforeSave: false });
    rule._id = req.user.id;
    rule.ruleId = id;
    createSendResponse(rule, 200, res);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export const deleteRule = asyncErrorHandler(async (req, res, next) => {
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
    const options = {
      method: "DELETE",
      url: `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/email/routing/rules/${rule.ruleId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    await rule.deleteOne();
    const safeObject = { _id: req.user.id };
    createSendResponse(safeObject, 204, res);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});
