/**
 * Transforms a rule object by extracting specific properties and renaming the id property.
 *
 * @param {Object} rule - The rule object to transform.
 * @param {string} rule.alias - The alias of the rule.
 * @param {string} rule.destination - The destination of the rule.
 * @param {string} rule.username - The username associated with the rule.
 * @param {string} rule.name - The name of the rule.
 * @param {string} [rule.id] - The optional id of the rule.
 * @param {string} [rule._id] - The optional _id of the rule.
 * @param {boolean} rule.active - The active status of the rule.
 * @returns {Object} The transformed rule object with the properties alias, destination, username, ruleId, name, and active.
 */
export const sendRule = (rule) => {
  const { alias, destination, username, name, id, _id, active } = rule;
  const ruleId = id || _id;
  return { alias, destination, username, ruleId, name, active };
};

/**
 * Extracts and returns a safe response object from the given destination object.
 *
 * @param {Object} destination - The destination object.
 * @param {string} destination.domain - The domain of the destination.
 * @param {string} destination.username - The username associated with the destination.
 * @param {Date} destination.created - The creation date of the destination.
 * @param {Date} destination.modified - The last modified date of the destination.
 * @param {boolean} destination.verified - The verification status of the destination.
 * @param {string} [destination._id] - The internal ID of the destination.
 * @param {string} [destination.id] - The external ID of the destination.
 * @returns {Object} The safe response object containing the destinationId, domain, username, created, modified, and verified properties.
 */
export const sendDestination = (destination) => {
  const { domain, username, created, modified, verified, _id, id } =
    destination;
  const destinationId = id || _id;
  return { destinationId, domain, username, created, modified, verified };
};

/**
 * Sends user data with specific properties.
 *
 * @param {Object} user - The user object.
 * @param {string} user.username - The username of the user.
 * @param {string} user.name - The name of the user.
 * @param {string} user.email - The email of the user.
 * @param {Array<Object>} user.alias - The alias array of objects.
 * @param {number} user.aliasCount - The count of aliases.
 * @param {Array<Object>} user.destination - The destination array of objects.
 * @param {number} user.destinationCount - The count of destinations.
 * @returns {Object} The sanitized user object.
 */
export const sendUser = (user) => {
  const {
    username,
    name,
    email,
    alias,
    aliasCount,
    destination,
    destinationCount,
  } = user;

  return {
    username,
    name,
    email,
    alias,
    aliasCount,
    destination,
    destinationCount,
  };
};