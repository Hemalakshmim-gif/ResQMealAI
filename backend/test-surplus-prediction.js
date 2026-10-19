
const assert = require("node:assert/strict");
const { predictSurplus } = require("./src/agents/surplusPrediction");

const now = new Date("2026-10-12T10:00:00.000Z");

function food(overrides = {}) {
  return {
    _id: "food-test-1",
    foodName: "Vegetable Rice",
    quantity: 100,
    unit: "meals",
    status: "available",
    expiryTime: "2026-10-15T10:00:00.000Z",
    ...overrides
  };
}

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

test("Calculates positive surplus", () => {
  const result = predictSurplus(food(), 65, now);
  assert.equal(result.estimatedSurplus, 35);
  assert.equal(result.predictionStatus, "estimated");
});

test("Never predicts negative surplus", () => {
  const result = predictSurplus(food(), 120, now);
  assert.equal(result.estimatedSurplus, 0);
});

test("Supports zero expected demand", () => {
  const result = predictSurplus(food(), 0, now);
  assert.equal(result.estimatedSurplus, 100);
});

test("Requires expected demand", () => {
  const result = predictSurplus(food(), undefined, now);
  assert.equal(result.predictionStatus, "insufficient_data");
  assert.equal(result.estimatedSurplus, null);
});

test("Rejects negative expected demand", () => {
  const result = predictSurplus(food(), -5, now);
  assert.equal(result.predictionStatus, "insufficient_data");
});

test("Excludes expired food", () => {
  const result = predictSurplus(
    food({ expiryTime: "2026-10-11T10:00:00.000Z" }),
    20,
    now
  );
  assert.equal(result.predictionStatus, "excluded");
  assert.equal(result.estimatedSurplus, null);
});

test("Excludes unavailable food", () => {
  const result = predictSurplus(
    food({ status: "reserved" }),
    20,
    now
  );
  assert.equal(result.predictionStatus, "excluded");
  assert.equal(result.estimatedSurplus, null);
});

console.log(`\nResults: ${passed}/7 passed`);
