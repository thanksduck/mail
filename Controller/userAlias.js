import User from "../Models/userModel.js";

const addAlias = async (userId, newAlias) => {
    try {
        await User.findByIdAndUpdate(
            userId,
            { 
                $push: { alias: newAlias },
                $inc: { aliasCount: 1 } // Increment alias count by 1
            }, 
            { new: true }
        );
        return [true, "Operation Successful"];
    } catch (err) {
        console.error(err);
        return [false, err];
    }
};

const updateAlias = async (userId, aliasEmail, updatedData) => {
  try {
    await User.findOneAndUpdate(
      { _id: userId, "alias.aliasEmail": aliasEmail },
      { $set: { "alias.$": updatedData } }, 
      { new: true }
    );
    return [true, "Operation Successful"];
  } catch (err) {
    console.error(err);
    return [false, err];
  }
};

const removeAlias = async (userId, aliasEmail) => {
    try {
        await User.findByIdAndUpdate(
            userId,
            { 
                $pull: { alias: { aliasEmail } },
                $inc: { aliasCount: -1 } // Decrement alias count by 1
            }, 
            { new: true }
        );
        return [true, "Operation Successful"];
    } catch (err) {
        console.error(err);
        return [false, err];
    }
};

export { addAlias, updateAlias, removeAlias };