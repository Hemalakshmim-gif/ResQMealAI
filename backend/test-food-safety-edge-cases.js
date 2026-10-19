
const {
  evaluateFoodSafety,
} = require("./src/agents/foodSafetyEligibilityAgent");

const now = new Date("2026-10-12T10:00:00.000Z");

const validFood = {
  foodName: "Fresh Meals",
  quantity: 10,
  unit: "meals",
  foodType: "cooked",
  status: "available",
  expiryTime: "2026-10-13T10:00:00.000Z",
  providerName: "Test Restaurant",
  pickupAddress: "Bengaluru",
};

const cases = [
  {
    name: "Expiry exactly at current time",
    food: {
      ...validFood,
      expiryTime: now.toISOString(),
    },
    expected: "ineligible",
  },
  {
    name: "Invalid food type",
    food: {
      ...validFood,
      foodType: "unknown_type",
    },
    expected: "ineligible",
  },
  {
    name: "Zero quantity",
    food: {
      ...validFood,
      quantity: 0,
    },
    expected: "ineligible",
  },
  {
    name: "Negative quantity",
    food: {
      ...validFood,
      quantity: -5,
    },
    expected: "ineligible",
  },
  {
    name: "Missing provider",
    food: {
      ...validFood,
      providerName: "",
    },
    expected: "requires_safety_review",
    expectedFlag: "Provider information is missing.",
  },
  {
    name: "Missing pickup address",
    food: {
      ...validFood,
      pickupAddress: "",
    },
    expected: "requires_safety_review",
    expectedFlag: "Pickup address is missing.",
  },
  {
    name: "Null food record",
    food: null,
    expected: "ineligible",
  },
];

let passed = 0;

for (const test of cases) {
  const result = evaluateFoodSafety(test.food, now);

  let success =
    result.eligibilityStatus === test.expected;

  if (test.expectedFlag) {
    success =
      success &&
      result.reviewFlags.includes(test.expectedFlag);
  }

  console.log(
    `${success ? "PASS" : "FAIL"}: ${test.name}`
  );

  if (!success) {
    console.log("Expected status:", test.expected);
    console.log("Received status:", result.eligibilityStatus);
    console.log("Review flags:", result.reviewFlags);
  } else {
    passed++;
  }
}

console.log(`\nResults: ${passed}/${cases.length} passed`);

if (passed !== cases.length) {
  process.exitCode = 1;
}
