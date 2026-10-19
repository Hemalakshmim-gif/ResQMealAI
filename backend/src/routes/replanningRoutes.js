const express = require("express");
const {
  getReplanningProposals,
  approveReplanningProposal
} = require("../controllers/replanningController");

const router = express.Router();

router.get("/proposals", getReplanningProposals);
router.patch("/:deliveryId/approve", approveReplanningProposal);

module.exports = router;