const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const FoodInventory = require("./src/models/FoodInventory");
const FoodSafetyReview = require("./src/models/FoodSafetyReview");
const Organization = require("./src/models/Organization");
const Donation = require("./src/models/Donation");
const Driver = require("./src/models/Driver");

const { runRestaurantAgent } = require("./src/agents/restaurantAgent");
const { runSafetyAgent } = require("./src/agents/safetyAgent");
const { runDemandAgent } = require("./src/agents/demandAgent");
const { runMatchingAgent } = require("./src/agents/matchingAgent");
const {
  planMatchedDelivery
} = require("./src/agents/logisticsAgent");
const {
  runMonitoringAgent
} = require("./src/agents/monitoringAgent");

const originalMethods = {
  foodFindById: FoodInventory.findById,
  foodFind: FoodInventory.find,
  reviewFind: FoodSafetyReview.find,
  organizationFind: Organization.find,
  donationFind: Donation.find,
  driverFind: Driver.find
};

function id() {
  return new mongoose.Types.ObjectId().toString();
}

function query(value) {
  return {
    lean: async () => value,
    sort() {
      return this;
    },
    select() {
      return this;
    },
    populate() {
      return this;
    }
  };
}

function food(overrides = {}) {
  return {
    _id: id(),
    foodName: "Vegetable Rice",
    quantity: 30,
    unit: "meals",
    foodType: "cooked",
    status: "available",
    expiryTime: "2026-11-18T12:00:00.000Z",
    pickupAddress: "Provider Street",
    pickupCoordinates: { latitude: 12.9716, longitude: 77.5946 },
    ...overrides
  };
}

function recipient(overrides = {}) {
  return {
    organizationId: id(),
    organizationName: "Hope Foundation",
    acceptedFoodTypes: ["cooked"],
    requestedFoodTypes: ["cooked"],
    requestedMeals: 20,
    capacityMeals: 20,
    availableMeals: 20,
    coordinates: { latitude: 12.98, longitude: 77.6 },
    ...overrides
  };
}

function restoreMethods() {
  FoodInventory.findById = originalMethods.foodFindById;
  FoodInventory.find = originalMethods.foodFind;
  FoodSafetyReview.find = originalMethods.reviewFind;
  Organization.find = originalMethods.organizationFind;
  Donation.find = originalMethods.donationFind;
  Driver.find = originalMethods.driverFind;
}

