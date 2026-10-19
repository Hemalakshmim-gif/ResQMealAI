
const { GoogleGenAI } = require("@google/genai");

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

  
let response;
let lastError;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    console.log(`Sending request to Gemini (attempt ${attempt}/3)...`);
    response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    console.log("Gemini response received.");

    break;
  } catch (error) {
    lastError = error;

    const message =
      typeof error.message === "string" ? error.message : "";

    const isTemporary =
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED");

    if (!isTemporary || attempt === 3) {
      throw error;
    }

    console.log(
      `Gemini temporarily unavailable. Retry ${attempt + 1}/3...`
    );

    await new Promise((resolve) =>
      setTimeout(resolve, attempt * 2000)
    );
  }
}

if (!response) {
  throw lastError || new Error("Gemini request failed");
}

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
