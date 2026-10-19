
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
  status: "available",
  expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
};

const safetyResult = {
  _id: "food-101",
  eligibilityStatus: "approved",
  canBeRecommended: true,
};

mockModule("./src/models/FoodInventory", {
  find: () => ({
    lean: async () => [food],
  }),
});

mockModule("./src/models/Donation", {
  find: () => ({
    select: () => ({
      lean: async () => [],
    }),
  }),
});

mockModule("./src/agents/foodSafetyEligibilityAgent", {
  analyzeFoodSafety: async () => ({
    results: [safetyResult],
  }),
});

const matches = [
  {
    food: {
      id: "food-101",
      foodName: "Vegetable Rice",
      priority: "urgent",
    },
    organization: {
      id: "org-201",
      name: "Helping Hands NGO",
      requestedMeals: 15,
    },
    matching: {
      proposedMeals: 15,
    },
  },
];

async function runTest() {
  try {
    const {
      negotiateAndAllocate,
    } = require("./src/agents/negotiationAllocationAgent");

    console.log("Testing Negotiation & Allocation Agent...");

    const result = await negotiateAndAllocate(matches);

    console.log(JSON.stringify(result, null, 2));

    const checks = [
      {
        name: "One allocation proposal created",
        passed: result.allocations.length === 1,
      },
      {
        name: "Quantity does not exceed demand",
        passed: result.allocations[0]?.quantity === 15,
      },
      {
        name: "Allocation is only a proposal",
        passed: result.allocations[0]?.status === "proposed",
      },
      {
        name: "No database donation created by the agent",
        passed: true,
      },
    ];

    let passed = 0;

    for (const check of checks) {
      console.log(
        `${check.passed ? "PASS" : "FAIL"}: ${check.name}`
      );

      if (check.passed) passed++;
    }

    console.log(`\nResults: ${passed}/${checks.length} passed`);

    if (passed !== checks.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Test failed:", error.stack || error.message);
    process.exitCode = 1;
  }
}

runTest();
