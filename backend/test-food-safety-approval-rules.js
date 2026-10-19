
const {
  evaluateFoodSafety,
} = require("./src/agents/foodSafetyEligibilityAgent");

const now = new Date("2026-10-12T10:00:00.000Z");

const validFood = {
  _id: "food123",
  foodName: "Fresh Meals",
  quantity: 10,
  unit: "meals",
  foodType: "cooked",
  status: "available",
  expiryTime: "2026-10-13T10:00:00.000Z",
  providerName: "Test Restaurant",
  pickupAddress: "Bengaluru",
};

const approvedReview = {
  reviewStatus: "approved",
  storageVerified: true,
  packagingVerified: true,
  handlingVerified: true,
  reviewedBy: "Safety Reviewer",
  reviewedAt: new Date("2026-10-12T09:00:00.000Z"),
};

const cases = [
  {
    name: "Expired food cannot be approved",
    food: { ...validFood, expiryTime: "2026-10-11T10:00:00Z" },
    review: approvedReview,
    expected: "ineligible",
  },
  {
    name: "Unavailable food cannot be approved",
    food: { ...validFood, status: "reserved" },
    review: approvedReview,
    expected: "ineligible",
  },
  {
    name: "Food without a review remains pending",
    food: validFood,
    review: null,
    expected: "requires_safety_review",
  },
  {
    name: "Pending review cannot approve food",
    food: validFood,
    review: {
      ...approvedReview,
      reviewStatus: "pending",
    },
    expected: "requires_safety_review",
  },
  {
    name: "Rejected review cannot approve food",
    food: validFood,
    review: {
      ...approvedReview,
      reviewStatus: "rejected",
    },
    expected: "ineligible",
  },
  {
    name: "Missing storage verification blocks approval",
    food: validFood,
    review: {
      ...approvedReview,
      storageVerified: false,
    },
    expected: "requires_safety_review",
  },
  {
    name: "Missing reviewer blocks approval",
    food: validFood,
    review: {
      ...approvedReview,
      reviewedBy: "",
    },
    expected: "requires_safety_review",
  },
  {
    name: "Valid reviewed food can be approved",
    food: validFood,
    review: approvedReview,
    expected: "approved",
  },
];

let passed = 0;

for (const test of cases) {
  const result = evaluateFoodSafety(
    test.food,
    now,
    test.review
  );

  const success =
    result.eligibilityStatus === test.expected;

  console.log(`${success ? "PASS" : "FAIL"}: ${test.name}`);

  if (!success) {
    console.log("Expected:", test.expected);
    console.log("Received:", result.eligibilityStatus);
  } else {
    passed++;
  }
}

console.log(`\nResults: ${passed}/${cases.length} passed`);

if (passed !== cases.length) {
  process.exitCode = 1;
}
