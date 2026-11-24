
const { GoogleGenAI } = require("@google/genai");

const AI_REQUEST_TIMEOUT_MS = 8000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const explainEligibleInventory = async (foods) => {
  if (!Array.isArray(foods)) {
    throw new Error("foods must be an array");
  }

  if (foods.length === 0) {
    return [];
  }

  // Send only the first 20 records to control API usage.
  const inventory = foods.slice(0, 20).map((food) => ({
    id: String(food._id ?? food.id),
    foodName: food.foodName,
    quantity: food.quantity,
    unit: food.unit,
    foodType: food.foodType,
    hoursUntilExpiry: food.hoursUntilExpiry,
    rulePriority: food.priority,
    ruleReason: food.reason,
  }));

  // Excluded food must never be recommended for redistribution.
  const eligibleInventory = inventory.filter(
    (food) =>
      food.rulePriority !== "excluded" &&
      Number.isFinite(food.hoursUntilExpiry) &&
      food.hoursUntilExpiry > 0
  );

  if (eligibleInventory.length === 0) {
    return [];
  }

  const prompt = `
You are the AI reasoning component of Nourivya,
an autonomous food redistribution platform.

Analyze only the supplied inventory records.

Rules:
1. Recommend only records in the supplied eligible inventory.
2. Never recommend excluded food.
3. Never claim that food is safe to eat.
4. Do not override the rule-based priority.
5. Do not invent recipient demand, locations, or food conditions.
6. Rank 1 means the highest redistribution priority.
7. Explain recommendations using only the supplied information.
8. Return JSON only, with this structure:
{
  "recommendations": [
    {
      "id": "record ID",
      "suggestedRank": 1,
      "explanation": "Short explanation"
    }
  ]
}

Eligible inventory:
${JSON.stringify(eligibleInventory)}
`;

  
console.log("Sending inventory reasoning request to Gemini (8-second limit)...");
const response = await client.models.generateContent({
  model: GEMINI_MODEL,
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    abortSignal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  },
});
console.log("Gemini response received.");

  const output = response.text;

  if (!output) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed;

  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error(
      "Gemini response is missing the recommendations array"
    );
  }

  const allowedIds = new Set(
    eligibleInventory.map((food) => food.id)
  );

  const seenIds = new Set();

  for (const item of parsed.recommendations) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !allowedIds.has(item.id) ||
      seenIds.has(item.id) ||
      !Number.isInteger(item.suggestedRank) ||
      item.suggestedRank < 1 ||
      typeof item.explanation !== "string" ||
      item.explanation.trim().length === 0
    ) {
      throw new Error(
        "Gemini returned an invalid recommendation"
      );
    }

    seenIds.add(item.id);
  }

  return parsed.recommendations;
};

module.exports = { explainEligibleInventory };
