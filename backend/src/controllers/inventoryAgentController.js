
const { analyzeInventory } = require("../agents/inventorySurplusAgent");

const analyzeInventoryController = async (req, res) => {
  try {
    const result = await analyzeInventory();

    return res.status(200).json({
      success: true,
      message: "Inventory analysis completed successfully",
      data: result
    });
  } catch (error) {
    console.error("Inventory agent error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not analyze food inventory"
    });
  }
};

module.exports = { analyzeInventoryController };
