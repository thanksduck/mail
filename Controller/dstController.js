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

const distPath = "email/routing/addresses";
const cfUrl = process.env.CF_URL_PREFIX;
const cfAcId = process.env.CF_ACCOUNT_ID;

export const listDestination = asyncErrorHandler(async (req, res, next) => {
  const username = req.user.username;
  const destinations = await Destination.find({ username });
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
  createSendResponse(safeResponse, 200, res, "destinations");
});

export const createDestination = asyncErrorHandler(async (req, res, next) => {
  const { destination, username } = req.body;
  if (username !== req.user.username) {
    return next(new CustomError("Not allowed", 401));
  }
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
      url: `${cfUrl}/accounts/${cfAcId}/email/routing/addresses`,
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
    newDestination.destinationId = newDestination._id;
    newDestination._id = req.user.id;
    createSendResponse(newDestination, 201, res, "destination");
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});

export const deleteDestination = asyncErrorHandler(async (req, res, next) => {
  const destinationId = req.params.id;
  const { password } = req.body;

  // Find the user and check password
  const user = await User.findById(req.user.id).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }

  // Find the destination
  const localDestination = await Destination.findById(destinationId);
  if (!localDestination) {
    return next(new CustomError("No Address Found", 404));
  }

  // Check if user is allowed to delete
  if (localDestination.username !== req.user.username) {
    return next(new CustomError("Not allowed", 401));
  }

  const cfId = localDestination.destinationId;
  const { destination } = localDestination;

  // Try to delete the destination from Cloudflare
  try {
    const options = {
      method: "DELETE",
      url: `${cfUrl}/accounts/${cfAcId}/${distPath}/${cfId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        "Authorization": `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const response = await axios(options);
    if (!response.data.success) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }

    // Delete destination locally
    await localDestination.deleteOne();

    // Update user's destinations
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: { destination: destination },
        $set: { destinationCount: { $size: "$destination" } },
      },
      { new: true, validateBeforeSave: false }
    );

    // Send the response
    const updatedUser = { _id: req.user.id };
    createSendResponse(updatedUser, 204, res);
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
  if (localDestination.verified) {
    return next(new CustomError("Destination already verified", 400));
  }
  const cfId = localDestination.destinationId;

  try {
    const options = {
      method: "GET",
      url: `${cfUrl}/accounts/${cfAcId}/${distPath}/${cfId}`,
      headers: {
        "X-Auth-Email": process.env.CF_EMAIL,
        Authorization: `Bearer ${process.env.CF_API_KEY}`,
        "Content-Type": "application/json",
      },
    };
    const response = await axios(options);
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    localDestination.verified = response.data.result.verified;
    await localDestination.save({ validateBeforeSave: false });

    localDestination.destinationId = localDestination._id;
    localDestination._id = req.user.id;
    localDestination.verified = response.data.result.verified;
    delete localDestination.destinationId;
    createSendResponse(localDestination, 200, res, "destination");
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});
