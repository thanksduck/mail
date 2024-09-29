export const sendRule = (rule) => {
  const { alias, destination, username,name, id , _id } = rule;
  const ruleId = id || _id;
  return { alias, destination, username, ruleId, name };
}

export const sendDestination = (destination) => {
  const { domain, username, created, modified, verified, _id, id } = destination;
  const destinationId = id || _id;
  return { destinationId, domain, username, created, modified, verified };
}

export const sendUser = (user) => {
     const { username, name, email, alias, aliasCount, destination, destinationCount } = user;
     // alias and destination are arrays of objects, i want to remove the _id from those
     return { username, name, email, alias, aliasCount, destination, destinationCount };
  };