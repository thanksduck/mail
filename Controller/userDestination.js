import User from "../Models/userModel.js";

const addDestination = async (userId, newDestination) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: { destination: newDestination },
        $inc: { destinationCount: 1 },
      },
      { new: true }
    );
    return [true, "Operation Successful"];
  } catch (err) {
    console.error(err);
    return [false, err];
  }
};

const updateDestination = async (userId, destinationEmail, updatedData) => {
  try {
    await User.findOneAndUpdate(
      { _id: userId, "destination.destinationEmail": destinationEmail }, // Match by userId and destinationEmail
      { $set: { "destination.$": updatedData } },
      { new: true }
    );
    return [true, "Operation Successful"];
  } catch (err) {
    console.error(err);
    return [false, err];
  }
};

const removeDestination = async (userId, destinationEmail) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { destination: { destinationEmail } }, // Remove the matching destination
        $inc: { destinationCount: -1 }, // Decrease the destination count by 1
      },
      { new: true }
    );
    return [true, "Operation Successful"];
  } catch (err) {
    console.error(err);
    return [false, err];
  }
};

export { addDestination, updateDestination, removeDestination };
