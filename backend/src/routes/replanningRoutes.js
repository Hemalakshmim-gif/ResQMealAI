const express = require("express");
const { authenticateOrganization } = require("../middleware/authMiddleware");
const {
  getReplanningProposals,
  approveReplanningProposal
} = require("../controllers/replanningController");

const router = express.Router();

router.use(authenticateOrganization, (req, res, next) => {
  if (req.organization?.role !== "provider") {
    return res.status(403).json({
      success: false,
      message: "Only provider accounts can reassign their failed deliveries"
    });
  }
  return next();
});

router.get("/proposals", getReplanningProposals);
router.patch("/:deliveryId/approve", approveReplanningProposal);

module.exports = router;
