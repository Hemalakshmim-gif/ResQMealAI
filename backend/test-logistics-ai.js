
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const { planDeliveries } = require("./src/agents/logisticsAgent");
const {
  explainDriverRankings,
} = require("./src/agents/logisticsAIReasoning");

async function testLogisticsAI() {
  try {
    await connectDB();

    console.log("\nGenerating delivery plans...");
    const result = await planDeliveries();

    console.log("\nTesting Gemini driver ranking...");
    const recommendations = await explainDriverRankings(
      result.plans
    );

    console.log("\nAI ranking test completed.");
    console.log(
      JSON.stringify(
        {
          pendingDeliveries: result.summary.pendingDeliveries,
          recommendations,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("\nLogistics AI test failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testLogisticsAI();
