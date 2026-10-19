
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
  quantity: 100,
  unit: "meals",
  foodType: "cooked",
  pickupAddress: "Bengaluru",
  expiryTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
  status: "available",
};

const organizations = [
  {
    _id: "org-201",
    name: "Helping Hands NGO",
    city: "Bengaluru",
    acceptedFoodTypes: ["cooked"],
    requestedFoodTypes: ["cooked"],
    requestedMeals: 100,
    capacityMeals: 100,
    isActive: true,
  },
  {
    _id: "org-202",
    name: "Hope Foundation",
    city: "Bengaluru",
    acceptedFoodTypes: ["cooked"],
    requestedFoodTypes: ["cooked"],
    requestedMeals: 100,
    capacityMeals: 100,
    isActive: true,
  },
];

mockModule("./src/agents/demandMatchingAI", {
  explainPotentialMatches: async () => [],
});

mockModule("./src/models/FoodInventory", {
  find: () => ({
    lean: async () => [{ ...food }],
  }),
});

mockModule("./src/models/Organization", {
  find: () => ({
    lean: async () => organizations.map((org) => ({ ...org })),
  }),
});

mockModule("./src/agents/inventoryClassification", {
  classifyFood: () => ({
    priority: "medium",
    recommendation: "Suitable for planned distribution",
    reason: "Food is within its valid expiry period",
    hoursUntilExpiry: 48,
  }),
});

mockModule("./src/agents/foodSafetyEligibilityAgent", {
  analyzeFoodSafety: async () => ({
    analyzedAt: new Date(),
    summary: {
      totalRecords: 1,
      approved: 1,
      ineligible: 0,
      requiresSafetyReview: 0,
    },
    results: [
      {
        _id: food._id,
        eligibilityStatus: "approved",
        safetyStatus: "verified_by_review",
        canBeRecommended: true,
      },
    ],
  }),
});

async function runTests() {
  const {
    matchFoodWithOrganizations,
  } = require("./src/agents/demandMatchingAgent");

  const checks = [];

  function check(name, passed) {
    checks.push({ name, passed: Boolean(passed) });
  }

  try {
    console.log("Testing surplus-aware demand matching...\n");

    // Test 1: Inventory minus provider demand.
    const surplusResult = await matchFoodWithOrganizations({
      expectedDemandByFoodId: {
        "food-101": 65,
      },
    });

    const surplusMatch = surplusResult.matches[0];

    check(
      "100 meals minus 65 expected demand estimates 35 surplus",
      surplusMatch?.food.surplusPrediction.estimatedSurplus === 35
    );

    check(
      "Only 35 surplus meals are proposed",
      surplusMatch?.matching.proposedMeals === 35
    );

    check(
      "Surplus-aware summary reports 35 proposed meals",
      surplusResult.summary.proposedMeals === 35
    );

    // Test 2: Multiple organizations share the same surplus.
    const multiOrgResult = await matchFoodWithOrganizations({
      expectedDemandByFoodId: {
        "food-101": 65,
      },
    });

    const totalProposed = multiOrgResult.matches.reduce(
      (total, match) => total + match.matching.proposedMeals,
      0
    );

    check(
      "Multiple organizations cannot exceed 35 total meals",
      totalProposed === 35 && totalProposed <= 35
    );

    // Test 3: Expected demand exceeds inventory.
    const noSurplusResult = await matchFoodWithOrganizations({
      expectedDemandByFoodId: {
        "food-101": 120,
      },
    });

    check(
      "Demand above inventory produces zero surplus matches",
      noSurplusResult.matches.length === 0 &&
        noSurplusResult.summary.proposedMeals === 0
    );

    // Test 4: No demand supplied for this food ID.
    const missingDemandResult = await matchFoodWithOrganizations({
      expectedDemandByFoodId: {
        "another-food-id": 65,
      },
    });

    const missingDemandMatch = missingDemandResult.matches[0];

    check(
      "Missing demand is marked insufficient_data",
      missingDemandMatch?.food.surplusPrediction
        .predictionStatus === "insufficient_data"
    );

    check(
      "Missing demand preserves legacy matching quantity",
      missingDemandMatch?.matching.proposedMeals === 100
    );

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
    console.error("\nSurplus matching test failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

runTests();
