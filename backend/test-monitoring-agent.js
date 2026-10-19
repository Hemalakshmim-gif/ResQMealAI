
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const { monitorNourivya } = require("./src/agents/monitoringAgent");

async function main() {
  try {
    console.log("Connecting to MongoDB...");

    await connectDB();

    console.log("Running Nourivya Monitoring Agent...\n");

    const report = await monitorNourivya();

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Monitoring Agent test failed:", error.message);
  process.exitCode = 1;
});
