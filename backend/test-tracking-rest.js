const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const Delivery = require("./src/models/Delivery");
const Driver = require("./src/models/Driver");
const Organization = require("./src/models/Organization");
const trackingRoutes = require("./src/routes/trackingRoutes");

const deliveryId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const driverId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const recipientId = "cccccccccccccccccccccccc";
const otherRecipientId = "dddddddddddddddddddddddd";
const providerId = "eeeeeeeeeeeeeeeeeeeeeeee";
const originalDeliveryFindById = Delivery.findById;
const originalDeliveryFindOne = Delivery.findOne;
const originalDeliveryFindOneAndUpdate = Delivery.findOneAndUpdate;
const originalDriverFindById = Driver.findById;
const originalOrganizationFindById = Organization.findById;
const originalJwtSecret = process.env.JWT_SECRET;
const originalRoutingUrl = process.env.ROUTING_API_BASE_URL;

let currentDelivery = {
  _id: deliveryId,
  driver: { _id: driverId, name: "Assigned driver" },
  donation: {
    recipient: { _id: recipientId, name: "Recipient" },
    food: {
      providerOrganization: providerId,
      providerName: "Provider",
      foodName: "Prepared meals"
    },
    quantity: 10
  },
  status: "in_transit",
  trackingActive: false,
  pickupAddress: "Pickup address",
  deliveryAddress: "Recipient address",
  pickupCoordinates: { latitude: 13.1, longitude: 77.59 },
  deliveryCoordinates: { latitude: 13.2, longitude: 77.6 },
  latestLocation: {
    latitude: 13.15,
    longitude: 77.595,
    accuracy: 10,
    updatedAt: new Date()
  }
};

function createToken(organizationId) {
  return jwt.sign(
    { role: "recipient", organizationId },
    process.env.JWT_SECRET,
    { issuer: "nourivya-api", expiresIn: "5m" }
  );
}

function createDriverToken() {
  return jwt.sign(
    { role: "driver", driverId },
    process.env.JWT_SECRET,
    { issuer: "nourivya-api", expiresIn: "5m" }
  );
}

function createQuery(value) {
  return {
    select() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    }
  };
}

async function runTests() {
  process.env.JWT_SECRET = "tracking-rest-test-secret";
  process.env.ROUTING_API_BASE_URL = "";
  Delivery.findById = () => createQuery(currentDelivery);
  Delivery.findOne = async (filter) =>
    String(filter._id) === deliveryId &&
    String(filter.driver) === driverId
      ? currentDelivery
      : null;
  Delivery.findOneAndUpdate = async (filter, update) => {
    if (
      String(filter._id) !== deliveryId ||
      String(filter.driver) !== driverId
    ) {
      return null;
    }

    currentDelivery = { ...currentDelivery, ...update.$set };
    return currentDelivery;
  };
  Driver.findById = (id) =>
    createQuery(String(id) === driverId ? { _id: driverId } : null);
  Organization.findById = (id) =>
    createQuery({
      _id: String(id),
      type: "ngo",
      isActive: true
    });

  const app = express();
  const emittedEvents = [];
  app.use(express.json());
  app.use("/api/tracking", trackingRoutes);
  app.set("io", {
    to(room) {
      return {
        emit(event, data) {
          emittedEvents.push({ room, event, data });
        }
      };
    }
  });
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api/tracking/deliveries/${deliveryId}`;

    const missingAuth = await fetch(baseUrl);
    assert.equal(missingAuth.status, 401);
    assert.equal(
      (await missingAuth.json()).code,
      "AUTHENTICATION_REQUIRED"
    );

    const unauthorized = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${createToken(otherRecipientId)}`
      }
    });
    assert.equal(unauthorized.status, 403);
    assert.equal(
      (await unauthorized.json()).code,
      "DELIVERY_ACCESS_DENIED"
    );

    const authorized = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${createToken(recipientId)}`
      }
    });
    const snapshot = await authorized.json();
    assert.equal(authorized.status, 200);
    assert.equal(snapshot.success, true);
    assert.equal(snapshot.data.deliveryId, deliveryId);
    assert.equal(snapshot.data.latestLocation.latitude, 13.15);

    const recipientStart = await fetch(`${baseUrl}/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${createToken(recipientId)}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    assert.equal(recipientStart.status, 403);
    assert.equal(
      (await recipientStart.json()).code,
      "DRIVER_ACCESS_REQUIRED"
    );

    const driverToken = createDriverToken();
    const driverStart = await fetch(`${baseUrl}/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${driverToken}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    const startResponse = await driverStart.json();
    assert.equal(driverStart.status, 200);
    assert.equal(startResponse.data.trackingActive, true);

    const locationUpdate = await fetch(`${baseUrl}/location`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${driverToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        latitude: 13.16,
        longitude: 77.596,
        accuracy: 8
      })
    });
    const locationResponse = await locationUpdate.json();
    assert.equal(locationUpdate.status, 200);
    assert.equal(locationResponse.data.location.latitude, 13.16);
    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0].event, "tracking:location");
    assert.equal(emittedEvents[0].data.location.longitude, 77.596);

    const latestSnapshot = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const latestSnapshotResponse = await latestSnapshot.json();
    assert.equal(
      latestSnapshotResponse.data.latestLocation.latitude,
      13.16
    );

    const route = await fetch(`${baseUrl}/route`, {
      headers: {
        Authorization: `Bearer ${createToken(recipientId)}`
      }
    });
    const routeResponse = await route.json();
    assert.equal(route.status, 503);
    assert.equal(routeResponse.code, "ROUTING_NOT_CONFIGURED");

    console.log("PASS: REST tracking requires authentication.");
    console.log("PASS: REST snapshot rejects unrelated organizations.");
    console.log("PASS: authorized REST snapshot returns tracking data.");
    console.log("PASS: only a driver can start tracking through REST.");
    console.log("PASS: REST GPS updates are persisted and broadcast.");
    console.log("PASS: REST snapshots return the latest REST GPS update.");
    console.log("PASS: REST route endpoint reports missing configuration.");
    console.log("\nResults: 7/7 passed");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    Delivery.findById = originalDeliveryFindById;
    Delivery.findOne = originalDeliveryFindOne;
    Delivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    Driver.findById = originalDriverFindById;
    Organization.findById = originalOrganizationFindById;

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalRoutingUrl === undefined) {
      delete process.env.ROUTING_API_BASE_URL;
    } else {
      process.env.ROUTING_API_BASE_URL = originalRoutingUrl;
    }
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
