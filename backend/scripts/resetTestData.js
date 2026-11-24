require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env")
});

const mongoose = require("mongoose");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

// Register every model before counting or deleting its documents.
const Organization = require("../src/models/Organization");
const Driver = require("../src/models/Driver");
const FoodInventory = require("../src/models/FoodInventory");
const FoodSafetyReview = require("../src/models/FoodSafetyReview");
const Donation = require("../src/models/Donation");
const Delivery = require("../src/models/Delivery");
const Notification = require("../src/models/Notification");
const AgentExecution = require("../src/models/AgentExecution");

const collectionsToClear = [
  ["organizations", Organization],
  ["drivers", Driver],
  ["food inventory", FoodInventory],
  ["food safety reviews", FoodSafetyReview],
  ["donations", Donation],
  ["deliveries and tracking", Delivery],
  ["notifications", Notification],
  ["agent workflow history", AgentExecution]
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to clear data when NODE_ENV=production.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from backend/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const databaseName = mongoose.connection.name;
  if (!databaseName || ["admin", "local", "config"].includes(databaseName)) {
    throw new Error(`Refusing to clear unexpected database '${databaseName || "unknown"}'.`);
  }

  const counts = await Promise.all(
    collectionsToClear.map(async ([label, Model]) => [label, await Model.countDocuments()])
  );
  console.log(`Connected database: ${databaseName}`);
  console.log("The following test data is queued for deletion:");
  for (const [label, count] of counts) console.log(`- ${label}: ${count}`);
  console.log("Application settings and .env configuration will be preserved.");

  const terminal = readline.createInterface({ input: stdin, output: stdout });
  let confirmation;
  try {
    confirmation = await terminal.question(
      `Type the exact database name (${databaseName}) to permanently delete these records: `
    );
  } finally {
    terminal.close();
  }
  if (confirmation !== databaseName) {
    console.log("Confirmation did not match. No data was deleted.");
    return;
  }

  const results = await Promise.all(
    collectionsToClear.map(async ([label, Model]) => [label, await Model.deleteMany({})])
  );
  console.log("Test data reset complete:");
  for (const [label, result] of results) {
    console.log(`- ${label}: ${result.deletedCount} deleted`);
  }
}

main()
  .catch((error) => {
    console.error("Test data reset stopped:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
