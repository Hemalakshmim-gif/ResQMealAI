
const Module = require("module");

function mockModule(relativePath, exports) {
  const filename = require.resolve(relativePath);
  const mocked = new Module(filename);

  mocked.filename = filename;
  mocked.loaded = true;
  mocked.exports = exports;

  require.cache[filename] = mocked;
}

const food = {
  _id: "food-101",
  foodName: "Vegetable Rice",
  quantity: 20,
  unit: "meals",
  foodType: "cooked",
  status: "available",
  expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

const donation = {
  _id: "donation-101",
  quantity: 15,
  food,
};

const delivery = {
  _id: "delivery-101",
  donation,
  driver: null,
  status: "pending",
  pickupAddress: "Bengaluru",
  deliveryAddress: "Bengaluru",
};

const driver = {
  _id: "driver-101",
  name: "Test Driver",
  vehicleType: "van",
  capacityMeals: 30,
  currentLocation: "Bengaluru",
  status: "available",
};

let currentSafetyResult = {
  _id: food._id,
  eligibilityStatus: "approved",
  safetyStatus: "verified_by_review",
  canBeRecommended: true,
};

mockModule("./src/models/Delivery", {
  find: () => ({
    populate: () => ({
      lean: async () => [
        {
          ...delivery,
          donation: {
            ...donation,
            food: { ...food },
          },
        },
      ],
    }),
  }),
});

mockModule("./src/models/Driver", {
  find: () => ({
    lean: async () => [{ ...driver }],
  }),
});

mockModule("./src/models/Donation", {});
mockModule("./src/models/FoodInventory", {});

mockModule("./src/agents/foodSafetyEligibilityAgent", {
  analyzeFoodSafety: async () => ({
    results: [{ ...currentSafetyResult }],
  }),
});

mockModule("./src/agents/logisticsAIReasoning", {
  explainDriverRankings: async () => [],
});

async function runTests() {
  const { planDeliveries } = require("./src/agents/logisticsAgent");

  const checks = [];

  function check(name, passed) {
    checks.push({ name, passed: Boolean(passed) });
  }

  async function analyzeWithSafety(safetyResult) {
    currentSafetyResult = {
      _id: food._id,
      ...safetyResult,
    };

    return planDeliveries();
  }

  try {
    console.log("Testing safety-aware logistics planning...\n");

    // 1. Approved food may proceed to driver-capacity checks.
    let result = await analyzeWithSafety({
      eligibilityStatus: "approved",
      safetyStatus: "verified_by_review",
      canBeRecommended: true,
    });

    check(
      "Approved food can receive suitable driver candidates",
      result.plans[0]?.planningStatus === "candidate_drivers_found" &&
        result.plans[0]?.candidateDrivers.length === 1
    );

    check(
      "Approved safety status is exposed in the plan",
      result.plans[0]?.foodSafetyStatus === "approved"
    );

    // 2. Food requiring review must not receive recommendations.
    result = await analyzeWithSafety({
      eligibilityStatus: "requires_safety_review",
      safetyStatus: "not_verified",
      canBeRecommended: false,
    });

    check(
      "Food awaiting safety review is blocked",
      result.plans[0]?.planningStatus === "food_safety_not_approved" &&
        result.plans[0]?.candidateDrivers.length === 0
    );

    // 3. Rejected/ineligible food must not receive recommendations.
    result = await analyzeWithSafety({
      eligibilityStatus: "ineligible",
      safetyStatus: "rejected",
      canBeRecommended: false,
    });

    check(
      "Rejected food is blocked",
      result.plans[0]?.planningStatus === "food_safety_not_approved" &&
        result.plans[0]?.candidateDrivers.length === 0
    );

    // 4. An approved review alone cannot override an expired item.
    const originalExpiry = food.expiryTime;
    food.expiryTime = new Date(Date.now() - 60 * 60 * 1000);

    result = await analyzeWithSafety({
      eligibilityStatus: "approved",
      safetyStatus: "verified_by_review",
      canBeRecommended: true,
    });

    check(
      "Expired food remains blocked",
      result.plans[0]?.planningStatus === "expiry_invalid_or_passed" &&
        result.plans[0]?.candidateDrivers.length === 0
    );

    food.expiryTime = originalExpiry;

    // 5. Missing safety result must fail closed.
    currentSafetyResult = null;

    result = await planDeliveries();

    check(
      "Missing safety approval is blocked",
      result.plans[0]?.planningStatus === "food_safety_not_approved" &&
        result.plans[0]?.foodSafetyStatus === "unknown" &&
        result.plans[0]?.candidateDrivers.length === 0
    );

    // 6. Insufficient driver capacity must still block the driver.
    currentSafetyResult = {
      _id: food._id,
      eligibilityStatus: "approved",
      safetyStatus: "verified_by_review",
      canBeRecommended: true,
    };

    driver.capacityMeals = 10;

    result = await planDeliveries();

    check(
      "Insufficient driver capacity is respected",
      result.plans[0]?.planningStatus === "no_suitable_driver" &&
        result.plans[0]?.candidateDrivers.length === 0
    );

    driver.capacityMeals = 30;

    let passed = 0;

    for (const item of checks) {
      console.log(
        `${item.passed ? "PASS" : "FAIL"}: ${item.name}`
      );

      if (item.passed) passed++;
    }

    console.log(`\nResults: ${passed}/${checks.length} passed`);

    if (passed !== checks.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("\nSafety-aware logistics test failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

runTests();
