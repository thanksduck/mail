import axios from 'axios';


const allowedDomains = new Set(
    process.env.ALLOWED_DOMAINS.split(" ").map((domain) => domain.toLowerCase())
  );
  const ruleUrl = `${process.env.RULE_URL_PREFIX}/rules`;
  
  function selectDomain(alias) {
    const lowercaseAlias = alias.toLowerCase();
    return (
      Array.from(allowedDomains).find((domain) =>
        lowercaseAlias.endsWith(domain)
      ) || ""
    );
  }

// Constants
const RULE_API_BASE_URL = ruleUrl || 'https://api.example.com/rules';

// HTTP methods enum for better readability
const HTTP_METHOD = {
  POST: 'POST',
  DELETE: 'DELETE'
};

/**
 * Creates or deletes a rule based on the provided method and parameters.
 * @param {string} method - The HTTP method (POST for create, DELETE for remove)
 * @param {string} alias - The alias for the rule
 * @param {string} destination - The destination for the rule
 * @param {string} username - The username associated with the rule
 * @returns {Promise} - A promise that resolves with the API response
 */
export const createRuleRequest = async (method, alias, destination, username) => {
  const domain = selectDomain(alias);
  if (!domain) {
    throw new Error("Invalid domain");
  }

  const data = {
    alias,
    destination,
    username,
    domain,
    comment: `${method === HTTP_METHOD.POST ? 'Created' : 'Deleted'} by ${username}`
  };

  const url = method === HTTP_METHOD.POST
    ? RULE_API_BASE_URL
    : `${RULE_API_BASE_URL}/${domain}/${alias}`;

  try {
    console.log("Data is ",data);
    console.log("URL is ",url);
    const response = await axios({
      method,
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RULE_API_KEY}`
      },
      data
    });
    console.log("Response from the api is ",response);
    return response.data;
  } catch (error) {
    console.log("Error is ",error);
    throw new Error(`Rule ${method === HTTP_METHOD.POST ? 'creation' : 'deletion'} failed: ${error.message}`);
  }
};

/**
 * Creates a new rule
 * @param {string} alias - The alias for the rule
 * @param {string} destination - The destination for the rule
 * @param {string} username - The username associated with the rule
 * @returns {Promise} - A promise that resolves with the API response
 */
export const createRule = async (alias, destination, username) => {
  try {
    const response = await createRuleRequest(HTTP_METHOD.POST, alias, destination, username);
    console.log("Response from the api is ",response);
    if (!response.success) {
      throw new Error(`${response.errors[0]} and ${response.message}`);
    }
    return response;
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to create rule: ${error.message}`);
  }
};

/**
 * Removes an existing rule
 * @param {string} alias - The alias for the rule to be removed
 * @param {string} destination - The destination for the rule to be removed
 * @param {string} username - The username associated with the rule
 * @returns {Promise} - A promise that resolves with the API response
 */
export const removeRule = async (alias, destination, username) => {
  try {
    const response = await createRuleRequest(HTTP_METHOD.DELETE, alias, destination, username);
    if (!response.success) {
      throw new Error(`${response.errors[0]} and ${response.message}`);
    }
    return response;
  } catch (error) {
    throw new Error(`Failed to remove rule: ${error.message}`);
  }
};