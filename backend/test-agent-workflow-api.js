const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const agentWorkflowRoutes = require("./src/routes/agentWorkflowRoutes");
const foodSafetyRoutes = require("./src/routes/foodSafetyRoutes");

function request(server, { method = "GET", path, token, body }) {
  const address = server.address();
  const payload = body === undefined ? null : JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: "127.0.0.1",
      port: address.port,
      method,
      path,
      headers: {}
    };
    if (token) {
      requestOptions.headers.Authorization = `Bearer ${token}`;
    }
    if (payload !== null) {
      requestOptions.headers["Content-Type"] = "application/json";
      requestOptions.headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const outgoingRequest = http.request(requestOptions, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode,
          body: JSON.parse(responseBody)
        });
      });
    });
    outgoingRequest.on("error", reject);
    if (payload !== null) {
      outgoingRequest.write(payload);
    }
    outgoingRequest.end();
  });
}

async function main() {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "agent-workflow-api-test-secret";

  const app = express();
  app.use(express.json());
  app.use("/api/agents", agentWorkflowRoutes);
  app.use("/api/food-safety", foodSafetyRoutes);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const signToken = (role) => jwt.sign(
    { organizationId: "507f1f77bcf86cd799439011", role },
    process.env.JWT_SECRET,
    { issuer: "nourivya-api", expiresIn: "2h" }
  );

  let passed = 0;
  const test = async (name, operation) => {
    await operation();
    passed += 1;
    console.log(`PASS: ${name}`);
  };

  try {
    await test("Workflow history requires authentication", async () => {
      const response = await request(server, {
        path: "/api/agents/workflows"
      });
      assert.equal(response.status, 401);
    });

    await test("Recipient organizations cannot access provider workflows", async () => {
      const response = await request(server, {
        path: "/api/agents/workflows",
        token: signToken("recipient")
      });
      assert.equal(response.status, 403);
      assert.equal(response.body.code, "PROVIDER_ACCESS_REQUIRED");
    });

    await test("Workflow start validates food IDs before database access", async () => {
      const response = await request(server, {
        method: "POST",
        path: "/api/agents/workflows",
        token: signToken("provider"),
        body: { foodId: "invalid" }
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.code, "INVALID_FOOD_ID");
    });

    await test("Safety reviews require organization authentication", async () => {
      const response = await request(server, {
        method: "POST",
        path: "/api/food-safety/reviews",
        body: {
          foodId: "507f1f77bcf86cd799439012",
          reviewStatus: "approved"
        }
      });
      assert.equal(response.status, 401);
    });

    await test("Safety approval requires all verification checks", async () => {
      const response = await request(server, {
        method: "POST",
        path: "/api/agents/workflows/507f1f77bcf86cd799439013/safety-review",
        token: signToken("provider"),
        body: {
          foodId: "507f1f77bcf86cd799439012",
          reviewStatus: "approved"
        }
      });
      assert.equal(response.status, 400);
      assert.equal(response.body.code, "SAFETY_CHECKS_REQUIRED");
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }

  console.log(`\nResults: ${passed}/5 passed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
