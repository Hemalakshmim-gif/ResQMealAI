const mongoose = require("mongoose");
const AgentExecution = require("../models/AgentExecution");

const ACTIVE_WORKFLOW_STATUSES = new Set([
  "RUNNING",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "NO_DRIVER_AVAILABLE"
]);

const TERMINAL_WORKFLOW_STATUSES = new Set([
  "NO_SURPLUS",
  "UNSAFE_FOOD",
  "NO_RECIPIENT",
  "FAILED",
  "COMPLETED"
]);

function objectIdString(value, label) {
  if (!mongoose.isValidObjectId(value)) {
    throw new Error(`${label} must be a valid ID.`);
  }
  return new mongoose.Types.ObjectId(value).toString();
}

async function createWorkflowExecution({ foodId }) {
  const normalizedFoodId = objectIdString(foodId, "foodId");

  try {
    await AgentExecution.init();
    return await AgentExecution.create({
      food: normalizedFoodId,
      activeKey: normalizedFoodId,
      workflowStatus: "RUNNING",
      statusMessage: "Workflow execution started.",
      startedAt: new Date()
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error(
        "An active workflow already exists for this food listing."
      );
      duplicate.code = "WORKFLOW_ALREADY_RUNNING";
      throw duplicate;
    }
    throw error;
  }
}

async function startAgentRun({ executionId, agent, input }) {
  const normalizedExecutionId = objectIdString(
    executionId,
    "executionId"
  );
  const startedAt = new Date();
  const execution = await AgentExecution.findOneAndUpdate(
    {
      _id: normalizedExecutionId,
      workflowStatus: { $in: [...ACTIVE_WORKFLOW_STATUSES] }
    },
    {
      $set: { workflowStatus: "RUNNING" },
      $push: {
        agentRuns: {
          agent,
          status: "RUNNING",
          input,
          output: {},
          startedAt
        }
      }
    },
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  if (!execution || execution.agentRuns.length === 0) {
    const error = new Error(
      "Could not start the agent execution record."
    );
    error.code = "AGENT_EXECUTION_NOT_FOUND";
    throw error;
  }

  const run = execution.agentRuns[execution.agentRuns.length - 1];
  return {
    runId: String(run._id),
    startedAt: run.startedAt
  };
}

async function completeAgentRun({
  executionId,
  runId,
  result
}) {
  const normalizedExecutionId = objectIdString(
    executionId,
    "executionId"
  );
  const normalizedRunId = objectIdString(runId, "runId");
  const update = await AgentExecution.findOneAndUpdate(
    {
      _id: normalizedExecutionId,
      agentRuns: {
        $elemMatch: {
          _id: normalizedRunId,
          status: "RUNNING"
        }
      }
    },
    {
      $set: {
        "agentRuns.$.status": result.status,
        "agentRuns.$.input": result.input,
        "agentRuns.$.output": result.output,
        "agentRuns.$.error":
          result.status === "FAILED"
            ? result.output?.failureReason || "Agent failed."
            : "",
        "agentRuns.$.startedAt": result.startedAt,
        "agentRuns.$.completedAt": result.completedAt || new Date()
      }
    },
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  if (!update) {
    const error = new Error(
      "The running agent execution record could not be completed."
    );
    error.code = "AGENT_RUN_NOT_FOUND";
    throw error;
  }
  return update;
}

async function updateWorkflowExecution({
  executionId,
  foodId,
  workflowStatus,
  message,
  providerOrganizationId,
  safetyAssessment,
  matchingResults,
  logisticsResults,
  failureReason
}) {
  if (
    !ACTIVE_WORKFLOW_STATUSES.has(workflowStatus) &&
    !TERMINAL_WORKFLOW_STATUSES.has(workflowStatus)
  ) {
    throw new Error("workflowStatus is invalid.");
  }

  const normalizedExecutionId = objectIdString(
    executionId,
    "executionId"
  );
  const update = {
    $set: {
      workflowStatus,
      statusMessage: message || "",
      failureReason: failureReason || "",
      completedAt: TERMINAL_WORKFLOW_STATUSES.has(workflowStatus)
        ? new Date()
        : null
    }
  };

  if (providerOrganizationId) {
    update.$set.providerOrganization = objectIdString(
      providerOrganizationId,
      "providerOrganizationId"
    );
  }
  if (safetyAssessment !== undefined) {
    update.$set.latestSafetyAssessment = safetyAssessment;
    const reviewId = safetyAssessment?.assessments?.find(
      (assessment) => assessment.reviewId
    )?.reviewId;
    if (reviewId && mongoose.isValidObjectId(reviewId)) {
      update.$set.latestSafetyReview = reviewId;
    }
    if (workflowStatus === "WAITING_FOR_APPROVAL") {
      update.$set.approvalStatus = "pending";
    } else if (
      safetyAssessment?.assessments?.some(
        (assessment) => assessment.reviewStatus === "rejected"
      )
    ) {
      update.$set.approvalStatus = "rejected";
    } else if (
      safetyAssessment?.assessments?.some(
        (assessment) => assessment.reviewStatus === "approved"
      )
    ) {
      update.$set.approvalStatus = "approved";
    } else {
      update.$set.approvalStatus = "not_required";
    }
  }
  if (matchingResults !== undefined) {
    update.$set.matchingResults = matchingResults;
  }
  if (logisticsResults !== undefined) {
    update.$set.logisticsResults = logisticsResults;
  }

  if (TERMINAL_WORKFLOW_STATUSES.has(workflowStatus)) {
    update.$unset = { activeKey: 1 };
  } else {
    update.$set.activeKey = objectIdString(foodId, "foodId");
  }

  const execution = await AgentExecution.findByIdAndUpdate(
    normalizedExecutionId,
    update,
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  if (!execution) {
    const error = new Error("Workflow execution was not found.");
    error.code = "WORKFLOW_EXECUTION_NOT_FOUND";
    throw error;
  }
  return execution;
}

module.exports = {
  createWorkflowExecution,
  startAgentRun,
  completeAgentRun,
  updateWorkflowExecution,
  ACTIVE_WORKFLOW_STATUSES,
  TERMINAL_WORKFLOW_STATUSES
};
