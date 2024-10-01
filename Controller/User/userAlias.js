import User from "../../Models/userModel.js";

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

/**
 * udpates the rule in the user's alias list
 *
 * @param {string} userId - The ID of the user which is to be updated.
 * @param {string} aliasEmail - The current alias email of the rule.
 * @param {Object} updatedData - The updated data for the rule.
 * @returns {Promise<[boolean, string|Error]>} A promise that resolves to an array where the first element is a boolean indicating success, and the second element is a message or error.
 */
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

/**
 * removes the rule in the user's alias list.
 *
 * @param {string} userId - The ID of the user from whom the alias will be removed.
 * @param {string} aliasEmail - The alias email to be removed.
 * @returns {Promise<[boolean, string|Error]>} A promise that resolves to an array where the first element is a boolean indicating success, and the second element is a message or error.
 */
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