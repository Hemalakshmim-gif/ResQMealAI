const assert = require("node:assert/strict");
const Module = require("node:module");
const mongoose = require("mongoose");

function installMock(relativePath, exports) {
  const filename = require.resolve(relativePath);
  const mock = new Module(filename);
  mock.filename = filename;
  mock.loaded = true;
  mock.exports = exports;
  require.cache[filename] = mock;
  return filename;
}

function result(agent, status = "COMPLETED", output = {}) {
  return { agent, status, input: {}, output };
}

const foodId = new mongoose.Types.ObjectId().toString();
const organizationId = new mongoose.Types.ObjectId().toString();
const executionId = new mongoose.Types.ObjectId().toString();
const calls = [];
const persistenceCalls = [];
const state = {
  safetyStatus: "COMPLETED",
  safeFoodIds: [foodId],
  recipients: [{
    organizationId,
    organizationName: "Care Home",
    address: "Recipient Road"
  }],
  allocations: [{
    foodId,
    foodName: "Vegetable Rice",
    organizationId,
    allocatedQuantity: 10,
    unit: "meals"
  }],
  failAgent: null,
  restaurantOperation: null,
  logisticsAssignmentStatus: "driver_candidate_found"
};

const modulePaths = [
  "./src/agents/restaurantAgent",
  "./src/agents/safetyAgent",
  "./src/agents/demandAgent",
  "./src/agents/matchingAgent",
  "./src/agents/logisticsAgent",
  "./src/services/agentExecutionService"
];

const mockedFiles = [];
mockedFiles.push(installMock(modulePaths[0], {
  runRestaurantAgent: async ({ foodId: requestedFoodId }) => {
    calls.push("Restaurant Agent");
    if (state.restaurantOperation) {
      return state.restaurantOperation(requestedFoodId);
    }
    if (state.failAgent === "Restaurant Agent") {
      throw new Error("Restaurant test failure.");
    }
    return result("Restaurant Agent", "COMPLETED", {
      predictedSurplus: [{
        foodId,
        quantity: 10,
        pickupAddress: "Provider Road"
      }]
    });
  }
}));
mockedFiles.push(installMock(modulePaths[1], {
  runSafetyAgent: async () => {
    calls.push("Safety Agent");
    if (state.failAgent === "Safety Agent") {
      throw new Error("Safety test failure.");
    }
    return result("Safety Agent", state.safetyStatus, {
      safeFoodIds: state.safeFoodIds,
      assessments: [{
        foodId,
        safetyStatus:
          state.safetyStatus === "WAITING_FOR_APPROVAL"
            ? "WARNING"
            : state.safeFoodIds.length > 0
              ? "SAFE"
              : "UNSAFE"
      }]
    });
  }
}));
mockedFiles.push(installMock(modulePaths[2], {
  runDemandAgent: async () => {
    calls.push("Demand Agent");
    if (state.failAgent === "Demand Agent") {
      throw new Error("Demand test failure.");
    }
    return result("Demand Agent", "COMPLETED", {
      recipientsByFood: [{
        foodId,
        recipients: state.recipients
      }]
    });
  }
}));
mockedFiles.push(installMock(modulePaths[3], {
  runMatchingAgent: async () => {
    calls.push("Matching Agent");
    if (state.failAgent === "Matching Agent") {
      throw new Error("Matching test failure.");
    }
    return result("Matching Agent", "COMPLETED", {
      allocations: state.allocations
    });
  }
}));
mockedFiles.push(installMock(modulePaths[4], {
  planMatchedDelivery: async () => {
    calls.push("Logistics Agent");
    if (state.failAgent === "Logistics Agent") {
      throw new Error("Logistics test failure.");
    }
    return result("Logistics Agent", "COMPLETED", {
      assignmentStatus: state.logisticsAssignmentStatus,
      deliveryStatus: "pending"
    });
  }
}));
mockedFiles.push(installMock(modulePaths[5], {
  createWorkflowExecution: async ({ foodId: requestedFoodId }) => {
    persistenceCalls.push(["create", requestedFoodId]);
    return { _id: executionId };
  },
  startAgentRun: async ({ agent }) => {
    persistenceCalls.push(["start", agent]);
    return {
      runId: new mongoose.Types.ObjectId().toString(),
      startedAt: new Date()
    };
  },
  completeAgentRun: async ({ result: agentResult }) => {
    persistenceCalls.push(["complete", agentResult.agent, agentResult.status]);
  },
  updateWorkflowExecution: async ({ workflowStatus }) => {
    persistenceCalls.push(["update", workflowStatus]);
  }
}));

const { runFoodRescueWorkflow } = require("./src/agents/agentOrchestrator");

