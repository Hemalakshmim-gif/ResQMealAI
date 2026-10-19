
const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const explainDriverRankings = async (plans) => {
  if (!Array.isArray(plans)) {
    throw new Error("plans must be an array");
  }

  const eligiblePlans = plans.filter(
    (plan) =>
      plan.planningStatus === "candidate_drivers_found" &&
      Array.isArray(plan.candidateDrivers) &&
      plan.candidateDrivers.length > 0
  );

  if (eligiblePlans.length === 0) {
    return [];
  }

  // Send only eligible drivers and relevant delivery details.
  const candidates = eligiblePlans.flatMap((plan) =>
    plan.candidateDrivers.map((driver) => ({
      deliveryId: String(plan.deliveryId),
      foodName: plan.foodName,
      quantity: plan.quantity,
      unit: plan.unit,
      hoursUntilExpiry: plan.hoursUntilExpiry,
      pickupAddress: plan.pickupAddress,
      deliveryAddress: plan.deliveryAddress,
      driverId: String(driver.driverId),
      driverName: driver.driverName,
      vehicleType: driver.vehicleType,
      capacityMeals: driver.capacityMeals,
      currentLocation: driver.currentLocation,
      locationMatch: driver.locationMatch,
      ruleReason: driver.reason,
    }))
  );

  const prompt = `
You are the AI driver-ranking component of Nourivya,
an autonomous food rescue and redistribution platform.

Rank the supplied eligible drivers for each delivery.

Rules:
1. Use only the supplied information.
2. Every supplied driver has already passed the rule-based
   eligibility checks. Do not add new drivers.
3. Never change delivery quantities or driver capacities.
4. Prefer a verified location-string match when other
   supplied details are comparable.
5. Consider vehicle type and remaining food shelf life,
   but do not invent travel times, distances, traffic,
   or route information.
6. Do not claim that a location-string match proves
   actual geographic proximity.
7. Rank drivers separately for each delivery, starting at 1.
8. Return one recommendation for every supplied
   delivery-driver pair.
9. Keep explanations brief and evidence-based.
10. Return JSON only in this format:
{
  "recommendations": [
    {
      "deliveryId": "delivery record ID",
      "driverId": "driver record ID",
      "suggestedRank": 1,
      "explanation": "Brief evidence-based explanation"
    }
  ]
}

Eligible driver candidates:
${JSON.stringify(candidates)}
`;

  let response;
  let lastError;

  // Retry temporary Gemini failures up to three attempts.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(
        `Requesting driver ranking from Gemini (${attempt}/3)...`
      );

      response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      break;
    } catch (error) {
      lastError = error;
      const message = String(error.message || "");

      const temporary =
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!temporary || attempt === 3) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 2000)
      );
    }
  }

  if (!response) {
    throw lastError || new Error("Gemini returned no response");
  }

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed;

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("Missing recommendations array");
  }

  // Verify that Gemini only recommends supplied pairs.
  const allowedPairs = new Set(
    candidates.map(
      (item) => `${item.deliveryId}:${item.driverId}`
    )
  );

  const seenPairs = new Set();

  for (const item of parsed.recommendations) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid driver recommendation");
    }

    const pair = `${item.deliveryId}:${item.driverId}`;

    if (
      !allowedPairs.has(pair) ||
      seenPairs.has(pair) ||
      !Number.isInteger(item.suggestedRank) ||
      item.suggestedRank < 1 ||
      typeof item.explanation !== "string" ||
      !item.explanation.trim()
    ) {
      throw new Error(
        "Gemini returned an invalid driver recommendation"
      );
    }

    seenPairs.add(pair);
  }

  // Reject incomplete responses instead of silently
  // treating missing recommendations as valid.
  if (seenPairs.size !== allowedPairs.size) {
    throw new Error(
      "Gemini did not rank every eligible driver"
    );
  }

  return parsed.recommendations;
};

module.exports = { explainDriverRankings };
