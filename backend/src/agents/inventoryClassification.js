
const classifyFood = (food, now = new Date()) => {
  const expiryTime = new Date(food.expiryTime);

  // Missing or invalid expiry data must never be recommended.
  if (
    !food.expiryTime ||
    Number.isNaN(expiryTime.getTime())
  ) {
    return {
      priority: "excluded",
      recommendation: "do_not_redistribute",
      reason: "Expiry information is missing or invalid.",
      hoursUntilExpiry: null
    };
  }

  const hoursUntilExpiry =
    (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilExpiry <= 0) {
    return {
      priority: "excluded",
      recommendation: "do_not_redistribute",
      reason: "The recorded expiry time has passed.",
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
    };
  }

  if (food.status !== "available") {
    return {
      priority: "excluded",
      recommendation: "not_available",
      reason: `Food status is '${food.status}', not 'available'.`,
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
    };
  }

  if (hoursUntilExpiry <= 6) {
    return {
      priority: "urgent",
      recommendation: "prioritize_redistribution",
      reason: "Food expires within 6 hours.",
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
    };
  }

  if (hoursUntilExpiry <= 24) {
    return {
      priority: "high",
      recommendation: "prioritize_redistribution",
      reason: "Food expires within 24 hours.",
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
    };
  }

  if (hoursUntilExpiry <= 72) {
    return {
      priority: "medium",
      recommendation: "consider_redistribution",
      reason: "Food expires within 72 hours.",
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
    };
  }

  return {
    priority: "normal",
    recommendation: "monitor",
    reason: "Food is available with sufficient time before expiry.",
    hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2))
  };
};

module.exports = { classifyFood };