function reset() {
  calls.length = 0;
  persistenceCalls.length = 0;
  state.safetyStatus = "COMPLETED";
  state.safeFoodIds = [foodId];
  state.recipients = [{
    organizationId,
    organizationName: "Care Home",
    address: "Recipient Road"
  }];
  state.allocations = [{
    foodId,
    foodName: "Vegetable Rice",
    organizationId,
    allocatedQuantity: 10,
    unit: "meals"
  }];
  state.failAgent = null;
  state.restaurantOperation = null;
  state.logisticsAssignmentStatus = "driver_candidate_found";
}

async function main() {
  let passed = 0;
  const test = async (name, operation) => {
    reset();
    await operation();
    passed += 1;
    console.log(`PASS: ${name}`);
  };

  try {
    await test("Runs the six-agent sequence and does not claim delivery", async () => {
      const workflow = await runFoodRescueWorkflow({ foodId });
      assert.deepEqual(calls, [
        "Restaurant Agent",
        "Safety Agent",
        "Demand Agent",
        "Matching Agent",
        "Logistics Agent"
      ]);
      assert.deepEqual(
        workflow.agents.map((agent) => agent.agent),
        [
          "Restaurant Agent",
          "Safety Agent",
          "Demand Agent",
          "Matching Agent",
          "Logistics Agent",
          "Monitoring Agent"
        ]
      );
      assert.equal(workflow.workflowStatus, "IN_PROGRESS");
      assert.equal(
        workflow.agents[4].output.deliveryStatus,
        "pending"
      );
      assert.match(workflow.agents[4].output.reason, /no donation or delivery was created/);
      assert.equal(workflow.workflowId, executionId);
      assert.equal(
        persistenceCalls.filter((call) => call[0] === "start").length,
        6
      );
      assert.deepEqual(
        persistenceCalls[persistenceCalls.length - 1],
        ["update", "IN_PROGRESS"]
      );
    });

    await test("Pauses at safety review and does not run later agents", async () => {
      state.safetyStatus = "WAITING_FOR_APPROVAL";
      const workflow = await runFoodRescueWorkflow({ foodId });

      assert.equal(workflow.workflowStatus, "WAITING_FOR_APPROVAL");
      assert.deepEqual(calls, ["Restaurant Agent", "Safety Agent"]);
      assert.equal(
        workflow.agents.at(-1).agent,
        "Monitoring Agent"
      );
    });

    await test("Stops unsafe food before recipient matching", async () => {
      state.safeFoodIds = [];
      const workflow = await runFoodRescueWorkflow({ foodId });

      assert.equal(workflow.workflowStatus, "UNSAFE_FOOD");
      assert.deepEqual(calls, ["Restaurant Agent", "Safety Agent"]);
    });

    await test("Records no-recipient results without planning logistics", async () => {
      state.recipients = [];
      state.allocations = [];
      const workflow = await runFoodRescueWorkflow({ foodId });

      assert.equal(workflow.workflowStatus, "NO_RECIPIENT");
      assert.deepEqual(calls, [
        "Restaurant Agent",
        "Safety Agent",
        "Demand Agent",
        "Matching Agent"
      ]);
    });

    await test("Returns a failed workflow if an agent throws", async () => {
      state.failAgent = "Demand Agent";
      const workflow = await runFoodRescueWorkflow({ foodId });

      assert.equal(workflow.workflowStatus, "FAILED");
      assert.deepEqual(calls, [
        "Restaurant Agent",
        "Safety Agent",
        "Demand Agent"
      ]);
      assert.equal(workflow.agents[2].status, "FAILED");
      assert.equal(workflow.agents.at(-1).output.workflowStatus, "FAILED");
      assert.deepEqual(
        persistenceCalls[persistenceCalls.length - 1],
        ["update", "FAILED"]
      );
    });

    await test("Reports missing drivers without assigning a delivery", async () => {
      state.logisticsAssignmentStatus = "no_available_driver";
      const workflow = await runFoodRescueWorkflow({ foodId });

      assert.equal(workflow.workflowStatus, "NO_DRIVER_AVAILABLE");
      assert.equal(
        workflow.agents[4].output.deliveryStatus,
        "pending"
      );
    });

    await test("Rejects concurrent duplicate work for the same food", async () => {
      let releaseRestaurant;
      state.restaurantOperation = () => new Promise((resolve) => {
        releaseRestaurant = resolve;
      });

      const firstRun = runFoodRescueWorkflow({ foodId });
      await Promise.resolve();
      await assert.rejects(
        runFoodRescueWorkflow({ foodId }),
        (error) => error.code === "WORKFLOW_ALREADY_RUNNING"
      );

      releaseRestaurant(
        result("Restaurant Agent", "COMPLETED", {
          predictedSurplus: []
        })
      );
      const firstResult = await firstRun;
      assert.equal(firstResult.workflowStatus, "NO_SURPLUS");
    });

    console.log(`\nResults: ${passed}/7 passed`);
  } finally {
    for (const filename of mockedFiles) {
      delete require.cache[filename];
    }
    delete require.cache[require.resolve("./src/agents/agentOrchestrator")];
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
