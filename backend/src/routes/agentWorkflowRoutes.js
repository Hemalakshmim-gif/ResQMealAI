const express = require("express");
const {
  startAgentWorkflow,
  getAgentWorkflowHistory,
  getAgentWorkflow,
  getAgentWorkflowStatus,
  reviewAgentWorkflowSafety
} = require("../controllers/agentWorkflowController");
const { authenticateOrganization } = require("../middleware/authMiddleware");

const router = express.Router();

function requireProviderOrganization(req, res, next) {
  if (req.organization?.role !== "provider") {
    return res.status(403).json({
      success: false,
      code: "PROVIDER_ACCESS_REQUIRED",
      message: "Only provider organizations can access these workflows."
    });
  }
  return next();
}

router.use(authenticateOrganization, requireProviderOrganization);

router.post("/workflows", startAgentWorkflow);
router.get("/workflows", getAgentWorkflowHistory);
router.get("/workflows/:executionId/status", getAgentWorkflowStatus);
router.get("/workflows/:executionId", getAgentWorkflow);
router.post(
  "/workflows/:executionId/safety-review",
  reviewAgentWorkflowSafety
);

module.exports = router;
