
require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const { planDeliveries } = require("./src/agents/logisticsAgent");

async function testLogisticsAgent() {
  try {
    await connectDB();

    console.log("\nRunning Logistics Agent...");

    const result = await planDeliveries();

    console.log("\nLogistics Agent test completed.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\nLogistics Agent test failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

testLogisticsAgent();
