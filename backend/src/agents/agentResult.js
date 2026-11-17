const AGENT_STATUSES = new Set([
  "IDLE",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "WAITING_FOR_APPROVAL"
]);

function createAgentResult({
  agent,
  input,
  output,
  status = "COMPLETED",
  startedAt
}) {
  if (!AGENT_STATUSES.has(status)) {
    throw new Error(`Unsupported agent status: ${status}`);
  }

  return {
    agent,
    status,
    input,
    output,
    startedAt: startedAt || new Date(),
    completedAt: new Date()
  };
}

module.exports = { createAgentResult, AGENT_STATUSES };
