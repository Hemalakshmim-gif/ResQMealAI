require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Driver = require("../src/models/Driver");
require("../src/models/Donation"); // Register the model used by Delivery.donation population.
require("../src/models/FoodInventory"); // Register the model used by Donation.food population.
const Delivery = require("../src/models/Delivery");

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to change a test driver's credentials in production.");
  }
  if (process.env.CONFIRM_TEST_DRIVER_CREDENTIAL_RESET !== "YES") {
    throw new Error("Set CONFIRM_TEST_DRIVER_CREDENTIAL_RESET=YES to confirm this local test-account reset.");
  }

  const email = String(process.env.TEST_DRIVER_EMAIL || "").trim().toLowerCase();
  const password = process.env.TEST_DRIVER_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set TEST_DRIVER_EMAIL to a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Set TEST_DRIVER_PASSWORD to at least 8 characters.");
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in backend/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const matches = await Driver.find({ name: /^Test Driver$/i }).select("_id name email");
  if (matches.length === 0) {
    throw new Error("No driver named Test Driver was found.");
  }

  const deliveries = await Delivery.find({
    driver: { $in: matches.map((candidate) => candidate._id) }
  })
    .select("driver status donation")
    .populate({
      path: "donation",
      select: "food",
      populate: { path: "food", select: "foodName" }
    })
    .lean();

  console.log("Test Driver account candidates and assigned deliveries:");
  for (const candidate of matches) {
    const assigned = deliveries
      .filter((delivery) => String(delivery.driver) === String(candidate._id))
      .map((delivery) => `${delivery.donation?.food?.foodName || "Unknown food"} (${delivery.status})`);
    console.log(`ID: ${candidate._id} | Email: ${candidate.email || "none"} | Deliveries: ${assigned.join(", ") || "none"}`);
  }

  const targetId = String(process.env.TEST_DRIVER_ID || "").trim();
  const driver = matches.find((candidate) => String(candidate._id) === targetId);
  if (!driver) {
    throw new Error("Set TEST_DRIVER_ID to the ID of the Test Driver record shown above. No account was changed.");
  }
  const emailOwner = await Driver.findOne({ email, _id: { $ne: driver._id } }).select("_id");
  if (emailOwner) {
    throw new Error("That email is already used by another driver. Choose a different email.");
  }

  driver.email = email;
  driver.password = await bcrypt.hash(password, 12);
  await driver.save();

  console.log("Test Driver login credentials were updated.");
  console.log(`Driver ID: ${driver._id}`);
  console.log(`Login email: ${email}`);
  console.log("Log in using the Delivery Driver role and the password you entered.");
}

main()
  .catch((error) => {
    console.error("Could not update Test Driver login:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
