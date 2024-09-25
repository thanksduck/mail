import Rule from "../Models/ruleModel.js";
import User from "../Models/userModel.js";
import Destination from "../Models/dstModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";
import axios from "axios";

const fullUrl = `${process.env.CF_URL_PREFIX}/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_DB_ID}/query`;

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
  alias = alias.toLowerCase();
  const validDestination = await Destination.findOne({ destination });
  if (!validDestination || validDestination.username !== username) {
    return next(new CustomError("Destination Not Found", 401));
  }
  if (!validDestination.verified) {
    return next(
      new CustomError("Destination Not Verified Yet Check your mail/spam", 401)
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
    const options = {
      method: "POST",
      url: fullUrl,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        Authorization: `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        sql: `
          INSERT INTO rules (alias, destination, username, domain)
          VALUES (?, ?, ?,?)
        `,
        params: [
          alias,
          destination,
          username,
          // new Date(),
          // `Automated - created by ${username}`,
          domain,
        ],
      },
    };

    const response = await axios(options);
    if (response.success === false) {
      return next(
        new CustomError(`${response.errors[0]} and ${response.message}`, 400)
      );
    }

    // console.log(response.result);

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
    const safeRule = {
      alias: newRule.alias,
      destination: newRule.destination,
      username: newRule.username,
      ruleId: newRule._id,
      name: newRule.name,
      // enabled: newRule.enabled,
    };
    const id = req.user.id || req.user._id;
    createSendResponse(safeRule, 201, res, "rule", id);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});

export const updateRuleV2 = asyncErrorHandler(async (req, res, next) => {
  const id = req.params.id;
  const rule = await Rule.findById(id);
  const oldAlias = rule.alias;
  const oldDestination = rule.destination;
  if (!rule) {
    return next(new CustomError("Rule not found", 404));
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
  try {
    const domain = alias.split("@")[1];
    const options = {
      method: "POST",
      url: fullUrl,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        Authorization: `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        sql: `
          UPDATE rules SET active = 0 WHERE alias = ?;
          INSERT INTO rules (alias, destination, username, domain)
          VALUES (?, ?, ?, ?);
        `,
        params: [
          rule.ruleId, // For the UPDATE statement
          alias,
          destination,
          rule.username,
          domain, // For the INSERT statement
        ],
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
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
    const safeRule = {
      alias,
      destination,
      username: rule.username,
      ruleId: id,
      name: rule.name,
      // enabled: newRule.enabled,
    };
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

  const { alias, destination, username } = rule;

  if (username !== req.user.username) {
    return next(
      new CustomError("You are not authorized to access this rule", 401)
    );
  }
  try {
    const options = {
      method: "POST",
      url: fullUrl,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        Authorization: `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        sql: `
          UPDATE rules SET active = 0 WHERE alias = ?;
        `,
        params: [alias],
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    rule.enabled = false;
    await rule.save({ validateBeforeSave: false });
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: {
          alias: alias,
        },
        $set: { aliasCount: { $size: "$alias" } },
      },
      { new: true, validateBeforeSave: false }
    );

    if (!updatedUser) {
      throw new CustomError("User not found or Deletion failed", 404);
    }
    const id = req.user.id || req.user._id;
    createSendResponse(null, 204, res, "rule", id);
  } catch (error) {
    return next(new CustomError(`Operation failed: ${error.message}`, 500));
  }
});
