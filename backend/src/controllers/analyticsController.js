
const Donation = require("../models/Donation");
const Delivery = require("../models/Delivery");
const Organization = require("../models/Organization");

const getImpactAnalytics = async (req, res) => {
  try {
    // Count delivered donations and sum quantities that are explicitly
    // measured in meals.
    const deliveredDonations = await Donation.find({
      status: "delivered"
    })
      .populate("food", "unit")
      .lean();

    let totalMealsRedistributed = 0;
    let deliveredDonationCount = 0;

    for (const donation of deliveredDonations) {
      deliveredDonationCount += 1;

      if (donation.food?.unit === "meals") {
        totalMealsRedistributed += Number(donation.quantity) || 0;
      }
    }

    // Count successful and failed delivery outcomes.
    const deliveryOutcomes = await Delivery.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "failed"] }
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
    const activeProviderNetwork = await Organization.countDocuments({
      isActive: true,
      type: { $in: ["restaurant", "hotel", "supermarket"] }
    });

    // We don't have a verified emissions factor or reliable food mass
    // for every unit, so do not invent a CO2 estimate.
    return res.status(200).json({
      success: true,
      data: {
        totalMealsRedistributed,
        deliveredDonationCount,
        activeProviderNetwork,
        successfulDeliveryRate,
        successfulDeliveries: outcome.successful,
        deliveryOutcomes: outcome.total,
        co2EmissionsAvoidedTons: null,
        co2Explanation:
          "Unavailable: a documented emissions factor and compatible food quantity data are required."
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
