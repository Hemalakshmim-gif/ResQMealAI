
const {
  matchFoodWithOrganizations,
} = require("../agents/demandMatchingAgent");

// Existing endpoint: preserve the current behavior.
const analyzeDemandMatchingController = async (req, res) => {
  try {
    const result = await matchFoodWithOrganizations();

    return res.status(200).json({
      success: true,
      message: "Demand matching analysis completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Demand matching controller error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not analyze demand matching",
      error: error.message,
    });
  }
};

// New endpoint: match food using estimated provider demand.
const analyzeDemandMatchingWithSurplusController = async (req, res) => {
  try {
    const { expectedDemandByFoodId } = req.body || {};

    if (
      !expectedDemandByFoodId ||
      typeof expectedDemandByFoodId !== "object" ||
      Array.isArray(expectedDemandByFoodId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "expectedDemandByFoodId must be an object mapping food IDs to expected demand quantities",
      });
    }

    const entries = Object.entries(expectedDemandByFoodId);

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide expected demand for at least one food item",
      });
    }

    const invalidEntry = entries.find(
      ([foodId, demand]) =>
        !foodId.trim() ||
        typeof demand !== "number" ||
        !Number.isFinite(demand) ||
        demand < 0
    );

    if (invalidEntry) {
      return res.status(400).json({
        success: false,
        message:
          "Every expected-demand value must be a finite, non-negative number",
        invalidFoodId: invalidEntry[0],
      });
    }

    const result = await matchFoodWithOrganizations({
      expectedDemandByFoodId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Surplus-aware demand matching analysis completed successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Surplus-aware demand matching controller error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Could not analyze surplus-aware demand matching",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeDemandMatchingController,
  analyzeDemandMatchingWithSurplusController,
};