async function main() {
  let passed = 0;
  const test = async (name, run) => {
    await run();
    passed += 1;
    console.log(`PASS: ${name}`);
  };
  const now = new Date("2026-11-17T10:00:00.000Z");

  try {
    await test("Restaurant Agent uses the provider-listed quantity", async () => {
      const record = food({ quantity: 45 });
      FoodInventory.findById = () => query(record);

      const result = await runRestaurantAgent({
        foodId: String(record._id),
        now
      });

      assert.equal(result.agent, "Restaurant Agent");
      assert.equal(result.output.predictedSurplus[0].quantity, 45);
      assert.equal(
        result.output.predictedSurplus[0].predictionMethod,
        "provider_listed_quantity"
      );
    });

    await test("Restaurant Agent estimates only from supplied demand", async () => {
      const record = food({ quantity: 45 });
      FoodInventory.findById = () => query(record);

      const result = await runRestaurantAgent({
        foodId: String(record._id),
        expectedDemand: 20,
        now
      });

      assert.equal(result.output.predictedSurplus[0].quantity, 25);
      assert.equal(
        result.output.predictedSurplus[0].predictionMethod,
        "rule_based_expected_demand"
      );
    });

    await test("Safety Agent distinguishes safe, review, and unsafe food", async () => {
      const safe = food({ _id: id() });
      const warning = food({ _id: id(), foodName: "Meal needing review" });
      const unsafe = food({
        _id: id(),
        foodName: "Expired meal",
        expiryTime: "2026-11-16T10:00:00.000Z"
      });
      const reviewedAt = new Date("2026-11-17T09:00:00.000Z");

      FoodInventory.find = () => query([safe, warning, unsafe]);
      FoodSafetyReview.find = () => query([
        {
          _id: id(),
          food: safe._id,
          reviewStatus: "approved",
          storageVerified: true,
          packagingVerified: true,
          handlingVerified: true,
          reviewedBy: "Verifier",
          reviewedAt
        }
      ]);

      const result = await runSafetyAgent({
        foodIds: [safe._id, warning._id, unsafe._id],
        predictedSurplus: [{
          foodId: String(safe._id),
          quantity: 12,
          predictionMethod: "rule_based_expected_demand"
        }],
        now
      });
      const statusByFoodId = new Map(
        result.output.assessments.map((entry) => [
          entry.foodId,
          entry.safetyStatus
        ])
      );

      assert.equal(result.status, "WAITING_FOR_APPROVAL");
      assert.equal(statusByFoodId.get(String(safe._id)), "SAFE");
      assert.equal(statusByFoodId.get(String(warning._id)), "WARNING");
      assert.equal(statusByFoodId.get(String(unsafe._id)), "UNSAFE");
      assert.equal(result.output.safeFoodIds.length, 1);
      assert.equal(
        result.output.assessments[0].potentialSurplus,
        12
      );
    });

    await test("Demand Agent returns only active compatible recipients", async () => {
      const record = food();
      const suitable = {
        _id: id(),
        name: "Hope Foundation",
        type: "ngo",
        isActive: true,
        acceptedFoodTypes: ["cooked"],
        requestedFoodTypes: ["cooked"],
        requestedMeals: 25,
        capacityMeals: 20,
        coordinates: { latitude: 12.98, longitude: 77.6 }
      };
      const unsuitable = {
        ...suitable,
        _id: id(),
        name: "Bakery Shelter",
        acceptedFoodTypes: ["bakery"],
        requestedFoodTypes: ["bakery"]
      };

      FoodInventory.find = () => query([record]);
      Organization.find = () => query([suitable, unsuitable]);

      const result = await runDemandAgent({
        safetyAssessments: [{
          foodId: String(record._id),
          safetyStatus: "SAFE",
          potentialSurplus: 10
        }]
      });

      assert.equal(result.output.recipientsByFood[0].recipients.length, 1);
      assert.equal(
        result.output.recipientsByFood[0].recipients[0].organizationName,
        "Hope Foundation"
      );
      assert.equal(
        result.output.recipientsByFood[0].recipients[0].availableMeals,
        20
      );
      assert.equal(
        result.output.recipientsByFood[0].potentialSurplus,
        10
      );
    });

    await test("Agent results hand off through the complete planning chain", async () => {
      const record = food({ quantity: 12 });
      const organization = {
        _id: id(),
        name: "Care Home",
        type: "shelter",
        isActive: true,
        city: "Bengaluru",
        address: "Recipient Road",
        acceptedFoodTypes: ["cooked"],
        requestedFoodTypes: ["cooked"],
        requestedMeals: 10,
        capacityMeals: 15,
        coordinates: { latitude: 12.98, longitude: 77.6 }
      };
      FoodInventory.findById = () => query(record);
      FoodInventory.find = () => query([record]);
      FoodSafetyReview.find = () => query([{
        _id: id(),
        food: record._id,
        reviewStatus: "approved",
        storageVerified: true,
        packagingVerified: true,
        handlingVerified: true,
        reviewedBy: "Verifier",
        reviewedAt: now
      }]);
      Organization.find = () => query([organization]);
      Donation.find = () => query([]);
      Driver.find = () => query([{
        _id: id(),
        name: "Available Driver",
        vehicleType: "car",
        capacityMeals: 20,
        status: "available"
      }]);

      const restaurant = await runRestaurantAgent({
        foodId: String(record._id),
        expectedDemand: 2,
        now
      });
      const safety = await runSafetyAgent({
        predictedSurplus: restaurant.output.predictedSurplus,
        now
      });
      const demand = await runDemandAgent({
        safetyAssessments: safety.output.assessments
      });
      const matching = await runMatchingAgent({
        safeFoods: safety.output.assessments,
        recipientsByFood: demand.output.recipientsByFood,
        now
      });
      const allocation = matching.output.allocations[0];
      const logistics = await planMatchedDelivery({
        foodId: allocation.foodId,
        foodName: allocation.foodName,
        safetyStatus: "SAFE",
        quantity: allocation.allocatedQuantity,
        unit: allocation.unit,
        pickupAddress: record.pickupAddress,
        deliveryAddress: organization.address
      });
      const monitoring = runMonitoringAgent({
        agentResults: [restaurant, safety, demand, matching, logistics]
      });

      assert.equal(safety.output.assessments[0].potentialSurplus, 10);
      assert.equal(allocation.organizationId, String(organization._id));
      assert.equal(logistics.output.selectedDriver.name, "Available Driver");
      assert.equal(monitoring.output.completedAgents, 6);
      assert.equal(monitoring.output.workflowStatus, "IN_PROGRESS");
    });

    await test("Matching Agent splits only available meals by calculated score", async () => {
      const record = food({ quantity: 30 });
      const nearer = recipient({
        organizationName: "Near Shelter",
        requestedMeals: 15,
        capacityMeals: 15,
        availableMeals: 15,
        coordinates: { latitude: 12.972, longitude: 77.595 }
      });
      const farther = recipient({
        organizationName: "Far Shelter",
        requestedMeals: 20,
        capacityMeals: 20,
        availableMeals: 20,
        coordinates: { latitude: 13.05, longitude: 77.7 }
      });

      FoodInventory.find = () => query([record]);
      Donation.find = () => query([]);

      const result = await runMatchingAgent({
        now,
        safeFoods: [{
          foodId: String(record._id),
          safetyStatus: "SAFE",
          potentialSurplus: 25,
          expiryTime: record.expiryTime
        }],
        recipientsByFood: [{
          foodId: String(record._id),
          recipients: [farther, nearer]
        }]
      });

      assert.equal(
        result.output.allocations.reduce(
          (total, allocation) => total + allocation.allocatedQuantity,
          0
        ),
        25
      );
      assert.equal(result.output.allocations.length, 2);
      assert.equal(
        result.output.allocations[0].organizationName,
        "Near Shelter"
      );
      assert.match(result.output.scoringMethod, /Equal-weight mean/);
    });

    await test("Matching Agent subtracts existing food allocations", async () => {
      const record = food({ quantity: 30 });
      const candidate = recipient({
        requestedMeals: 30,
        capacityMeals: 30,
        availableMeals: 30
      });
      const existingDonation = {
        food: { _id: record._id, unit: "meals" },
        recipient: candidate.organizationId,
        quantity: 10
      };

      FoodInventory.find = () => query([record]);
      Donation.find = () => query([existingDonation]);

      const result = await runMatchingAgent({
        now,
        safeFoods: [{
          foodId: String(record._id),
          safetyStatus: "SAFE",
          potentialSurplus: 30,
          expiryTime: record.expiryTime
        }],
        recipientsByFood: [{
          foodId: String(record._id),
          recipients: [candidate]
        }]
      });

      assert.equal(result.output.allocations.length, 1);
      assert.equal(result.output.allocations[0].allocatedQuantity, 20);
    });

    await test("Matching Agent omits distance scoring for incomplete coordinates", async () => {
      const record = food({ quantity: 10 });
      const withoutCoordinates = recipient({
        organizationName: "No Coordinates",
        requestedMeals: 10,
        capacityMeals: 10,
        availableMeals: 10,
        coordinates: null
      });
      const withCoordinates = recipient({
        organizationName: "Has Coordinates",
        requestedMeals: 10,
        capacityMeals: 10,
        availableMeals: 10
      });
      FoodInventory.find = () => query([record]);
      Donation.find = () => query([]);

      const result = await runMatchingAgent({
        now,
        safeFoods: [{
          foodId: String(record._id),
          safetyStatus: "SAFE",
          potentialSurplus: 10,
          expiryTime: record.expiryTime
        }],
        recipientsByFood: [{
          foodId: String(record._id),
          recipients: [withoutCoordinates, withCoordinates]
        }]
      });

      assert.equal(result.output.allocations.length, 1);
      assert.match(
        result.output.allocations[0].reason,
        /distance scoring was omitted/
      );
    });

    await test("Matching Agent never forwards unsafe food", async () => {
      const result = await runMatchingAgent({
        safeFoods: [{
          foodId: id(),
          safetyStatus: "UNSAFE",
          potentialSurplus: 10
        }],
        recipientsByFood: []
      });

      assert.deepEqual(result.output.allocations, []);
      assert.deepEqual(result.output.unmatchedFoodIds, []);
    });

    await test("Logistics Agent recommends only available capacity-fit drivers", async () => {
      const record = food();
      Driver.find = () => query([
        {
          _id: id(),
          name: "Unavailable Driver",
          vehicleType: "van",
          capacityMeals: 100,
          status: "unavailable"
        },
        {
          _id: id(),
          name: "Best Fit Driver",
          vehicleType: "motorcycle",
          capacityMeals: 25,
          status: "available"
        },
        {
          _id: id(),
          name: "Large Vehicle Driver",
          vehicleType: "van",
          capacityMeals: 100,
          status: "available"
        }
      ]);

      const result = await planMatchedDelivery({
        foodId: String(record._id),
        foodName: record.foodName,
        safetyStatus: "SAFE",
        quantity: 20,
        unit: "meals",
        pickupAddress: record.pickupAddress,
        deliveryAddress: "Recipient Road"
      });

      assert.equal(result.output.selectedDriver.name, "Best Fit Driver");
      assert.equal(result.output.deliveryStatus, "pending");
      assert.match(result.output.reason, /no assignment/);
    });

    await test("Logistics Agent refuses unverified food and reports no driver", async () => {
      const record = food();
      const input = {
        foodId: String(record._id),
        foodName: record.foodName,
        quantity: 20,
        unit: "meals",
        pickupAddress: record.pickupAddress,
        deliveryAddress: "Recipient Road"
      };

      await assert.rejects(
        planMatchedDelivery({ ...input, safetyStatus: "WARNING" }),
        /requires SAFE food/
      );

      Driver.find = () => query([]);
      const result = await planMatchedDelivery({
        ...input,
        safetyStatus: "SAFE"
      });
      assert.equal(result.output.assignmentStatus, "no_available_driver");
      assert.equal(result.output.selectedDriver, null);
      assert.equal(result.output.deliveryStatus, "pending");
    });

    await test("Monitoring Agent preserves approval and failure states", async () => {
      const waiting = runMonitoringAgent({
        agentResults: [
          { agent: "Restaurant Agent", status: "COMPLETED" },
          { agent: "Safety Agent", status: "WAITING_FOR_APPROVAL" }
        ]
      });

      assert.equal(
        waiting.output.workflowStatus,
        "WAITING_FOR_APPROVAL"
      );
      assert.equal(waiting.output.totalAgents, 6);
      assert.equal(waiting.output.completedAgents, 2);

      const failed = runMonitoringAgent({
        agentResults: [
          { agent: "Restaurant Agent", status: "FAILED" }
        ]
      });
      assert.equal(failed.output.workflowStatus, "FAILED");

      const incomplete = runMonitoringAgent({
        agentResults: [
          { agent: "Restaurant Agent", status: "COMPLETED" },
          { agent: "Safety Agent", status: "COMPLETED" },
          { agent: "Demand Agent", status: "COMPLETED" },
          { agent: "Matching Agent", status: "COMPLETED" },
          { agent: "Logistics Agent", status: "COMPLETED" }
        ]
      });
      assert.equal(incomplete.output.workflowStatus, "IN_PROGRESS");
    });

    console.log(`\nResults: ${passed}/12 passed`);
  } finally {
    restoreMethods();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
