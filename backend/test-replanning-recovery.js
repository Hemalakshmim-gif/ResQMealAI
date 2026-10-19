
const assert = require("node:assert/strict");

const mockData = {
  donations: [],
  deliveries: [],
  drivers: [],
  foods: []
};

function mockModel(modelPath, key) {
  const resolvedPath = require.resolve(modelPath);

  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports: {
      find: () => ({
        lean: async () => mockData[key]
      })
    }
  };
}

mockModel("./src/models/Donation", "donations");
mockModel("./src/models/Delivery", "deliveries");
mockModel("./src/models/Driver", "drivers");
mockModel("./src/models/FoodInventory", "foods");

const safetyPath = require.resolve(
  "./src/agents/foodSafetyEligibilityAgent"
);

require.cache[safetyPath] = {
  id: safetyPath,
  filename: safetyPath,
  loaded: true,
  exports: {
    evaluateFoodSafety: async () => ({
      eligibilityStatus: "approved",
      canBeRecommended: true
    })
  }
};

const { replanRecovery } = require("./src/agents/replanningRecoveryAgent");

const id = (value) => value.padStart(24, "0");

const foodId = id("1");
const donationId = id("2");
const deliveryId = id("3");
const driverId = id("4");

mockData.foods = [
  {
    _id: foodId,
    foodName: "Test Meals",
    quantity: 20,
    unit: "meals",
    status: "available",
    expiryTime: new Date("2027-01-01T00:00:00Z")
  }
];

mockData.donations = [
  {
    _id: donationId,
    food: foodId,
    recipient: id("5"),
    quantity: 10,
    status: "accepted"
  }
];

mockData.deliveries = [
  {
    _id: deliveryId,
    donation: donationId,
    driver: null,
    status: "pending",
    plannedPickupAt: new Date("2026-10-11T08:00:00Z"),
    createdAt: new Date("2026-10-11T07:00:00Z"),
    updatedAt: new Date("2026-10-11T07:00:00Z")
  }
];

mockData.drivers = [
  {
    _id: driverId,
    name: "Test Driver",
    vehicleType: "van",
    capacityMeals: 20,
    currentLocation: "Bengaluru",
    status: "available"
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, callback) {
    try {
      await callback();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (error) {
      console.log(`FAIL: ${name}`);
      console.log(`  ${error.message}`);
      failed++;
    }
  }

  const now = new Date("2026-10-12T12:00:00Z");

  await test("Agent returns a read-only report", async () => {
    const report = await replanRecovery({ now });

    assert.equal(report.readOnly, true);
    assert.equal(report.automaticExecution, false);
    assert.equal(report.summary.deliveriesChecked, 1);
  });

  await test("Overdue pending delivery recommends rescheduling", async () => {
    const report = await replanRecovery({ now });

    assert.ok(
      report.actions.some((action) => action.type === "reschedule_pickup")
    );
  });

  await test("Eligible driver is suggested for unassigned delivery", async () => {
    const report = await replanRecovery({ now });

    const action = report.actions.find(
      (item) => item.type === "suggest_driver"
    );

    assert.ok(action);
    assert.equal(action.candidateDrivers.length, 1);
    assert.equal(action.candidateDrivers[0].driverId, driverId);
  });

  await test("Delivered donation is not scheduled for duplicate recovery", async () => {
    mockData.deliveries[0].status = "delivered";
    mockData.donations[0].status = "delivered";

    const report = await replanRecovery({ now });

    assert.equal(
      report.actions.some((action) => action.type === "retry_delivery"),
      false
    );

    mockData.deliveries[0].status = "pending";
    mockData.donations[0].status = "accepted";
  });

  await test("Failed delivery recommends a retry review", async () => {
    mockData.deliveries[0].status = "failed";
    mockData.deliveries[0].failureReason = "Vehicle breakdown";

    const report = await replanRecovery({ now });

    assert.ok(
      report.actions.some((action) => action.type === "retry_delivery")
    );

    mockData.deliveries[0].status = "pending";
    mockData.deliveries[0].failureReason = "";
  });

  await test("Unavailable driver is not suggested", async () => {
    mockData.drivers[0].status = "unavailable";

    const report = await replanRecovery({ now });

    const action = report.actions.find(
      (item) => item.type === "suggest_driver"
    );

    assert.equal(action, undefined);

    mockData.drivers[0].status = "available";
  });

  console.log(`\nResults: ${passed}/${passed + failed} passed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
