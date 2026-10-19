
const {
  evaluateFoodSafety,
} = require("./src/agents/foodSafetyEligibilityAgent");

const now = new Date("2026-10-12T10:00:00Z");

const testCases = [
  {
    name: "Valid available food",
    food: {
      foodName: "Fresh Meals",
      quantity: 10,
      unit: "meals",
      foodType: "cooked",
      status: "available",
      expiryTime: "2026-10-13T10:00:00Z",
      providerName: "Test Restaurant",
      pickupAddress: "Bengaluru",
    },
    expected: "requires_safety_review",
  },
  {
    name: "Expired food",
    food: {
      foodName: "Expired Meals",
      quantity: 10,
      unit: "meals",
      foodType: "cooked",
      status: "available",
      expiryTime: "2026-10-11T10:00:00Z",
      providerName: "Test Restaurant",
      pickupAddress: "Bengaluru",
    },
    expected: "ineligible",
  },
  {
    name: "Unavailable food",
    food: {
      foodName: "Reserved Meals",
      quantity: 10,
      unit: "meals",
      foodType: "cooked",
      status: "reserved",
      expiryTime: "2026-10-13T10:00:00Z",
    },
    expected: "ineligible",
  },
  {
    name: "Missing expiry",
    food: {
      foodName: "Unknown Expiry Meals",
      quantity: 10,
      unit: "meals",
      foodType: "cooked",
      status: "available",
    },
    expected: "ineligible",
  },
  {
    name: "Invalid quantity",
    food: {
      foodName: "Invalid Quantity Meals",
      quantity: 0,
      unit: "meals",
      foodType: "cooked",
      status: "available",
      expiryTime: "2026-10-13T10:00:00Z",
    },
    expected: "ineligible",
  },
];

let passed = 0;

for (const test of testCases) {
  const result = evaluateFoodSafety(test.food, now);
  const success = result.eligibilityStatus === test.expected;

  console.log(
    `${success ? "PASS" : "FAIL"}: ${test.name}`
  );

  if (!success) {
    console.log("Expected:", test.expected);
    console.log("Received:", result.eligibilityStatus);
  } else {
    passed++;
  }
}

console.log(`\nResults: ${passed}/${testCases.length} passed`);

if (passed !== testCases.length) {
  process.exitCode = 1;
}
