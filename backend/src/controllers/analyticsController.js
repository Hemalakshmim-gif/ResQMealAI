
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const Organization = require("../models/Organization");

// EPA WARM food-donation avoided-landfilling factors (MTCO2e per US short ton).
// The factors assume a US national-average landfill mix; this is an estimate,
// not a direct measurement or a location-specific lifecycle assessment.
const EPA_WARM_MTCO2E_PER_SHORT_TON = {
  default: 0.43,
  bakery: 0.43,
  produce: 0.44,
  dairy: 0.42
};
const KG_PER_US_SHORT_TON = 907.18474;

const getImpactAnalytics = async (req, res) => {
  try {
    // Count delivered donations and sum quantities that are explicitly
    // measured in meals.
    const deliveredDonations = await Donation.find({
      status: "delivered",
      notes: { $not: /^driver-demo:/ }
    })
      .populate("food", "unit foodType quantity weightKg")
      .lean();

    let totalMealsRedistributed = 0;
    let deliveredDonationCount = 0;
    let measuredFoodKg = 0;
    let donationsWithMeasuredWeight = 0;
    let co2eAvoidedKg = 0;

    for (const donation of deliveredDonations) {
      deliveredDonationCount += 1;

      if (donation.food?.unit === "meals") {
        totalMealsRedistributed += Number(donation.quantity) || 0;
      }

      const food = donation.food;
      const quantity = Number(donation.quantity);
      const listedQuantity = Number(food?.quantity);
      let donationWeightKg = null;

      if (
        food?.unit === "kg" &&
        Number.isFinite(quantity) && quantity > 0
      ) {
        donationWeightKg = quantity;
      } else if (
        food?.unit === "grams" &&
        Number.isFinite(quantity) && quantity > 0
      ) {
        donationWeightKg = quantity / 1000;
      } else if (
        Number.isFinite(Number(food?.weightKg)) &&
        Number(food.weightKg) > 0 &&
        Number.isFinite(quantity) && quantity > 0 &&
        Number.isFinite(listedQuantity) && listedQuantity > 0
      ) {
        // The provider recorded the measured mass of the entire listing.
        // Allocate the corresponding fraction to this delivered donation.
        donationWeightKg = Number(food.weightKg) * quantity / listedQuantity;
      }

      if (Number.isFinite(donationWeightKg) && donationWeightKg > 0) {
        const factor =
          EPA_WARM_MTCO2E_PER_SHORT_TON[food?.foodType] ??
          EPA_WARM_MTCO2E_PER_SHORT_TON.default;
        measuredFoodKg += donationWeightKg;
        co2eAvoidedKg += donationWeightKg * factor * 1000 / KG_PER_US_SHORT_TON;
        donationsWithMeasuredWeight += 1;
      }
    }

    // Count successful and failed delivery outcomes.
    const deliveryOutcomes = await Delivery.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "failed"] },
          notes: { $not: /^driver-demo:/ }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: {
              $cond: [{ $eq: ["$status", "delivered"] }, 1, 0]
            }
          }
        }
      }
    ]);

    const outcome = deliveryOutcomes[0] || {
      total: 0,
      successful: 0
    };

    const successfulDeliveryRate =
      outcome.total > 0
        ? Number(((outcome.successful / outcome.total) * 100).toFixed(1))
        : null;

    // Count active provider organizations using the organization schema.
    // Restaurant, hotel and supermarket are treated as provider types.
    const [activeProviderNetwork, activeRecipientOrganizations] =
      await Promise.all([
        Organization.countDocuments({
          isActive: true,
          demoSeedKey: { $exists: false },
          type: { $in: ["restaurant", "hotel", "supermarket"] }
        }),
        Organization.countDocuments({
          isActive: true,
          demoSeedKey: { $exists: false },
          type: { $in: ["ngo", "food_bank", "shelter"] }
        })
      ]);

    return res.status(200).json({
      success: true,
      data: {
        totalMealsRedistributed,
        deliveredDonationCount,
        activeProviderNetwork,
        activeRecipientOrganizations,
        successfulDeliveryRate,
        successfulDeliveries: outcome.successful,
        deliveryOutcomes: outcome.total,
        co2EmissionsAvoidedKg: donationsWithMeasuredWeight > 0
          ? Number(co2eAvoidedKg.toFixed(2))
          : null,
        measuredFoodKg: donationsWithMeasuredWeight > 0
          ? Number(measuredFoodKg.toFixed(2))
          : null,
        donationsWithMeasuredWeight,
        donationsMissingWeight: deliveredDonationCount - donationsWithMeasuredWeight,
        co2Explanation: donationsWithMeasuredWeight > 0
          ? "Estimated landfill emissions avoided from measured delivered food weight using EPA WARM food-donation factors and a US national-average landfill baseline. This is CO2-equivalent (CO2e), not a direct measurement; transport emissions and avoided food production are not included."
          : "No delivered food has recorded weight data yet. CO2e will be estimated when donated quantity is recorded in kg/grams or a measured total listing weight in kg is entered."
      }
    });
  } catch (error) {
    console.error("Impact analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not calculate impact analytics",
      error: error.message
    });
  }
};

module.exports = { getImpactAnalytics };
