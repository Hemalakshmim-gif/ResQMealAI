const mongoose = require("mongoose");
const AgentExecution = require("../models/AgentExecution");
const FoodInventory = require("../models/FoodInventory");
const FoodSafetyReview = require("../models/FoodSafetyReview");
const Organization = require("../models/Organization");
const { runFoodRescueWorkflow } = require("../agents/agentOrchestrator");
const { runSafetyAgent } = require("../agents/safetyAgent");
const { evaluateFoodSafety } = require("../agents/foodSafetyEligibilityAgent");

const WORKFLOW_STATUSES = new Set([
  "RUNNING",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "NO_DRIVER_AVAILABLE",
  "NO_SURPLUS",
  "UNSAFE_FOOD",
  "NO_RECIPIENT",
  "FAILED",
  "COMPLETED"
]);

function sendWorkflowError(res, error, operation) {
  if (error.code === "INVALID_FOOD_ID" || error.code === "INVALID_EXPECTED_DEMAND") {
    return res.status(400).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }

  if (error.code === "WORKFLOW_ALREADY_RUNNING") {
    return res.status(409).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }

  if (error.code === "FOOD_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      code: error.code,
      message: error.message
    });
  }

  console.error(`${operation} failed:`, error);
  return res.status(500).json({
    success: false,
    code: "AGENT_WORKFLOW_ERROR",
    message: "The agent workflow request could not be completed."
  });
}

function parsePageValue(value, fallback, maximum) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum
    ? parsed
    : null;
}

