export const selectZone = function (alias) {
    alias = alias.toLowerCase();
    const domains = process.env.DOMAINS.split(',');
    const zoneIds = process.env.ZONE_IDS.split(',');
  
    for (let i = 0; i < domains.length; i++) {
      if (alias.endsWith(domains[i])) {
        return zoneIds[i];
      }
    }
    return null;
  };
  
  export const selectDestination = function (domain) {
    domain = domain.toLowerCase();
    const domains = process.env.DOMAINS.split(',');
    const emails = process.env.CF_EMAILS.split(',');
    const accountIds = process.env.CF_ACCOUNT_IDS.split(',');
    const apiKeys = process.env.CF_API_KEYS.split(',');
  
    for (let i = 0; i < domains.length; i++) {
      if (domain.endsWith(domains[i])) {
        return [emails[i], accountIds[i], apiKeys[i]];
      }
    }
    return null;
  };
  
  export const selectDomain = function (alias) {
    alias = alias.toLowerCase();
    const domains = process.env.DOMAINS.split(',');
  
    for (let i = 0; i < domains.length; i++) {
      if (alias.endsWith(domains[i])) {
        return domains[i];
      }
    }
    return null;
  };