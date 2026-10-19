
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
  quantity: 8,
  unit: "meals",
  status: "available",
  expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
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

let safetyApproved = false;

mockModule("./src/agents/foodSafetyEligibilityAgent", {
  analyzeFoodSafety: async () => ({
    results: [
      {
        _id: "food-101",
        eligibilityStatus: safetyApproved ? "approved" : "requires_safety_review",
        canBeRecommended: safetyApproved,
      },
    ],
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

    console.log("Testing safety and inventory limits...");

    // Test 1: Unapproved food must not be allocated.
    safetyApproved = false;
    const rejectedResult = await negotiateAndAllocate(matches);

    const safetyBlocked =
      rejectedResult.allocations.length === 0 &&
      rejectedResult.skipped.length === 1 &&
      rejectedResult.skipped[0].reason.includes("safety review");

    console.log(
      `${safetyBlocked ? "PASS" : "FAIL"}: Unapproved food is blocked`
    );

    // Test 2: Approved food must not exceed the available 8 meals.
    safetyApproved = true;
    const approvedResult = await negotiateAndAllocate(matches);

    const quantityLimited =
      approvedResult.allocations.length === 1 &&
      approvedResult.allocations[0].quantity === 8 &&
      approvedResult.summary.proposedMeals === 8;

    console.log(
      `${quantityLimited ? "PASS" : "FAIL"}: Allocation is limited to 8 available meals`
    );

    // Test 3: The remaining demand must be satisfied only by available stock.
    const demandRespected =
      approvedResult.allocations.every(
        (allocation) => allocation.quantity <= 15
      );

    console.log(
      `${demandRespected ? "PASS" : "FAIL"}: Allocation does not exceed requested demand`
    );

    const passed = [
      safetyBlocked,
      quantityLimited,
      demandRespected,
    ].filter(Boolean).length;

    console.log(`\nResults: ${passed}/3 passed`);

    if (passed !== 3) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Test failed:", error.stack || error.message);
    process.exitCode = 1;
  }
}

runTest();
