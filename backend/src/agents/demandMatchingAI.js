
const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const REQUEST_TIMEOUT_MS = 8000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const explainPotentialMatches = async (matches) => {
  if (!Array.isArray(matches)) {
    throw new Error("matches must be an array");
  }

  if (matches.length === 0) {
    return [];
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const candidates = matches.slice(0, 20).map((match, index) => ({
    id: String(match.food.id),
    organizationId: String(match.organization.id),
    foodName: match.food.foodName,
    quantity: match.food.quantity,
    unit: match.food.unit,
    foodType: match.food.foodType,
    priority: match.food.priority,
    hoursUntilExpiry: match.food.hoursUntilExpiry,
    organizationName: match.organization.name,
    city: match.organization.city,
    proposedMeals: match.matching.proposedMeals,
    sameCity: match.matching.sameCity,
    ruleReason: match.matching.reason,
    candidateIndex: index,
  }));

  const prompt = `
You are the AI reasoning component of Nourivya,
a food redistribution platform.

Analyze the supplied potential food-to-organization matches.

Rules:
1. Use only the supplied information.
2. Do not invent recipient needs, distances, or food conditions.
3. Do not claim that food is safe to eat.
4. Do not change food eligibility, proposed quantities, or rule priority.
5. Prefer urgent food and matches with a verified same-city indicator.
6. Explain uncertainty when location is not verified.
7. Return JSON only in this format:
{
  "recommendations": [
    {
      "foodId": "food record ID",
      "organizationId": "organization record ID",
      "suggestedRank": 1,
      "explanation": "Brief explanation"
    }
  ]
}

Potential matches:
${JSON.stringify(candidates)}
`;

  console.log("Requesting match reasoning from Gemini (8-second limit)...");
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  });

  if (!response || !response.text) {
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

  const allowedPairs = new Set(
    candidates.map(
      (item) => `${item.id}:${item.organizationId}`
    )
  );

  const seenPairs = new Set();

  for (const item of parsed.recommendations) {
    if (!item || typeof item !== "object") {
      throw new Error("Gemini returned an invalid recommendation");
    }

    const pair = `${item.foodId}:${item.organizationId}`;

    if (
      !allowedPairs.has(pair) ||
      seenPairs.has(pair) ||
      !Number.isInteger(item.suggestedRank) ||
      item.suggestedRank < 1 ||
      typeof item.explanation !== "string" ||
      !item.explanation.trim()
    ) {
      throw new Error(
        "Gemini returned an invalid match recommendation"
      );
    }

    seenPairs.add(pair);
  }

  return parsed.recommendations;
};

module.exports = { explainPotentialMatches };
