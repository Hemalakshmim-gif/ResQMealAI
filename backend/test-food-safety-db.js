
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const {
  analyzeFoodSafety,
} = require("./src/agents/foodSafetyEligibilityAgent");

const testDatabaseAnalysis = async () => {
  try {
    await connectDB();

    console.log("\nRunning Food Safety Agent...\n");

    const result = await analyzeFoodSafety();

    console.log("SUMMARY");
    console.log(JSON.stringify(result.summary, null, 2));

    console.log("\nFOOD SAFETY RESULTS");
    console.log(JSON.stringify(result.results, null, 2));

    console.log("\nDatabase analysis completed successfully.");
  } catch (error) {
    console.error("Food Safety Agent test failed:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

testDatabaseAnalysis();
