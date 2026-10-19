
require("dotenv").config({ quiet: true });

const connectDB = require("./src/config/db");
const mongoose = require("mongoose");

const {
  matchFoodWithOrganizations,
} = require("./src/agents/demandMatchingAgent");

async function testDemandMatching() {
  try {
    // Connect to MongoDB before running queries.
    await connectDB();

    console.log("\nRunning Demand & Matching Agent...");

    const result = await matchFoodWithOrganizations();

    console.log("\nDemand & Matching Agent test completed.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\nDemand matching test failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    // Close the database connection after the test.
    await mongoose.disconnect();
  }
}

testDemandMatching();
