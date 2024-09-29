import Destination from "../Models/dstModel.js";
import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";
import { destinationRequest } from "../utils/prepareRequest.js";
import { sendDestination } from "../utils/safeResponseObject.js";
import {
  addDestination,
  removeDestination,
  updateDestination,
} from "./userDestination.js";

async function isAllowed(id) {
  const user = await User.findById(id).select("+isPremium");
  return user.isPremium || user.destinationCount < 1;
}

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
  const id = req.user.id || req.user._id;
  createSendResponse(responseArray, 200, res, "destinations", id);
});

export const createDestination = asyncErrorHandler(async (req, res, next) => {
  const { destination, username, domain } = req.body;
  if (!destination || !username || !domain) {
    return next(
      new CustomError("Destination, username and domain are required", 400)
    );
  }
  console.log("createDestination was called", destination, username, domain);
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
    const response = await destinationRequest("POST", domain, destination);
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
      domain,
      destinationId: response.data.result.id,
      created,
      modified,
      verified,
    });

    const updatedUserQuery = await addDestination(req.user.id, {
      destinationEmail: destination,
      domain,
      verified: false,
      _id: newDestination._id,
    });
    if (!updatedUserQuery[0]) {
      return next(new CustomError(`Some Error From Our side`, 500));
    }
    newDestination.destinationId = newDestination._id;
    const id = req.user.id || req.user._id;
    const safeDestination = sendDestination(newDestination);
    createSendResponse(safeDestination, 201, res, "destination", id);
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});

export const deleteDestination = asyncErrorHandler(async (req, res, next) => {
  const destinationId = req.params.id;
  const { password } = req.body;
  if (!password) {
    return next(new CustomError("Password is required", 400));
  }
  const user = await User.findById(req.user.id).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new CustomError("Your current password is wrong", 401));
  }

  const localDestination = await Destination.findById(destinationId);
  if (!localDestination) {
    return next(new CustomError("No Address Found", 404));
  }

  if (localDestination.username !== req.user.username) {
    return next(new CustomError("Not allowed", 401));
  }

  const cfId = localDestination.destinationId;
  const { destination } = localDestination;

  try {
    const response = await destinationRequest(
      "DELETE",
      localDestination.domain,
      localDestination.destination,
      cfId
    );
    if (!response.data.success) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }

    await localDestination.deleteOne();

    const updatedUserQuery = await removeDestination(req.user.id, destination);
    if (!updatedUserQuery[0]) {
      return next(new CustomError(`Some Error From Our side`, 500));
    }
    const lid = req.user.id || req.user._id;

    createSendResponse(null, 204, res, "", lid);
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
    createSendResponse(
      sendDestination.localDestination,
      200,
      res,
      "destination",
      req.user.id
    );
  }
  const cfId = localDestination.destinationId;

  try {
    const response = await destinationRequest(
      "GET",
      localDestination.domain,
      localDestination.destination,
      cfId
    );
    if (response.data.success === false) {
      return next(new CustomError(response.data.errors[0].message, 400));
    }
    localDestination.verified = response.data.result.verified;
    // localDestination.verified = new Date(); // test
    await localDestination.save({ validateBeforeSave: false });

    const updatedUserQuery = await updateDestination(
      req.user.id,
      localDestination.destination,
      {
        destinationEmail: localDestination.destination,
        domain: localDestination.domain,
        verified: localDestination.verified ? true : false,
        _id: localDestination._id,
      }
    );
    if (!updatedUserQuery[0]) {
      return next(new CustomError(`Some Error From Our side`, 500));
    }
    const id = req.user.id || req.user._id;
    const safeDestination = sendDestination(localDestination);
    createSendResponse(safeDestination, 200, res, "destination", id);
  } catch (error) {
    return next(
      new CustomError(`Failed to contact Cloudflare: ${error.message}`, 500)
    );
  }
});
