require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from backend/.env");
  }

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: "Reply with exactly: GEMINI_OK",
    config: {
      maxOutputTokens: 16,
      abortSignal: AbortSignal.timeout(8000)
    }
  });

  if (!response.text?.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  console.log(`Gemini API is responding: ${response.text.trim()}`);
}

main().catch((error) => {
  const status = error.status || error.code || "request_error";
  console.error(`Gemini API check failed (${status}): ${error.message}`);
  process.exitCode = 1;
});
