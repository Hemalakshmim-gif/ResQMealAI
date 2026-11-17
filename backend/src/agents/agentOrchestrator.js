const mongoose = require("mongoose");
const {
  createAgentResult
} = require("./agentResult");
const { runRestaurantAgent } = require("./restaurantAgent");
const { runSafetyAgent } = require("./safetyAgent");
const { runDemandAgent } = require("./demandAgent");
const { runMatchingAgent } = require("./matchingAgent");
const { planMatchedDelivery } = require("./logisticsAgent");
const { runMonitoringAgent } = require("./monitoringAgent");
const {
  createWorkflowExecution,
  startAgentRun,
  completeAgentRun,
  updateWorkflowExecution
} = require("../services/agentExecutionService");

const activeFoodWorkflows = new Set();

function failureResult(agent, input, error) {
  return createAgentResult({
    agent,
    status: "FAILED",
    input,
    output: {
      code: error.code || "AGENT_EXECUTION_FAILED",
      failureReason: error.message || `${agent} failed.`
    }
  });
}

async function runFoodRescueWorkflow({
  foodId,
  expectedDemand,
  providerOrganizationId,
  now = new Date()
}) {
  if (!mongoose.isValidObjectId(foodId)) {
    const error = new Error("A valid food ID is required.");
    error.code = "INVALID_FOOD_ID";
    throw error;
  }

  if (
    expectedDemand !== undefined &&
    (
      typeof expectedDemand !== "number" ||
      !Number.isFinite(expectedDemand) ||
      expectedDemand < 0
    )
  ) {
    const error = new Error("Expected demand must be a non-negative number.");
    error.code = "INVALID_EXPECTED_DEMAND";
    throw error;
  }

  const workflowKey = new mongoose.Types.ObjectId(foodId).toString();
  if (activeFoodWorkflows.has(workflowKey)) {
    const error = new Error(
      "A food rescue workflow is already running for this food listing."
    );
    error.code = "WORKFLOW_ALREADY_RUNNING";
    throw error;
  }

  activeFoodWorkflows.add(workflowKey);
  const agentResults = [];
  let execution = null;
  let workflowStatus = "IN_PROGRESS";
  let message =
    "The workflow is progressing; delivery completion is not yet confirmed.";

  const executeAgent = async (agent, input, operation) => {
    const run = await startAgentRun({
      executionId: execution._id,
      agent,
      input
    });

    let result;
    try {
      result = await operation();
    } catch (error) {
      result = failureResult(agent, input, error);
    }

    await completeAgentRun({
      executionId: execution._id,
      runId: run.runId,
      result
    });
    agentResults.push(result);

    if (result.status === "FAILED") {
      workflowStatus = "FAILED";
      message = `${agent} failed: ${
        result.output.failureReason || "Unknown error."
      }`;
      return null;
    }
    return result;
  };

  try {
    execution = await createWorkflowExecution({
      foodId: workflowKey,
      providerOrganizationId
    });

    const restaurant = await executeAgent(
      "Restaurant Agent",
      { foodId: workflowKey, expectedDemand: expectedDemand ?? null },
      () => runRestaurantAgent({ foodId, expectedDemand, now })
    );
    if (!restaurant) {
      return await finishWorkflow("FAILED", message);
    }

    const predictedSurplus =
      restaurant.output?.predictedSurplus || [];
    if (predictedSurplus.length === 0) {
      workflowStatus = "NO_SURPLUS";
      message =
        "No eligible surplus was found in the provider listing.";
      return await finishWorkflow(workflowStatus, message);
    }

    const safety = await executeAgent(
      "Safety Agent",
      {
        foodIds: predictedSurplus.map((food) => food.foodId)
      },
      () => runSafetyAgent({ predictedSurplus, now })
    );
    if (!safety) {
      return await finishWorkflow("FAILED", message);
    }

    if (safety.status === "WAITING_FOR_APPROVAL") {
      workflowStatus = "WAITING_FOR_APPROVAL";
      message =
        "The workflow is paused until a human completes the food-safety review.";
      return await finishWorkflow(workflowStatus, message);
    }

    if (safety.output.safeFoodIds.length === 0) {
      workflowStatus = "UNSAFE_FOOD";
      message =
        "Food safety checks did not approve any food for automatic matching.";
      return await finishWorkflow(workflowStatus, message);
    }

    const demand = await executeAgent(
      "Demand Agent",
      { safeFoodIds: safety.output.safeFoodIds },
      () => runDemandAgent({
        safetyAssessments: safety.output.assessments
      })
    );
    if (!demand) {
      return await finishWorkflow("FAILED", message);
    }

    const matching = await executeAgent(
      "Matching Agent",
      {
        safeFoodIds: safety.output.safeFoodIds,
        candidateFoodCount: demand.output.recipientsByFood.length
      },
      () => runMatchingAgent({
        safeFoods: safety.output.assessments,
        recipientsByFood: demand.output.recipientsByFood,
        now
      })
    );
    if (!matching) {
      return await finishWorkflow("FAILED", message);
    }

    if (matching.output.allocations.length === 0) {
      workflowStatus = "NO_RECIPIENT";
      message =
        "No compatible recipient with remaining meal demand was found.";
      return await finishWorkflow(workflowStatus, message);
    }

    const logisticsResult = await executeAgent(
      "Logistics Agent",
      {
        allocations: matching.output.allocations.map((allocation) => ({
          foodId: allocation.foodId,
          organizationId: allocation.organizationId,
          quantity: allocation.allocatedQuantity
        }))
      },
      async () => {
        const logisticsStartedAt = new Date();
        const logisticsPlans = [];

        for (const allocation of matching.output.allocations) {
          const foodSafety = safety.output.assessments.find(
            (assessment) => assessment.foodId === allocation.foodId
          );
          const recipient = demand.output.recipientsByFood
            .find((entry) => entry.foodId === allocation.foodId)
            ?.recipients.find(
              (candidate) =>
                candidate.organizationId === allocation.organizationId
            );
          const pickup = restaurant.output.predictedSurplus.find(
            (food) => food.foodId === allocation.foodId
          );

          if (!foodSafety || !recipient || !pickup) {
            const error = new Error(
              "Matching output could not be linked to its safety, pickup, and recipient records."
            );
            error.code = "WORKFLOW_HANDOFF_INVALID";
            throw error;
          }

          const plan = await planMatchedDelivery({
            foodId: allocation.foodId,
            foodName: allocation.foodName,
            safetyStatus: foodSafety.safetyStatus,
            quantity: allocation.allocatedQuantity,
            unit: allocation.unit,
            pickupAddress: pickup.pickupAddress,
            deliveryAddress: recipient.address
          });
          logisticsPlans.push(plan.output);
        }

        return createAgentResult({
          agent: "Logistics Agent",
          status: "COMPLETED",
          startedAt: logisticsStartedAt,
          input: {
            allocationCount: matching.output.allocations.length
          },
          output: {
            plans: logisticsPlans,
            assignmentStatus: logisticsPlans.every(
              (item) => item.assignmentStatus === "driver_candidate_found"
            )
              ? "driver_candidates_found"
              : "no_available_driver",
            driverCandidateCount: logisticsPlans.filter(
              (item) => item.assignmentStatus === "driver_candidate_found"
            ).length,
            pendingDriverCount: logisticsPlans.filter(
              (item) => item.assignmentStatus === "no_available_driver"
            ).length,
            deliveryStatus: "pending",
            reason:
              "Driver plans are recommendations only; no donation or delivery was created or assigned."
          }
        });
      }
    );
    if (!logisticsResult) {
      return await finishWorkflow("FAILED", message);
    }

    workflowStatus =
      logisticsResult?.output?.assignmentStatus === "no_available_driver"
        ? "NO_DRIVER_AVAILABLE"
        : "IN_PROGRESS";
    message =
      logisticsResult?.output?.assignmentStatus === "no_available_driver"
        ? "One or more allocations have no available driver; delivery assignment is pending."
        : "Recipient and driver candidates were identified; delivery assignment is not yet confirmed.";

    return await finishWorkflow(workflowStatus, message);
  } catch (error) {
    if (execution) {
      try {
        await updateWorkflowExecution({
          executionId: execution._id,
          foodId: workflowKey,
          workflowStatus: "FAILED",
          message: "Workflow execution could not be persisted.",
          providerOrganizationId: agentResults.find(
            (result) => result.agent === "Restaurant Agent"
          )?.output?.providerOrganizationId,
          safetyAssessment: agentResults.find(
            (result) => result.agent === "Safety Agent"
          )?.output,
          matchingResults: agentResults.find(
            (result) => result.agent === "Matching Agent"
          )?.output,
          logisticsResults: agentResults.find(
            (result) => result.agent === "Logistics Agent"
          )?.output,
          failureReason: error.message || "Workflow persistence failed."
        });
      } catch (persistenceError) {
        error.persistenceError =
          persistenceError.message || "Could not persist workflow failure.";
      }
    }
    throw error;
  } finally {
    activeFoodWorkflows.delete(workflowKey);
  }

  async function finishWorkflow(status, summaryMessage) {
    let monitoring;
    const monitoringRun = await startAgentRun({
      executionId: execution._id,
      agent: "Monitoring Agent",
      input: {
        agentCount: agentResults.length
      }
    });
    try {
      monitoring = runMonitoringAgent({
        agentResults,
        workflowStatusOverride: status,
        messageOverride: summaryMessage
      });
    } catch (error) {
      monitoring = failureResult(
        "Monitoring Agent",
        { agentCount: agentResults.length },
        error
      );
      status = "FAILED";
      summaryMessage =
        "Monitoring Agent failed while summarizing the workflow.";
    }

    await completeAgentRun({
      executionId: execution._id,
      runId: monitoringRun.runId,
      result: monitoring
    });
    agentResults.push(monitoring);

    const failure = agentResults.find(
      (result) => result.status === "FAILED"
    );
    const restaurant = agentResults.find(
      (result) => result.agent === "Restaurant Agent"
    );
    const safety = agentResults.find(
      (result) => result.agent === "Safety Agent"
    );
    const matching = agentResults.find(
      (result) => result.agent === "Matching Agent"
    );
    const logistics = agentResults.find(
      (result) => result.agent === "Logistics Agent"
    );
    await updateWorkflowExecution({
      executionId: execution._id,
      foodId: workflowKey,
      workflowStatus: status,
      message: summaryMessage,
      providerOrganizationId:
        restaurant?.output?.providerOrganizationId,
      safetyAssessment: safety?.output,
      matchingResults: matching?.output,
      logisticsResults: logistics?.output,
      failureReason: failure?.output?.failureReason || ""
    });

    return {
      workflowStatus: status,
      message: summaryMessage,
      foodId: workflowKey,
      workflowId: String(execution._id),
      agents: agentResults
    };
  }
}

module.exports = { runFoodRescueWorkflow };
