const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const { io: connectSocket } = require("socket.io-client");
const Delivery = require("./src/models/Delivery");
const FoodInventory = require("./src/models/FoodInventory");
const Organization = require("./src/models/Organization");
const {
  validateLocation,
  TrackingError
} = require("./src/services/trackingService");
const {
  canAccessDelivery,
  initializeTrackingSocket
} = require("./src/services/trackingSocket");

const serverTime = new Date("2026-11-17T10:30:00.000Z");
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("accepts valid coordinates and optional GPS fields", () => {
  const result = validateLocation(
    {
      latitude: 13.1007,
      longitude: 77.5963,
      accuracy: 10,
      heading: 90,
      speed: 8,
      timestamp: "2000-01-01T00:00:00.000Z"
    },
    serverTime
  );

  assert.deepEqual(result, {
    latitude: 13.1007,
    longitude: 77.5963,
    accuracy: 10,
    heading: 90,
    speed: 8,
    updatedAt: serverTime
  });
});

test("accepts valid coordinate boundaries and absent optional values", () => {
  const result = validateLocation(
    { latitude: -90, longitude: 180, accuracy: 0 },
    serverTime
  );

  assert.equal(result.latitude, -90);
  assert.equal(result.longitude, 180);
  assert.equal(result.heading, undefined);
  assert.equal(result.speed, undefined);
});

test("delivery schema stores only the latest location and tracking state", async () => {
  const delivery = new Delivery({
    donation: new mongoose.Types.ObjectId(),
    pickupAddress: "Provider address",
    deliveryAddress: "Recipient address"
  });

  assert.equal(delivery.trackingActive, false);
  assert.equal(delivery.latestLocation, undefined);

  delivery.latestLocation = {
    latitude: 13.1,
    longitude: 77.59,
    accuracy: 10,
    updatedAt: serverTime
  };

  await delivery.validate();
});

test("delivery schema rejects out-of-range stored coordinates", () => {
  const delivery = new Delivery({
    donation: new mongoose.Types.ObjectId(),
    pickupAddress: "Provider address",
    deliveryAddress: "Recipient address",
    latestLocation: {
      latitude: 91,
      longitude: 0,
      accuracy: 1,
      updatedAt: serverTime
    }
  });

  return assert.rejects(
    delivery.validate(),
    (error) => Boolean(error.errors["latestLocation.latitude"])
  );
});

test("food listings and organizations validate stored coordinates", async () => {
  const food = new FoodInventory({
    foodName: "Prepared meals",
    quantity: 10,
    providerName: "Provider",
    pickupAddress: "Provider address",
    expiryTime: new Date("2026-11-18T10:30:00.000Z"),
    pickupCoordinates: {
      latitude: 13.1,
      longitude: 77.59
    }
  });

  const organization = new Organization({
    name: "Recipient",
    type: "ngo",
    email: "recipient@example.test",
    password: "password-hash",
    phone: "0000000000",
    address: "Recipient address",
    city: "Bengaluru",
    coordinates: {
      latitude: 13.2,
      longitude: 77.6
    }
  });

  await food.validate();
  await organization.validate();

  const invalidOrganization = new Organization({
    name: "Recipient",
    type: "ngo",
    email: "other@example.test",
    password: "password-hash",
    phone: "0000000000",
    address: "Recipient address",
    city: "Bengaluru",
    coordinates: {
      latitude: 91,
      longitude: 77.6
    }
  });

  await assert.rejects(
    invalidOrganization.validate(),
    (error) => Boolean(error.errors["coordinates.latitude"])
  );
});

test("delivery tracking access is limited to the assigned parties", () => {
  const delivery = {
    driver: { _id: "driver-1" },
    donation: {
      recipient: { _id: "recipient-1" },
      food: { providerOrganization: "provider-1" }
    }
  };

  assert.equal(
    canAccessDelivery({ role: "driver", id: "driver-1" }, delivery),
    true
  );
  assert.equal(
    canAccessDelivery(
      { role: "recipient", organizationId: "recipient-1" },
      delivery
    ),
    true
  );
  assert.equal(
    canAccessDelivery(
      { role: "provider", organizationId: "provider-1" },
      delivery
    ),
    true
  );
  assert.equal(
    canAccessDelivery(
      { role: "provider", organizationId: "other-provider" },
      delivery
    ),
    false
  );
});

test("socket connections without a JWT are rejected", async () => {
  const httpServer = http.createServer();
  const io = initializeTrackingSocket(httpServer);

  await new Promise((resolve) => httpServer.listen(0, resolve));

  const address = httpServer.address();
  const client = connectSocket(
    `http://127.0.0.1:${address.port}`,
    {
      auth: {},
      reconnection: false,
      timeout: 3000
    }
  );

  try {
    const error = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Socket authentication timed out.")),
        4000
      );

      client.once("connect_error", (connectError) => {
        clearTimeout(timeout);
        resolve(connectError);
      });
    });

    assert.equal(error.message, "Authentication required.");
  } finally {
    client.disconnect();
    await new Promise((resolve) => io.close(resolve));
  }
});

for (const [name, location] of [
  ["latitude above range", { latitude: 90.1, longitude: 0, accuracy: 1 }],
  ["longitude below range", { latitude: 0, longitude: -180.1, accuracy: 1 }],
  ["string coordinates", { latitude: "13.1", longitude: 77, accuracy: 1 }],
  ["negative accuracy", { latitude: 13, longitude: 77, accuracy: -1 }],
  ["invalid heading", { latitude: 13, longitude: 77, accuracy: 1, heading: 361 }],
  ["negative speed", { latitude: 13, longitude: 77, accuracy: 1, speed: -1 }]
]) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => validateLocation(location, serverTime),
      TrackingError
    );
  });
}

async function runTests() {
  let passed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    } catch (error) {
      console.error(`FAIL: ${name}`);
      console.error(error);
    }
  }

  console.log(`\nResults: ${passed}/${tests.length} passed`);

  if (passed !== tests.length) {
    process.exitCode = 1;
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
