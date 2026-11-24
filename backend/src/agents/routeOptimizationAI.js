const { GoogleGenAI } = require("@google/genai");
const AI_REQUEST_TIMEOUT_MS = 8000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

async function proposeStopOrder({ stops, durationMatrix }) {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!Array.isArray(stops) || !Array.isArray(durationMatrix)) return null;

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
You optimize food rescue delivery stop order.
Return JSON only with this shape: {"stopKeys":["key", ...]}.

Rules:
- Include each supplied stop key exactly once.
- Every pickup must occur before the matching delivery dropoff.
- Stops for food expiring sooner should receive higher priority when feasible.
- Prefer lower total travel time from the supplied duration matrix.
- Do not invent stops, travel times, constraints, or delivery records.
- The duration matrix is indexed by coordinateIndex, and values are seconds.
- Index 0 is the driver's current position. Each other stop has its own index.

Stops:
${JSON.stringify(stops)}

Estimated travel duration matrix:
${JSON.stringify(durationMatrix)}
`;

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      abortSignal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
    }
  });
  if (!response.text) return null;
  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    return null;
  }
  return Array.isArray(parsed.stopKeys) &&
    parsed.stopKeys.every((key) => typeof key === "string")
    ? parsed.stopKeys
    : null;
}

module.exports = { proposeStopOrder };
