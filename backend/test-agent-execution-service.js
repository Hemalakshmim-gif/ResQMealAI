const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const AgentExecution = require("./src/models/AgentExecution");
const service = require("./src/services/agentExecutionService");

const originalMethods = {
  init: AgentExecution.init,
  create: AgentExecution.create,
  findOneAndUpdate: AgentExecution.findOneAndUpdate,
  findByIdAndUpdate: AgentExecution.findByIdAndUpdate
};

function id() {
  return new mongoose.Types.ObjectId().toString();
}

function restoreMethods() {
  AgentExecution.init = originalMethods.init;
  AgentExecution.create = originalMethods.create;
  AgentExecution.findOneAndUpdate = originalMethods.findOneAndUpdate;
  AgentExecution.findByIdAndUpdate = originalMethods.findByIdAndUpdate;
}

async function main() {
  let passed = 0;
  const test = async (name, operation) => {
    await operation();
    passed += 1;
    console.log(`PASS: ${name}`);
  };

  try {
    await test("Execution schema references existing records and has active uniqueness", async () => {
      assert.equal(
        AgentExecution.schema.path("food").options.ref,
        "FoodInventory"
      );
      assert.equal(
        AgentExecution.schema.path("donation").options.ref,
        "Donation"
      );
      assert.equal(
        AgentExecution.schema.path("delivery").options.ref,
        "Delivery"
      );
      assert.ok(
        AgentExecution.schema.indexes().some(
          ([keys, options]) =>
            keys.activeKey === 1 &&
            options.unique === true &&
            options.sparse === true
        )
      );
    });

    await test("Workflow creation stores a unique active key", async () => {
      const foodId = id();
      let document;
      AgentExecution.init = async () => {};
      AgentExecution.create = async (value) => {
        document = value;
        return { _id: id(), ...value };
      };

      const execution = await service.createWorkflowExecution({ foodId });
      assert.equal(document.food, foodId);
      assert.equal(document.activeKey, foodId);
      assert.equal(document.workflowStatus, "RUNNING");
      assert.equal(execution.activeKey, foodId);
    });

    await test("Duplicate active workflows return a stable error code", async () => {
      AgentExecution.init = async () => {};
      AgentExecution.create = async () => {
        const error = new Error("duplicate key");
        error.code = 11000;
        throw error;
      };

      await assert.rejects(
        service.createWorkflowExecution({ foodId: id() }),
        (error) => error.code === "WORKFLOW_ALREADY_RUNNING"
      );
    });

    await test("Starting an agent appends a running timestamped record", async () => {
      const executionId = id();
      const runId = id();
      let query;
      let update;
      AgentExecution.findOneAndUpdate = async (filter, change) => {
        query = filter;
        update = change;
        return {
          agentRuns: [{
            _id: runId,
            startedAt: new Date("2026-11-17T10:00:00.000Z")
          }]
        };
      };

      const run = await service.startAgentRun({
        executionId,
        agent: "Restaurant Agent",
        input: { foodId: id() }
      });

      assert.equal(query._id, executionId);
      assert.equal(update.$push.agentRuns.status, "RUNNING");
      assert.equal(run.runId, runId);
      assert.ok(run.startedAt instanceof Date);
    });

    await test("Completing an agent persists output, status, and end time", async () => {
      const executionId = id();
      const runId = id();
      let update;
      AgentExecution.findOneAndUpdate = async (_filter, change) => {
        update = change;
        return { _id: executionId };
      };

      await service.completeAgentRun({
        executionId,
        runId,
        result: {
          agent: "Safety Agent",
          status: "WAITING_FOR_APPROVAL",
          input: { foodIds: [id()] },
          output: { warningFoodIds: [id()] },
          startedAt: new Date("2026-11-17T10:00:00.000Z"),
          completedAt: new Date("2026-11-17T10:00:01.000Z")
        }
      });

      assert.equal(update.$set["agentRuns.$.status"], "WAITING_FOR_APPROVAL");
      assert.ok(update.$set["agentRuns.$.completedAt"] instanceof Date);
    });

    await test("Active outcomes retain the key and pending approval state", async () => {
      const foodId = id();
      let update;
      AgentExecution.findByIdAndUpdate = async (_id, change) => {
        update = change;
        return { _id };
      };

      await service.updateWorkflowExecution({
        executionId: id(),
        foodId,
        workflowStatus: "WAITING_FOR_APPROVAL",
        message: "Review required.",
        safetyAssessment: {
          assessments: [{
            reviewId: id(),
            reviewStatus: "pending"
          }]
        }
      });

      assert.equal(update.$set.activeKey, foodId);
      assert.equal(update.$set.approvalStatus, "pending");
      assert.equal(update.$set.completedAt, null);
    });

    await test("Terminal outcomes release the active key", async () => {
      let update;
      AgentExecution.findByIdAndUpdate = async (_id, change) => {
        update = change;
        return { _id };
      };

      await service.updateWorkflowExecution({
        executionId: id(),
        foodId: id(),
        workflowStatus: "NO_RECIPIENT",
        message: "No recipient."
      });

      assert.equal(update.$unset.activeKey, 1);
      assert.ok(update.$set.completedAt instanceof Date);
    });

    console.log(`\nResults: ${passed}/7 passed`);
  } finally {
    restoreMethods();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
