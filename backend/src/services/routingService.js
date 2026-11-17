const ROUTING_TIMEOUT_MS = 10000;
const MAX_ROUTE_POINTS = 10000;

class RoutingError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "RoutingError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function isValidCoordinates(coordinates) {
  return (
    Number.isFinite(coordinates?.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates?.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

function createRouteUrl(baseUrl, origin, destination) {
  let base;

  try {
    base = new URL(baseUrl);
  } catch {
    throw new RoutingError(
      "The routing service URL is invalid.",
      500,
      "ROUTING_CONFIGURATION_INVALID"
    );
  }

  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  ) {
    throw new RoutingError(
      "The routing service URL is invalid.",
      500,
      "ROUTING_CONFIGURATION_INVALID"
    );
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const routeUrl = new URL(
    `${basePath}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
    base.origin
  );
  routeUrl.searchParams.set("overview", "simplified");
  routeUrl.searchParams.set("geometries", "geojson");
  routeUrl.searchParams.set("steps", "false");

  return routeUrl;
}

async function getDrivingRoute({
  origin,
  destination,
  baseUrl = process.env.ROUTING_API_BASE_URL,
  fetchImpl = globalThis.fetch
}) {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
    throw new RoutingError(
      "Valid origin and destination coordinates are required for routing.",
      400,
      "INVALID_ROUTE_COORDINATES"
    );
  }

  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new RoutingError(
      "Road routing is not configured on this server.",
      503,
      "ROUTING_NOT_CONFIGURED"
    );
  }

  if (typeof fetchImpl !== "function") {
    throw new RoutingError(
      "This server does not support routing requests.",
      503,
      "ROUTING_UNAVAILABLE"
    );
  }

  const url = createRouteUrl(baseUrl.trim(), origin, destination);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ROUTING_TIMEOUT_MS
  );

  let result;

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new RoutingError(
        "The routing service returned an error.",
        502,
        "ROUTING_PROVIDER_ERROR"
      );
    }

    try {
      result = await response.json();
    } catch {
      throw new RoutingError(
        "The routing service returned an invalid response.",
        502,
        "ROUTING_INVALID_RESPONSE"
      );
    }
  } catch (error) {
    if (error instanceof RoutingError) {
      throw error;
    }

    if (controller.signal.aborted || error?.name === "AbortError") {
      throw new RoutingError(
        "The routing service timed out.",
        504,
        "ROUTING_TIMEOUT"
      );
    }

    throw new RoutingError(
      "The routing service could not be reached.",
      502,
      "ROUTING_PROVIDER_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timeout);
  }

  const route = result?.routes?.[0];
  const geometry = route?.geometry?.coordinates;

  if (result?.code !== "Ok" || !route || !Array.isArray(geometry)) {
    throw new RoutingError(
      "No road route is available for these coordinates.",
      422,
      "ROUTE_NOT_FOUND"
    );
  }

  if (
    !Number.isFinite(route.duration) ||
    route.duration < 0 ||
    !Number.isFinite(route.distance) ||
    route.distance < 0 ||
    geometry.length < 2 ||
    geometry.length > MAX_ROUTE_POINTS ||
    geometry.some(
      (coordinate) =>
        !Array.isArray(coordinate) ||
        coordinate.length < 2 ||
        !Number.isFinite(coordinate[0]) ||
        coordinate[0] < -180 ||
        coordinate[0] > 180 ||
        !Number.isFinite(coordinate[1]) ||
        coordinate[1] < -90 ||
        coordinate[1] > 90
    )
  ) {
    throw new RoutingError(
      "The routing service returned invalid route data.",
      502,
      "ROUTING_INVALID_RESPONSE"
    );
  }

  return {
    coordinates: geometry.map(([longitude, latitude]) => [
      latitude,
      longitude
    ]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    updatedAt: new Date()
  };
}

module.exports = {
  RoutingError,
  isValidCoordinates,
  getDrivingRoute
};
