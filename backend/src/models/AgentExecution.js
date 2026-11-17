const mongoose = require("mongoose");

const AGENT_NAMES = [
  "Restaurant Agent",
  "Safety Agent",
  "Demand Agent",
  "Matching Agent",
  "Logistics Agent",
  "Monitoring Agent"
];

const AGENT_STATUSES = [
  "IDLE",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "WAITING_FOR_APPROVAL"
];

const WORKFLOW_STATUSES = [
  "RUNNING",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "NO_DRIVER_AVAILABLE",
  "NO_SURPLUS",
  "UNSAFE_FOOD",
  "NO_RECIPIENT",
  "FAILED",
  "COMPLETED"
];

const agentRunSchema = new mongoose.Schema(
  {
    agent: {
      type: String,
      enum: AGENT_NAMES,
      required: true
    },
    status: {
      type: String,
      enum: AGENT_STATUSES,
      required: true
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    error: {
      type: String,
      default: ""
    },
    startedAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    versionKey: false
  }
);

const agentExecutionSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodInventory",
      required: true,
      index: true
    },
    providerOrganization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      default: null,
      index: true
    },
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      default: null,
      index: true
    },
    workflowStatus: {
      type: String,
      enum: WORKFLOW_STATUSES,
      default: "RUNNING",
      required: true,
      index: true
    },
    approvalStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
      required: true
    },
    statusMessage: {
      type: String,
      trim: true,
      default: ""
    },
    failureReason: {
      type: String,
      trim: true,
      default: ""
    },
    activeKey: {
      type: String,
      select: false
    },
    agentRuns: {
      type: [agentRunSchema],
      default: []
    },
    latestSafetyAssessment: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    latestSafetyReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodSafetyReview",
      default: null
    },
    matchingResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    logisticsResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

agentExecutionSchema.index(
  { activeKey: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_active_food_workflow"
  }
);

module.exports = mongoose.model(
  "AgentExecution",
  agentExecutionSchema
);
