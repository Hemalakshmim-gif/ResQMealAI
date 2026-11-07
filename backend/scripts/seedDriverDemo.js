require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Driver = require("../src/models/Driver");
const Organization = require("../src/models/Organization");
const FoodInventory = require("../src/models/FoodInventory");
const Donation = require("../src/models/Donation");
const Delivery = require("../src/models/Delivery");

const upsertBySeedKey = async (Model, seedKey, identityFilter, values, label) => {
  const existingByIdentity = await Model.findOne(identityFilter).select(
    "+demoSeedKey"
  );

  if (existingByIdentity && existingByIdentity.demoSeedKey !== seedKey) {
    throw new Error(
      `${label} identity already exists and is not owned by this demo seed.`
    );
  }

  return Model.findOneAndUpdate(
    { demoSeedKey: seedKey },
    { $set: { ...values, demoSeedKey: seedKey } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
};

const upsertByMarker = async (Model, markerField, marker, values) =>
  Model.findOneAndUpdate(
    { [markerField]: marker },
    { $set: values },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo data cannot be seeded when NODE_ENV is production.");
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured in backend/.env.");
  }

  const email = (
    process.env.DEMO_DRIVER_EMAIL || "demo.driver@nourivya.test"
  ).trim().toLowerCase();
  const password = process.env.DEMO_DRIVER_PASSWORD;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("DEMO_DRIVER_EMAIL must be a valid email address.");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new Error(
      "Set DEMO_DRIVER_PASSWORD in backend/.env to at least 8 characters."
    );
  }

  const emailKey = email.replace(/[^a-z0-9]/g, "-");
  const driverSeedKey = `driver-demo:${emailKey}`;
  const recipientSeedKey = `${driverSeedKey}:recipient`;

  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash(password, 12);
  const driver = await upsertBySeedKey(
    Driver,
    driverSeedKey,
    { email },
    {
      name: "Demo Driver",
      phone: "+91 9000000000",
      email,
      password: hashedPassword,
      vehicleType: "motorcycle",
      capacityMeals: 30,
      currentLocation: "Indiranagar, Bengaluru",
      status: "assigned"
    },
    "Driver"
  );

  const recipient = await upsertBySeedKey(
    Organization,
    recipientSeedKey,
    { email: `demo.recipient.${emailKey}@nourivya.test` },
    {
      name: "Demo Hope Shelter",
      type: "shelter",
      email: `demo.recipient.${emailKey}@nourivya.test`,
      password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      phone: "+91 9000000001",
      address: "Demo Shelter, Jayanagar",
      city: "Bengaluru",
      isActive: false
    },
    "Demo recipient"
  );

  const now = new Date();
  const examples = [
    {
      key: "assigned",
      foodName: "Sample Fresh Meal Boxes",
      foodType: "cooked",
      quantity: 24,
      deliveryStatus: "assigned",
      donationStatus: "accepted",
      plannedPickupAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      pickupAddress: "Demo Community Kitchen, Indiranagar, Bengaluru",
      deliveryAddress: "Demo Hope Shelter, Jayanagar, Bengaluru"
    },
    {
      key: "delivered",
      foodName: "Sample Vegetable Meal Packs",
      foodType: "cooked",
      quantity: 18,
      deliveryStatus: "delivered",
      donationStatus: "delivered",
      plannedPickupAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      pickupAddress: "Demo Market Kitchen, Koramangala, Bengaluru",
      deliveryAddress: "Demo Hope Shelter, Jayanagar, Bengaluru"
    },
    {
      key: "delivered-snacks",
      foodName: "Sample Packaged Snack Kits",
      foodType: "packaged",
      quantity: 12,
      deliveryStatus: "delivered",
      donationStatus: "delivered",
      plannedPickupAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 71 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 70 * 60 * 60 * 1000),
      pickupAddress: "Demo Food Hub, Whitefield, Bengaluru",
      deliveryAddress: "Demo Hope Shelter, Jayanagar, Bengaluru"
    }
  ];

  for (const example of examples) {
    const marker = `${driverSeedKey}:${example.key}`;
    const food = await upsertByMarker(
      FoodInventory,
      "description",
      marker,
      {
        foodName: example.foodName,
        quantity: example.quantity,
        unit: "meals",
        providerName: "Demo Community Kitchen",
        pickupAddress: example.pickupAddress,
        expiryTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        foodType: example.foodType,
        status: example.deliveryStatus === "delivered"
          ? "collected"
          : "reserved",
        description: marker
      }
    );

    const donation = await upsertByMarker(
      Donation,
      "notes",
      marker,
      {
        food: food._id,
        recipient: recipient._id,
        quantity: example.quantity,
        status: example.donationStatus,
        notes: marker,
        deliveredAt: example.deliveredAt || null
      }
    );

    await upsertByMarker(
      Delivery,
      "notes",
      marker,
      {
        donation: donation._id,
        driver: driver._id,
        status: example.deliveryStatus,
        pickupAddress: example.pickupAddress,
        deliveryAddress: example.deliveryAddress,
        plannedPickupAt: example.plannedPickupAt,
        pickedUpAt: example.pickedUpAt || null,
        deliveredAt: example.deliveredAt || null,
        failureReason: "",
        notes: marker
      }
    );
  }

  console.log("Demo driver and sample deliveries are ready.");
  console.log(`Login email: ${email}`);
  console.log("Login password: the value configured as DEMO_DRIVER_PASSWORD.");
  console.log("Sample records are tagged and excluded from impact analytics.");
};

main()
  .catch((error) => {
    console.error("Could not seed driver demo data:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
