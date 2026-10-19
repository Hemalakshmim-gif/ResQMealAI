
const assert = require("node:assert/strict");
const { classifyFood } = require("./src/agents/inventoryClassification");

const now = new Date("2026-10-11T12:00:00.000Z");

const makeFood = (hoursUntilExpiry, status = "available") => ({
  status,
  expiryTime: hoursUntilExpiry === null
    ? null
    : new Date(now.getTime() + hoursUntilExpiry * 60 * 60 * 1000)
});

const tests = [
  {
    name: "Food expiring in 3 hours is urgent",
    food: makeFood(3),
    expected: "urgent"
  },
  {
    name: "Food expiring in 12 hours is high priority",
    food: makeFood(12),
    expected: "high"
  },
  {
    name: "Food expiring in 48 hours is medium priority",
    food: makeFood(48),
    expected: "medium"
  },
  {
    name: "Food expiring in 100 hours is normal priority",
    food: makeFood(100),
    expected: "normal"
  },
  {
    name: "Expired food is excluded",
    food: makeFood(-1),
    expected: "excluded"
  },
  {
    name: "Reserved food is excluded",
    food: makeFood(100, "reserved"),
    expected: "excluded"
  },
  {
    name: "Collected food is excluded",
    food: makeFood(100, "collected"),
    expected: "excluded"
  },
  {
    name: "Missing expiry is excluded",
    food: makeFood(null),
    expected: "excluded"
  },
  {
    name: "Invalid expiry is excluded",
    food: { status: "available", expiryTime: "not-a-date" },
    expected: "excluded"
  }
];

for (const test of tests) {
  const result = classifyFood(test.food, now);

  assert.equal(
    result.priority,
    test.expected,
    `${test.name}: expected ${test.expected}, got ${result.priority}`
  );

  console.log(`PASS: ${test.name}`);
}

console.log(`\nAll ${tests.length} classification tests passed.`);