async function startAgentWorkflow(req, res) {
  const { foodId, expectedDemand } = req.body || {};
  if (typeof foodId !== "string" || !mongoose.isValidObjectId(foodId)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_FOOD_ID",
      message: "A valid food ID is required."
    });
  }

  if (
    expectedDemand !== undefined &&
    (
      typeof expectedDemand !== "number" ||
      !Number.isFinite(expectedDemand) ||
      expectedDemand < 0
    )
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EXPECTED_DEMAND",
      message: "Expected demand must be a non-negative number."
    });
  }

  try {
    const food = await FoodInventory.findOne({
      _id: foodId,
      providerOrganization: req.organization.id
    })
      .select("_id")
      .lean();

    if (!food) {
      return res.status(404).json({
        success: false,
        code: "FOOD_NOT_FOUND",
        message: "The food listing was not found."
      });
    }

    const data = await runFoodRescueWorkflow({
      foodId,
      expectedDemand,
      providerOrganizationId: req.organization.id
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return sendWorkflowError(res, error, "Starting agent workflow");
  }
}

async function getAgentWorkflowHistory(req, res) {
  const page = parsePageValue(req.query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePageValue(req.query.limit, 20, 100);
  if (page === null || limit === null) {
    return res.status(400).json({
      success: false,
      code: "INVALID_PAGINATION",
      message: "Page and limit must be positive integers; limit cannot exceed 100."
    });
  }

  const filter = {
    providerOrganization: req.organization.id
  };
  if (req.query.status !== undefined) {
    if (
      typeof req.query.status !== "string" ||
      !WORKFLOW_STATUSES.has(req.query.status)
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_WORKFLOW_STATUS",
        message: "The requested workflow status is invalid."
      });
    }
    filter.workflowStatus = req.query.status;
  }

  try {
    const [data, total] = await Promise.all([
      AgentExecution.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("food", "foodName quantity unit status")
        .lean(),
      AgentExecution.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return sendWorkflowError(res, error, "Loading agent workflow history");
  }
}

async function getAgentWorkflow(req, res) {
  const { executionId } = req.params;
  if (!mongoose.isValidObjectId(executionId)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_WORKFLOW_ID",
      message: "A valid workflow ID is required."
    });
  }

  try {
    const data = await AgentExecution.findOne({
      _id: executionId,
      providerOrganization: req.organization.id
    })
      .populate("food", "foodName quantity unit status")
      .populate("latestSafetyReview", "reviewStatus reviewedBy reviewedAt")
      .lean();

    if (!data) {
      return res.status(404).json({
        success: false,
        code: "WORKFLOW_NOT_FOUND",
        message: "The workflow was not found."
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendWorkflowError(res, error, "Loading agent workflow");
  }
}

async function getAgentWorkflowStatus(req, res) {
  const { executionId } = req.params;
  if (!mongoose.isValidObjectId(executionId)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_WORKFLOW_ID",
      message: "A valid workflow ID is required."
    });
  }

  try {
    const workflow = await AgentExecution.findOne({
      _id: executionId,
      providerOrganization: req.organization.id
    })
      .select("workflowStatus approvalStatus statusMessage failureReason agentRuns")
      .lean();

    if (!workflow) {
      return res.status(404).json({
        success: false,
        code: "WORKFLOW_NOT_FOUND",
        message: "The workflow was not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        executionId: String(workflow._id),
        workflowStatus: workflow.workflowStatus,
        approvalStatus: workflow.approvalStatus,
        statusMessage: workflow.statusMessage,
        failureReason: workflow.failureReason,
        agents: workflow.agentRuns.map((run) => ({
          agent: run.agent,
          status: run.status,
          error: run.error,
          startedAt: run.startedAt,
          completedAt: run.completedAt
        }))
      }
    });
  } catch (error) {
    return sendWorkflowError(res, error, "Loading agent workflow status");
  }
}

async function reviewAgentWorkflowSafety(req, res) {
  const { executionId } = req.params;
  const {
    foodId,
    reviewStatus,
    storageVerified,
    packagingVerified,
    handlingVerified,
    reviewNotes
  } = req.body || {};

  if (!mongoose.isValidObjectId(executionId)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_WORKFLOW_ID",
      message: "A valid workflow ID is required."
    });
  }
  if (typeof foodId !== "string" || !mongoose.isValidObjectId(foodId)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_FOOD_ID",
      message: "A valid food ID is required."
    });
  }
  if (!["approved", "rejected"].includes(reviewStatus)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REVIEW_STATUS",
      message: "Review status must be approved or rejected."
    });
  }
  if (
    [storageVerified, packagingVerified, handlingVerified]
      .some((value) => value !== undefined && typeof value !== "boolean")
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REVIEW_CHECKS",
      message: "Safety verification checks must be boolean values."
    });
  }
  if (
    reviewStatus === "approved" &&
    (
      storageVerified !== true ||
      packagingVerified !== true ||
      handlingVerified !== true
    )
  ) {
    return res.status(400).json({
      success: false,
      code: "SAFETY_CHECKS_REQUIRED",
      message: "Approval requires storage, packaging, and handling verification."
    });
  }
  if (
    reviewNotes !== undefined &&
    (typeof reviewNotes !== "string" || reviewNotes.length > 2000)
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REVIEW_NOTES",
      message: "Review notes must be text no longer than 2000 characters."
    });
  }

  try {
    const workflow = await AgentExecution.findOne({
      _id: executionId,
      providerOrganization: req.organization.id
    }).lean();
    if (!workflow) {
      return res.status(404).json({
        success: false,
        code: "WORKFLOW_NOT_FOUND",
        message: "The workflow was not found."
      });
    }
    if (workflow.workflowStatus !== "WAITING_FOR_APPROVAL") {
      return res.status(409).json({
        success: false,
        code: "WORKFLOW_NOT_WAITING_FOR_APPROVAL",
        message: "The workflow is not waiting for a safety review."
      });
    }

    const assessment = workflow.latestSafetyAssessment?.assessments?.find(
      (item) => String(item.foodId) === String(foodId)
    );
    if (!assessment || assessment.safetyStatus !== "WARNING") {
      return res.status(409).json({
        success: false,
        code: "FOOD_NOT_AWAITING_REVIEW",
        message: "This food is not awaiting a safety review in the workflow."
      });
    }

    const food = await FoodInventory.findOne({
      _id: foodId,
      providerOrganization: req.organization.id
    }).lean();
    if (!food) {
      return res.status(404).json({
        success: false,
        code: "FOOD_NOT_FOUND",
        message: "The food listing was not found."
      });
    }

    const inventorySafety = evaluateFoodSafety(food, new Date(), null);
    if (inventorySafety.eligibilityStatus === "ineligible") {
      return res.status(409).json({
        success: false,
        code: "FOOD_NOT_ELIGIBLE_FOR_REVIEW",
        message: "This food listing is no longer eligible for review.",
        reasons: inventorySafety.reasons
      });
    }

    const organization = await Organization.findById(
      req.organization.id
    ).select("name");
    if (!organization) {
      return res.status(404).json({
        success: false,
        code: "ORGANIZATION_NOT_FOUND",
        message: "The authenticated organization was not found."
      });
    }

    const review = await FoodSafetyReview.create({
      food: food._id,
      reviewStatus,
      storageVerified: storageVerified === true,
      packagingVerified: packagingVerified === true,
      handlingVerified: handlingVerified === true,
      reviewedBy: organization.name,
      reviewNotes: typeof reviewNotes === "string" ? reviewNotes.trim() : "",
      reviewedAt: new Date()
    });

    const safetyResult = await runSafetyAgent({
      foodIds: workflow.latestSafetyAssessment.assessments.map(
        (item) => String(item.foodId)
      )
    });
    const safetyAssessment = safetyResult.output;
    const hasUnsafeFood = safetyAssessment.unsafeFoodIds.length > 0;
    const hasPendingReview = safetyAssessment.warningFoodIds.length > 0;
    const rejected = reviewStatus === "rejected" || hasUnsafeFood;
    const approvalStatus = rejected
      ? "rejected"
      : hasPendingReview
        ? "pending"
        : "approved";
    const workflowStatus = rejected ? "UNSAFE_FOOD" : "WAITING_FOR_APPROVAL";
    const statusMessage = rejected
      ? "Safety review rejected or food eligibility failed; the workflow was stopped."
      : hasPendingReview
        ? "Safety review recorded; other food items remain under review."
        : "Safety review approved; the workflow remains paused until it is resumed.";
    const update = {
      $set: {
        latestSafetyAssessment: safetyAssessment,
        latestSafetyReview: review._id,
        approvalStatus,
        workflowStatus,
        statusMessage,
        failureReason: "",
        ...(rejected ? { completedAt: new Date() } : {})
      }
    };
    if (rejected) {
      update.$unset = { activeKey: 1 };
    }

    const updatedWorkflow = await AgentExecution.findOneAndUpdate(
      {
        _id: executionId,
        providerOrganization: req.organization.id,
        workflowStatus: "WAITING_FOR_APPROVAL"
      },
      update,
      {
        returnDocument: "after",
        runValidators: true
      }
    );
    if (!updatedWorkflow) {
      return res.status(409).json({
        success: false,
        code: "WORKFLOW_CHANGED",
        message: "The review was recorded, but the workflow changed concurrently."
      });
    }

    return res.status(200).json({
      success: true,
      message: statusMessage,
      data: {
        executionId: String(updatedWorkflow._id),
        foodId: String(food._id),
        reviewId: String(review._id),
        reviewStatus,
        approvalStatus,
        workflowStatus
      }
    });
  } catch (error) {
    return sendWorkflowError(res, error, "Reviewing agent workflow safety");
  }
}

module.exports = {
  startAgentWorkflow,
  getAgentWorkflowHistory,
  getAgentWorkflow,
  getAgentWorkflowStatus,
  reviewAgentWorkflowSafety
};
