
const Module = require("module");
const path = require("path");

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
  quantity: 15,
  unit: "meals",
  foodType: "cooked",
  pickupAddress: "Bengaluru",
  expiryTime: new Date(Date.now() + 4.5 * 60 * 60 * 1000),
  status: "available",
};

const organization = {
  _id: "org-201",
  name: "Helping Hands NGO",
  city: "Bengaluru",
  acceptedFoodTypes: ["cooked"],
  requestedFoodTypes: ["cooked"],
  requestedMeals: 20,
  capacityMeals: 30,
};

mockModule("./src/agents/demandMatchingAI", {
  explainPotentialMatches: async () => {
    throw new Error("Simulated Gemini 503 failure");
  },
});

mockModule("./src/models/FoodInventory", {
  find: () => ({
    lean: async () => [food],
  }),
});

mockModule("./src/models/Organization", {
  find: () => ({
    lean: async () => [organization],
  }),
});

mockModule("./src/agents/inventoryClassification", {
  classifyFood: () => ({
    priority: "urgent",
    recommendation: "Prioritize distribution",
    reason: "Food is approaching expiry",
    hoursUntilExpiry: 4.5,
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

async function testDemandMatchingFallback() {
  try {
    console.log("Testing Demand Matching fallback...");

    const {
      matchFoodWithOrganizations,
    } = require("./src/agents/demandMatchingAgent");

    const result = await matchFoodWithOrganizations();

    console.log("\nTest result:");
    console.log(JSON.stringify(result, null, 2));

    const checks = [
      {
        name: "Rule-based match is retained",
        passed: result.matches.length === 1,
      },
      {
        name: "Gemini failure is reported",
        passed: result.aiStatus === "unavailable",
      },
      {
        name: "Proposed meal quantity is preserved",
        passed:
          result.matches[0]?.matching.proposedMeals === 15,
      },
      {
        name: "Rule-based summary remains valid",
        passed:
          result.summary.totalMatches === 1 &&
          result.summary.proposedMeals === 15,
      },
    ];

    let passed = 0;

    for (const check of checks) {
      console.log(
        `${check.passed ? "PASS" : "FAIL"}: ${check.name}`
      );

      if (check.passed) {
        passed++;
      }
    }

    console.log(`\nResults: ${passed}/${checks.length} passed`);

    if (passed !== checks.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("\nFallback test failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

testDemandMatchingFallback();
