
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

const organizations = [
  {
    id: "org-201",
    name: "Helping Hands NGO",
    requestedMeals: 15,
  },
  {
    id: "org-202",
    name: "Community Care",
    requestedMeals: 15,
  },
];

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
    results: [
      {
        _id: "food-101",
        eligibilityStatus: "approved",
        canBeRecommended: true,
      },
    ],
  }),
});

const matches = organizations.map((organization) => ({
  food: {
    id: "food-101",
    foodName: "Vegetable Rice",
    priority: "urgent",
  },
  organization,
  matching: {
    proposedMeals: 15,
  },
}));

async function runTest() {
  try {
    const {
      negotiateAndAllocate,
    } = require("./src/agents/negotiationAllocationAgent");

    console.log("Testing allocation capacity...");

    const result = await negotiateAndAllocate(matches);

    console.log(JSON.stringify(result, null, 2));

    const allocatedTotal = result.allocations.reduce(
      (total, allocation) => total + allocation.quantity,
      0
    );

    const firstAllocation = result.allocations.find(
      (allocation) => allocation.organizationId === "org-201"
    );

    const secondAllocation = result.allocations.find(
      (allocation) => allocation.organizationId === "org-202"
    );

    const checks = [
      {
        name: "First organization receives 15 meals",
        passed: firstAllocation?.quantity === 15,
      },
      {
        name: "Second organization receives only 5 remaining meals",
        passed: secondAllocation?.quantity === 5,
      },
      {
        name: "Total allocation does not exceed 20 meals",
        passed: allocatedTotal === 20 && allocatedTotal <= food.quantity,
      },
      {
        name: "Both proposals remain uncommitted",
        passed: result.allocations.every(
          (allocation) => allocation.status === "proposed"
        ),
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
