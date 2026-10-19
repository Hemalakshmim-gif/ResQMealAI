
require("dotenv").config();

const connectDB = require("./src/config/db");
const { analyzeInventory } = require("./src/agents/inventorySurplusAgent");

async function runTest() {
  try {
    await connectDB();

    const result = await analyzeInventory();

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Inventory agent test failed:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  }
}

runTest();
