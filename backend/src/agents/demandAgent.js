const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const FoodInventory = require("../models/FoodInventory");
const { createAgentResult } = require("./agentResult");

const RECIPIENT_TYPES = new Set(["ngo", "food_bank", "shelter"]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function runDemandAgent({ safetyAssessments }) {
  const startedAt = new Date();

  if (!Array.isArray(safetyAssessments)) {
    throw new Error("safetyAssessments must be an array.");
  }

  const suppliedFoodIds = safetyAssessments
    .filter((assessment) => assessment?.safetyStatus === "SAFE")
    .map((assessment) => assessment.foodId);
  const uniqueFoodIds = [...new Set(suppliedFoodIds.map(String))];
  if (uniqueFoodIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error("safeFoodIds contains an invalid food ID.");
  }
  const safetyByFoodId = new Map(
    safetyAssessments.map((assessment) => [
      String(assessment?.foodId || ""),
      assessment
    ])
  );

  const [foods, organizations] = await Promise.all([
    uniqueFoodIds.length
      ? FoodInventory.find({
          _id: { $in: uniqueFoodIds },
          status: "available"
        }).lean()
      : [],
    Organization.find({
      isActive: true,
      type: { $in: [...RECIPIENT_TYPES] }
    }).lean()
  ]);

  const recipientsByFood = foods.map((food) => {
    const foodType = normalize(food.foodType);
    const safety = safetyByFoodId.get(String(food._id));
    const recipients = organizations
      .filter((organization) => {
        const accepted = (organization.acceptedFoodTypes || [])
          .map(normalize);
        const requested = (organization.requestedFoodTypes || [])
          .map(normalize);

        return (
          accepted.includes(foodType) &&
          requested.includes(foodType) &&
          Number(organization.requestedMeals) > 0
        );
      })
      .map((organization) => {
        const requestedMeals = Number(organization.requestedMeals);
        const capacityMeals = Number(organization.capacityMeals);
        const availableMeals =
          Number.isFinite(capacityMeals) && capacityMeals > 0
            ? Math.min(requestedMeals, capacityMeals)
            : requestedMeals;

        return {
          organizationId: String(organization._id),
          organizationName: organization.name,
          type: organization.type,
          city: organization.city,
          address: organization.address,
          coordinates: organization.coordinates || null,
          acceptedFoodTypes: organization.acceptedFoodTypes || [],
          requestedFoodTypes: organization.requestedFoodTypes || [],
          requestedMeals,
          capacityMeals:
            Number.isFinite(capacityMeals) && capacityMeals > 0
              ? capacityMeals
              : null,
          availableMeals
        };
      })
      .filter((recipient) => recipient.availableMeals > 0);

    return {
      foodId: String(food._id),
      foodName: food.foodName,
      foodType: food.foodType,
      quantity: food.quantity,
      unit: food.unit,
      safetyStatus: safety?.safetyStatus || "SAFE",
      potentialSurplus:
        typeof safety?.potentialSurplus === "number"
          ? safety.potentialSurplus
          : food.quantity,
      recipients
    };
  });

  return createAgentResult({
    agent: "Demand Agent",
    startedAt,
    input: { safeFoodIds: uniqueFoodIds },
    output: {
      recipientsByFood,
      matchedFoodCount: recipientsByFood.filter(
        (item) => item.recipients.length > 0
      ).length,
      unmatchedFoodIds: recipientsByFood
        .filter((item) => item.recipients.length === 0)
        .map((item) => item.foodId)
    }
  });
}

module.exports = { runDemandAgent };
