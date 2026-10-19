
require("dotenv").config({ quiet: true });

const {
  explainEligibleInventory,
} = require("./src/agents/inventoryAIReasoning");

async function testGemini() {
  const sampleFoods = [
    {
      _id: "food-101",
      foodName: "Vegetable Rice",
      quantity: 15,
      unit: "meals",
      foodType: "cooked",
      hoursUntilExpiry: 4,
      priority: "urgent",
      reason: "Expires within 6 hours",
    },
    {
      _id: "food-102",
      foodName: "Packaged Biscuits",
      quantity: 20,
      unit: "packets",
      foodType: "packaged",
      hoursUntilExpiry: 48,
      priority: "medium",
      reason: "Expires within 72 hours",
    },
    {
      _id: "food-103",
      foodName: "Expired Rice",
      quantity: 10,
      unit: "meals",
      foodType: "cooked",
      hoursUntilExpiry: -2,
      priority: "excluded",
      reason: "Expiry time has passed",
    },
  ];

  try {
    const recommendations =
      await explainEligibleInventory(sampleFoods);

    console.log("\nGemini AI test successful!");
    console.log(JSON.stringify(recommendations, null, 2));

    const expiredFoodIncluded = recommendations.some(
      (item) => item.id === "food-103"
    );

    if (expiredFoodIncluded) {
      throw new Error("Expired food was incorrectly recommended");
    }

    console.log("\nSafety check passed: excluded food was not recommended.");
  } catch (error) {
    console.error("\nGemini AI test failed:");
    console.error(error.message);
  }
}

testGemini();
