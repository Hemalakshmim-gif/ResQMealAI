const assert = require("node:assert/strict");
const {
  RoutingError,
  getDrivingRoute
} = require("./src/services/routingService");

const origin = { latitude: 13.1, longitude: 77.59 };
const destination = { latitude: 13.2, longitude: 77.6 };
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("requests an OSRM route and converts GeoJSON coordinates for Leaflet", async () => {
  let requestedUrl;

  const route = await getDrivingRoute({
    origin,
    destination,
    baseUrl: "https://routing.example.test",
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return {
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 5200,
              duration: 840,
              geometry: {
                coordinates: [
                  [77.59, 13.1],
                  [77.6, 13.2]
                ]
              }
            }
          ]
        })
      };
    }
  });

  assert.equal(
    requestedUrl.pathname,
    "/route/v1/driving/77.59,13.1;77.6,13.2"
  );
  assert.equal(requestedUrl.searchParams.get("overview"), "simplified");
  assert.deepEqual(route.coordinates, [
    [13.1, 77.59],
    [13.2, 77.6]
  ]);
  assert.equal(route.distanceMeters, 5200);
  assert.equal(route.durationSeconds, 840);
  assert.ok(route.updatedAt instanceof Date);
});

test("does not make a provider request when routing is not configured", async () => {
  let requested = false;

  await assert.rejects(
    getDrivingRoute({
      origin,
      destination,
      baseUrl: "",
      fetchImpl: async () => {
        requested = true;
      }
    }),
    (error) =>
      error instanceof RoutingError &&
      error.code === "ROUTING_NOT_CONFIGURED"
  );

  assert.equal(requested, false);
});

test("rejects malformed coordinates before making a provider request", async () => {
  let requested = false;

  await assert.rejects(
    getDrivingRoute({
      origin: { latitude: 91, longitude: 77.59 },
      destination,
      baseUrl: "https://routing.example.test",
      fetchImpl: async () => {
        requested = true;
      }
    }),
    (error) =>
      error instanceof RoutingError &&
      error.code === "INVALID_ROUTE_COORDINATES"
  );

  assert.equal(requested, false);
});

test("requires HTTPS for non-local routing services", async () => {
  let requested = false;

  await assert.rejects(
    getDrivingRoute({
      origin,
      destination,
      baseUrl: "http://routing.example.test",
      fetchImpl: async () => {
        requested = true;
      }
    }),
    (error) =>
      error instanceof RoutingError &&
      error.code === "ROUTING_CONFIGURATION_INVALID"
  );

  assert.equal(requested, false);
});

test("rejects invalid provider geometry rather than drawing it", async () => {
  await assert.rejects(
    getDrivingRoute({
      origin,
      destination,
      baseUrl: "https://routing.example.test",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 5200,
              duration: 840,
              geometry: {
                coordinates: [
                  [77.59, 13.1],
                  [181, 13.2]
                ]
              }
            }
          ]
        })
      })
    }),
    (error) =>
      error instanceof RoutingError &&
      error.code === "ROUTING_INVALID_RESPONSE"
  );
});

async function runTests() {
  let passed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`PASS: ${name}`);
    } catch (error) {
      console.error(`FAIL: ${name}`);
      console.error(error);
    }
  }

  console.log(`\nResults: ${passed}/${tests.length} passed`);

  if (passed !== tests.length) {
    process.exitCode = 1;
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
