import Destination from "../Models/dstModel.js";
import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";
import axios from "axios";

async function isAllowed(id) {
  const user = await User.findById(id).select("+isPremium");
  return user.isPremium || user.destinationCount < 2;
}

export const listDestination = asyncErrorHandler(async (req, res, next) => {
  const username = req.user.username;
  const destinations = await Destination.find({ username })
  if (!destinations) {
    return next(new CustomError("No Destination Found", 404));
  }
  const responseArray = [];
  destinations.forEach((destination) => {
    responseArray.push({
      destinationId: destination._id,
      destination: destination.destination,
      verified: destination.verified,
    });
  });
  const safeResponse = {
    _id: req.user.id,
    username,
    destinationCount: destinations.length,
    destinations: responseArray,
  };
  createSendResponse(safeResponse, 200, res);
});

export const createDestination = asyncErrorHandler(async (req, res, next) => {
  const { destination, username } = req.body;
  const allowed = await isAllowed(req.user.id);
  if (!allowed) {
    return next(
      new CustomError("You have reached the limit of destinations", 400)
    );
  }
  const existingDestination = await Destination.findOne({ destination });
  if (existingDestination) {
    return next(
      new CustomError(
        "Destination already exists, may check your mail for verification",
        400
      )
    );
  }
  try {
    const options = {
      method: "POST",
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/email/routing/addresses`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        Authorization: `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        email: destination,
      },
    };

    const response = await axios(options);
    if (response.data.success === false) {
      return next(
        new CustomError(
          `${response.data.errors} and ${response.data.message}`,
          400
        )
      );
    }

    const { created, modified, verified } = response.data.result;
    const newDestination = await Destination.create({
      destination,
      username,
      destinationId: response.data.result.id,
      created,
      modified,
      verified,
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      [
        {
          $addFields: {
            destination: {
              $cond: {
                if: { $isArray: "$destination" },
                then: { $setUnion: ["$destination", [destination]] },
                else: [destination],
              },
            },
          },
        },
        {
          $set: {
            destinationCount: { $size: { $ifNull: ["$destination", []] } },
          },
        },
      ],
      {
        new: true,
      }
    );
    createSendResponse(user, 201, res);
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});

export const deleteDestination = asyncErrorHandler(async (req, res, next) => {
  const destinationId = req.params.id;
  const username = req.user.username;
  const localDestination = await Destination.findById(destinationId);
  if (!localDestination) {
    return next(new CustomError("No Address Found", 404));
  }
  if (localDestination.username !== username) {
    return next(new CustomError("Not allowed", 401));
  }
  const cfId = localDestination.destinationId;
  const { destination } = localDestination;
  try {
    const options = {
      method: "DELETE",
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/email/routing/addresses/${cfId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    await localDestination.deleteOne();
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: { destination: destination },
        $set: { destinationCount: { $size: "$destination" } },
      },
      { new: true, validateBeforeSave: false }
    );
    const user = { _id: req.user.id };
    createSendResponse(user, 204, res);
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});

export const isVerified = asyncErrorHandler(async (req, res, next) => {
  const destinationId = req.params.id;
  const username = req.user.username;
  const localDestination = await Destination.findById(destinationId);
  if (!localDestination) {
    return next(new CustomError("No Destination Found", 404));
  }
  if (localDestination.username !== username) {
    return next(new CustomError("Not allowed", 401));
  }
  const cfId = localDestination.destinationId;

  try {
    const options = {
      method: "GET",
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/email/routing/addresses/${cfId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    localDestination.verified = response.data.result.verified;
    await localDestination.save({ validateBeforeSave: false });

    localDestination._id = req.user.id;
    localDestination.verified = response.data.result.verified;
    delete localDestination.destinationId;
    createSendResponse(localDestination, 200, res);
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});
