const mongoose = require("mongoose");
const AgentExecution = require("../models/AgentExecution");
const {
  createAgentResult
} = require("./agentResult");
const { runRestaurantAgent } = require("./restaurantAgent");
const { runSafetyAgent } = require("./safetyAgent");
const { runDemandAgent } = require("./demandAgent");
const { runMatchingAgent } = require("./matchingAgent");
const { planMatchedDelivery } = require("./logisticsAgent");
const { runMonitoringAgent } = require("./monitoringAgent");
const { createWorkflowDelivery } = require("../services/workflowDeliveryAssignment");
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
  resumeExecutionId,
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
  let restaurant = null;
  let safety = null;
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
    let predictedSurplus = [];
    if (resumeExecutionId) {
      if (!mongoose.isValidObjectId(resumeExecutionId)) {
        const error = new Error("A valid workflow execution ID is required to resume.");
        error.code = "INVALID_WORKFLOW_ID";
        throw error;
      }
      execution = await AgentExecution.findOne({
        _id: resumeExecutionId,
        food: workflowKey,
        providerOrganization: providerOrganizationId,
        workflowStatus: "RUNNING",
        approvalStatus: "approved"
      });
      if (!execution) {
        const error = new Error("The approved workflow could not be resumed.");
        error.code = "WORKFLOW_NOT_RESUMABLE";
        throw error;
      }

      const restaurantRun = execution.agentRuns.find(
        (run) => run.agent === "Restaurant Agent" && run.status === "COMPLETED"
      );
      if (!restaurantRun?.output?.predictedSurplus?.length) {
        const error = new Error("The workflow has no saved surplus prediction to resume.");
        error.code = "WORKFLOW_RESUME_DATA_MISSING";
        throw error;
      }
      restaurant = { output: restaurantRun.output };
      predictedSurplus = restaurantRun.output.predictedSurplus;
      agentResults.push(...execution.agentRuns
        .filter((run) =>
          run.agent !== "Safety Agent" && run.agent !== "Monitoring Agent"
        )
        .map((run) => ({
          agent: run.agent,
          status: run.status,
          input: run.input,
          output: run.output,
          startedAt: run.startedAt,
          completedAt: run.completedAt
        })));
    } else {
      execution = await createWorkflowExecution({
        foodId: workflowKey,
        providerOrganizationId
      });

      restaurant = await executeAgent(
        "Restaurant Agent",
        { foodId: workflowKey, expectedDemand: expectedDemand ?? null },
        () => runRestaurantAgent({ foodId, expectedDemand, now })
      );
      if (!restaurant) {
        return await finishWorkflow("FAILED", message);
      }

      predictedSurplus = restaurant.output?.predictedSurplus || [];
      if (predictedSurplus.length === 0) {
        workflowStatus = "NO_SURPLUS";
        message = "No eligible surplus was found in the provider listing.";
        return await finishWorkflow(workflowStatus, message);
      }
    }

    safety = await executeAgent(
      "Safety Agent",
      { foodIds: predictedSurplus.map((food) => food.foodId) },
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
        const allocationContexts = [];

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
            deliveryAddress: recipient.address,
            pickupCoordinates: pickup.pickupCoordinates,
            deliveryCoordinates: recipient.coordinates,
            expiryTime: pickup.expiryTime
          });
          allocationContexts.push({ allocation, foodSafety, recipient, pickup, plan });
        }

        const plannedLoadByDriver = new Map();
        for (const context of allocationContexts) {
          const quantity = context.allocation.allocatedQuantity;
          const candidates = context.plan.output.candidateDrivers || [];
          const previouslyUsedCandidates = [...plannedLoadByDriver.entries()]
            .map(([driverId, usedMeals]) => ({
              candidate: candidates.find((item) => item.driverId === driverId),
              remainingMeals: (candidates.find((item) => item.driverId === driverId)?.capacityMeals || 0) - usedMeals
            }))
            .filter((entry) => entry.candidate && entry.remainingMeals >= quantity)
            .map((entry) => entry.candidate);
          const selectedDriver = previouslyUsedCandidates[0] || candidates.find((candidate) =>
            Number(candidate.capacityMeals) - (plannedLoadByDriver.get(candidate.driverId) || 0) >= quantity
          ) || null;
          context.selectedDriver = selectedDriver;
          if (selectedDriver) {
            plannedLoadByDriver.set(
              selectedDriver.driverId,
              (plannedLoadByDriver.get(selectedDriver.driverId) || 0) + quantity
            );
          }
        }

        const claimedDriverIds = new Set();
        for (const context of allocationContexts) {
          const { allocation, foodSafety, recipient, pickup, plan, selectedDriver } = context;
          const alternatives = (plan.output.candidateDrivers || []).filter((candidate) =>
            candidate.driverId !== selectedDriver?.driverId &&
            Number(candidate.capacityMeals) >= allocation.allocatedQuantity
          );
          const driverCandidates = selectedDriver
            ? [selectedDriver, ...alternatives]
            : [];
          const assignment = await createWorkflowDelivery({
            workflowId: execution._id,
            foodId: allocation.foodId,
            providerOrganizationId,
            recipientId: allocation.organizationId,
            quantity: allocation.allocatedQuantity,
            pickupAddress: pickup.pickupAddress,
            driverCandidates,
            preclaimedDriverIds: [...claimedDriverIds]
          });
          if (assignment.assignmentStatus === "assigned" && assignment.driverId) {
            claimedDriverIds.add(assignment.driverId);
          }
          logisticsPlans.push({
            ...plan.output,
            ...assignment,
            foodId: allocation.foodId,
            recipientId: allocation.organizationId,
            quantity: allocation.allocatedQuantity,
            foodName: allocation.foodName
          });
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
              (item) => item.assignmentStatus === "assigned"
            )
              ? "drivers_assigned"
              : "no_available_driver",
            driverCandidateCount: logisticsPlans.filter(
              (item) => item.assignmentStatus === "assigned"
            ).length,
            pendingDriverCount: logisticsPlans.filter(
              (item) => item.assignmentStatus !== "assigned"
            ).length,
            donationCount: logisticsPlans.filter((item) => item.donationId).length,
            deliveryCount: logisticsPlans.filter((item) => item.deliveryId).length,
            deliveryStatus: logisticsPlans.every(
              (item) => item.assignmentStatus === "assigned"
            ) ? "assigned" : "pending",
            groupedDriverCount: [...new Set(logisticsPlans.map((item) => item.driverId).filter(Boolean))].length,
            reason: "Matched donations were recorded and driver capacity was shared across compatible stops; pickup and drop-off addresses are available to the multi-stop route planner."
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
        ? "Matched donations were created, but one or more do not yet have an available driver."
        : "Matched donations and delivery records were created and drivers assigned.";

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
