
require("dotenv").config({ quiet: true });

const {
  explainPotentialMatches,
} = require("./src/agents/demandMatchingAI");

const sampleMatches = [
  {
    food: {
      id: "food-101",
      foodName: "Vegetable Rice",
      quantity: 15,
      unit: "meals",
      foodType: "cooked",
      priority: "urgent",
      hoursUntilExpiry: 4.5,
    },
    organization: {
      id: "org-201",
      name: "Helping Hands NGO",
      city: "Bengaluru",
    },
    matching: {
      proposedMeals: 15,
      sameCity: true,
      reason: "Food type is accepted and requested; city matches.",
    },
  },
];

async function testDemandAI() {
  try {
    console.log("Starting Demand Matching AI test...");

    const result = await explainPotentialMatches(sampleMatches);

    console.log("\nDemand Matching AI test passed.");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\nDemand Matching AI test failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
}

testDemandAI();
