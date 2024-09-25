export const sendRule = (rule) => {
  const { alias, destination, username,name, id , _id } = rule;
  const ruleId = id || _id;
  return { alias, destination, username, ruleId, name };
}