import { selectDestination } from "../Premium/selectZone.js";
import axios from "axios";
const fullUrl = `${process.env.CF_URL_PREFIX}/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_DB_ID}/query`;

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

/**
 * Creates a rule request to be sent to the server.
 *
 * @param {string} method - The HTTP method to use for the request (e.g., "POST", "PATCH").
 * @param {string} alias - The alias for the rule.
 * @param {string} destination - The destination for the rule.
 * @param {string} username - The username of the person creating the rule.
 * @returns {Promise} - A promise that resolves to the server response.
 * @throws {Error} - Throws an error if the domain is invalid.
 */
export const createRuleRequest = (method, alias, destination, username) => {
  const domain = selectDomain(alias);
  if (!domain) {
    throw new Error("Invalid domain");
  }

  const data = {
    alias,
    destination,
    username,
    domain,
    comment: `Created by ${username}`,
  };

  const url =
    method === "POST"
      ? ruleUrl
      : method === "PATCH"
        ? `${ruleUrl}/${domain}/${alias}/flip`
        : `${ruleUrl}/${domain}/${alias}`;

  return axios({
    method,
    url,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RULE_API_KEY}`,
    },
    data,
  });
};

/**
 * Executes a SQL query on cloudflare D1-database using Axios with the provided SQL statement and parameters.
 *
 * @param {string} sql - The SQL query to be executed.
 * @param {Object} params - The parameters to be used in the SQL query.
 * @returns {Promise} - A promise that resolves to the response of the Axios request.
 */
export const d1Query = (sql, params) => {
  return axios({
    method: "POST",
    url: fullUrl,
    headers: {
      "X-Auth-Email": process.env.CF_EMAIL,
      Authorization: `Bearer ${process.env.CF_API_KEY}`,
      "Content-Type": "application/json",
    },
    data: {
      sql,
      params,
    },
  });
};

export const routingRulesRequest = (method, alias, destination) => {
  const zone = selectZone(alias) || process.env.CF_ZONE_ID;
  const rulesPath = "rules";
  console.log("routing rules path was run somehow");
  return axios({
    method,
    url: `${process.env.CF_URL_PREFIX}/zones/${zone}/${rulesPath}`,
    headers: {
      "X-Auth-Email": process.env.CF_EMAIL,
      Authorization: `Bearer ${process.env.CF_API_KEY}`,
      "Content-Type": "application/json",
    },
    data: {
      actions: [{ type: "forward", value: [destination] }],
      enabled: true,
      matchers: [{ field: "to", type: "literal", value: alias }],
      name: `Automated - created by ${username}`,
      priority: 0,
    },
  });
};

/**
 * Sends a request to the specified destination using the provided method and domain.
 *
 * @param {string} method - The HTTP method to use for the request (e.g., 'GET', 'POST').
 * @param {string} domain - The domain to select the destination from.
 * @param {string} destination - The email address to be used as the destination.
 * @param {string} [cfId] - Optional Cloudflare ID for the specific address.
 * @returns {Promise|null} - Returns a promise that resolves to the response of the axios request, or null if email, account, or key is not found.
 */
export const destinationRequest = (method, domain, destination, cfId) => {
  const [email, account, key] = selectDestination(domain);
  const url = !cfId
    ? `${process.env.CF_URL_PREFIX}/accounts/${account}/email/routing/addresses`
    : `${process.env.CF_URL_PREFIX}/accounts/${account}/email/routing/addresses/${cfId}`;
  if (!email || !account || !key) {
    return null;
  }

  return axios({
    method,
    url,
    headers: {
      "X-Auth-Email": email,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    data: {
      email: destination,
    },
  });
};
