// Preparing Axios request
import axios from "axios";
const fullUrl = `${process.env.CF_URL_PREFIX}/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.CF_DB_ID}/query`;

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
}

export const routingRulesRequest = (method, alias , destination) => {
    const zone = selectZone(alias) || process.env.CF_ZONE_ID;
    const rulesPath = "rules";
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
}