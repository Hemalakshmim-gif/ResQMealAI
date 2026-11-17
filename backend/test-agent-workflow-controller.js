const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const AgentExecution = require("./src/models/AgentExecution");
const FoodInventory = require("./src/models/FoodInventory");
const FoodSafetyReview = require("./src/models/FoodSafetyReview");
const Organization = require("./src/models/Organization");
const orchestrator = require("./src/agents/agentOrchestrator");
const safetyAgent = require("./src/agents/safetyAgent");

const originalMethods = {
  foodFindOne: FoodInventory.findOne,
  executionFindOne: AgentExecution.findOne,
  executionFindOneAndUpdate: AgentExecution.findOneAndUpdate,
  reviewCreate: FoodSafetyReview.create,
  organizationFindById: Organization.findById,
  runWorkflow: orchestrator.runFoodRescueWorkflow,
  runSafety: safetyAgent.runSafetyAgent
};

let workflowInput;
orchestrator.runFoodRescueWorkflow = async (input) => {
  workflowInput = input;
  return { workflowStatus: "IN_PROGRESS" };
};
safetyAgent.runSafetyAgent = async () => ({
  output: {
    assessments: [{
      foodId: "507f1f77bcf86cd799439012",
      safetyStatus: "SAFE"
    }],
    safeFoodIds: ["507f1f77bcf86cd799439012"],
    warningFoodIds: [],
    unsafeFoodIds: []
  }
});
const controller = require("./src/controllers/agentWorkflowController");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function id(value = "507f1f77bcf86cd799439011") {
  return new mongoose.Types.ObjectId(value).toString();
}

function restoreMethods() {
  FoodInventory.findOne = originalMethods.foodFindOne;
  AgentExecution.findOne = originalMethods.executionFindOne;
  AgentExecution.findOneAndUpdate = originalMethods.executionFindOneAndUpdate;
  FoodSafetyReview.create = originalMethods.reviewCreate;
  Organization.findById = originalMethods.organizationFindById;
  orchestrator.runFoodRescueWorkflow = originalMethods.runWorkflow;
  safetyAgent.runSafetyAgent = originalMethods.runSafety;
}

async function main() {
  let passed = 0;
  const test = async (name, operation) => {
    await operation();
    passed += 1;
    console.log(`PASS: ${name}`);
  };

  try {
    await test("Workflow start scopes the listing and execution to the authenticated provider", async () => {
      const organizationId = id();
      const foodId = id("507f1f77bcf86cd799439012");
      let foodFilter;
      workflowInput = undefined;
      FoodInventory.findOne = (filter) => {
        foodFilter = filter;
        return {
          select() {
            return this;
          },
          async lean() {
            return { _id: foodId };
          }
        };
      };
      const response = createResponse();

      await controller.startAgentWorkflow(
        {
          organization: { id: organizationId, role: "provider" },
          body: { foodId, expectedDemand: 10 }
        },
        response
      );

      assert.equal(response.statusCode, 200);
      assert.deepEqual(foodFilter, {
        _id: foodId,
        providerOrganization: organizationId
      });
      assert.equal(workflowInput.providerOrganizationId, organizationId);
      assert.equal(workflowInput.expectedDemand, 10);
    });

    await test("Approved safety reviews are attributed and do not claim workflow resumption", async () => {
      const organizationId = id();
      const workflowId = id("507f1f77bcf86cd799439013");
      const foodId = id("507f1f77bcf86cd799439012");
      const reviewId = id("507f1f77bcf86cd799439014");
      const workflow = {
        _id: workflowId,
        workflowStatus: "WAITING_FOR_APPROVAL",
        latestSafetyAssessment: {
          assessments: [{ foodId, safetyStatus: "WARNING" }]
        }
      };
      const food = {
        _id: foodId,
        foodName: "Prepared meal",
        quantity: 10,
        unit: "meals",
        foodType: "cooked",
        status: "available",
        expiryTime: new Date(Date.now() + 60 * 60 * 1000),
        providerName: "Provider",
        pickupAddress: "1 Main Street"
      };
      let savedReview;
      let persistedUpdate;

      AgentExecution.findOne = () => ({
        async lean() {
          return workflow;
        }
      });
      FoodInventory.findOne = () => ({
        async lean() {
          return food;
        }
      });
      Organization.findById = () => ({
        async select() {
          return { name: "Verified Provider" };
        }
      });
      FoodSafetyReview.create = async (value) => {
        savedReview = value;
        return { _id: reviewId };
      };
      AgentExecution.findOneAndUpdate = async (_filter, update) => {
        persistedUpdate = update;
        return { _id: workflowId };
      };

      const response = createResponse();
      await controller.reviewAgentWorkflowSafety(
        {
          organization: { id: organizationId, role: "provider" },
          params: { executionId: workflowId },
          body: {
            foodId,
            reviewStatus: "approved",
            storageVerified: true,
            packagingVerified: true,
            handlingVerified: true,
            reviewedBy: "untrusted client value"
          }
        },
        response
      );

      assert.equal(response.statusCode, 200);
      assert.equal(savedReview.reviewedBy, "Verified Provider");
      assert.equal(savedReview.reviewStatus, "approved");
      assert.equal(persistedUpdate.$set.approvalStatus, "approved");
      assert.equal(persistedUpdate.$set.workflowStatus, "WAITING_FOR_APPROVAL");
      assert.equal(persistedUpdate.$unset, undefined);
    });
  } finally {
    restoreMethods();
  }

  console.log(`\nResults: ${passed}/2 passed`);
}

main().catch((error) => {
  restoreMethods();
  console.error(error);
  process.exitCode = 1;
});
