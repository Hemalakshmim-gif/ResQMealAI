
const FoodInventory = require("../models/FoodInventory");

const analyzeInventory = async () => {
  const now = new Date();

  // Read all inventory records without changing them.
  const foods = await FoodInventory.find().lean();

  const analyzedFoods = foods.map((food) => {
    const expiryTime = new Date(food.expiryTime);
    const hoursUntilExpiry =
      (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isExpired = expiryTime <= now;
    const isAvailable = food.status === "available";

    let priority = "normal";
    let recommendation = "monitor";
    let reason = "Food is available with sufficient time before expiry.";

    if (isExpired) {
      priority = "excluded";
      recommendation = "do_not_redistribute";
      reason = "The recorded expiry time has passed.";
    } else if (!isAvailable) {
      priority = "excluded";
      recommendation = "not_available";
      reason = `Food status is '${food.status}', not 'available'.`;
    } else if (hoursUntilExpiry <= 6) {
      priority = "urgent";
      recommendation = "prioritize_redistribution";
      reason = "Food expires within 6 hours.";
    } else if (hoursUntilExpiry <= 24) {
      priority = "high";
      recommendation = "prioritize_redistribution";
      reason = "Food expires within 24 hours.";
    } else if (hoursUntilExpiry <= 72) {
      priority = "medium";
      recommendation = "consider_redistribution";
      reason = "Food expires within 72 hours.";
    }

    return {
      _id: food._id,
      foodName: food.foodName,
      quantity: food.quantity,
      unit: food.unit,
      providerName: food.providerName,
      pickupAddress: food.pickupAddress,
      foodType: food.foodType,
      status: food.status,
      expiryTime: food.expiryTime,
      hoursUntilExpiry: Number(hoursUntilExpiry.toFixed(2)),
      priority,
      recommendation,
      reason
    };
  });

  // Sort urgent records first, then high, medium, normal, excluded.
  const priorityOrder = {
    urgent: 1,
    high: 2,
    medium: 3,
    normal: 4,
    excluded: 5
  };

  analyzedFoods.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const summary = {
    totalRecords: analyzedFoods.length,
    urgent: analyzedFoods.filter((food) => food.priority === "urgent").length,
    high: analyzedFoods.filter((food) => food.priority === "high").length,
    medium: analyzedFoods.filter((food) => food.priority === "medium").length,
    normal: analyzedFoods.filter((food) => food.priority === "normal").length,
    excluded: analyzedFoods.filter((food) => food.priority === "excluded").length
  };

  return {
    analyzedAt: now,
    summary,
    recommendations: analyzedFoods
  };
};

module.exports = { analyzeInventory };
