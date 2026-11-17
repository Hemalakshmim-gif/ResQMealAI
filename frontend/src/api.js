
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";


async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("nourivya-token");
  const isAgentWorkflowRequest = path.startsWith("/api/agents/workflows");
  const isDriverRequest =
    path.startsWith("/api/driver-deliveries") ||
    path === "/api/driver-auth/availability";

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  // Organization authentication
if (
  (path.startsWith("/api/settings") ||
    path.startsWith("/api/food-safety/reviews") ||
    isAgentWorkflowRequest) &&
  token
) {
  headers.Authorization = `Bearer ${token}`;
}

  // Driver credentials remain separate from organization credentials.
  const driverToken = localStorage.getItem("nourivya-driver-token");
  if (isDriverRequest && driverToken) {
    headers.Authorization = `Bearer ${driverToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const result = await response.json().catch(() => ({}));

  if (isDriverRequest && response.status === 401) {
    localStorage.removeItem("nourivya-driver-token");
    localStorage.removeItem("nourivya-driver-user");
    window.dispatchEvent(new Event("nourivya-driver-session-expired"));
  }

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed: ${response.status}`
    );
  }

  return result;
}

export const getInventory = () => apiRequest("/api/inventory");
export const getDonations = () => apiRequest("/api/donations");
export const getDeliveries = () => apiRequest("/api/deliveries");
export const getDrivers = () => apiRequest("/api/drivers");

export const getOrganizations = () =>
  apiRequest("/api/organizations");

export const createDonation = ({
  food,
  recipient,
  quantity,
  notes = "",
}) =>
  apiRequest("/api/donations", {
    method: "POST",
    body: JSON.stringify({ food, recipient, quantity, notes }),
  });

  
export const getFoodSafetyAnalysis = () =>
  apiRequest("/api/food-safety/analyze");


export const getInventorySurplusAnalysis = () =>
  apiRequest("/api/agents/inventory-surplus/analyze");

export const getDemandMatchingAnalysis = () =>
  apiRequest("/api/agents/demand-matching/analyze");


export const createFood = (food) =>
  apiRequest("/api/inventory", {
    method: "POST",
    body: JSON.stringify(food),
  });

  
export const submitFoodSafetyReview = ({
  foodId,
  reviewStatus,
  storageVerified,
  packagingVerified,
  handlingVerified,
  reviewedBy,
  reviewNotes = "",
}) =>
  apiRequest("/api/food-safety/reviews", {
    method: "POST",
    body: JSON.stringify({
      foodId,
      reviewStatus,
      storageVerified,
      packagingVerified,
      handlingVerified,
      reviewedBy,
      reviewNotes,
    }),
  });

  
export const updateDonation = (id, updates) =>
  apiRequest(`/api/donations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  
export const getSettings = () =>
  apiRequest("/api/settings");

export const updateSettings = (settings) =>
  apiRequest("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });

  
export const getNotifications = () =>
  apiRequest("/api/notifications");

export const markAllNotificationsRead = () =>
  apiRequest("/api/notifications/read-all", {
    method: "PATCH",
  });
  
export const getImpactAnalytics = () =>
  apiRequest("/api/analytics/impact");

export const getMonitoringIncidents = () =>
  apiRequest("/api/monitoring/incidents");


export const getReplanningProposals = () =>
  apiRequest("/api/replanning/proposals");


export const approveReplanningProposal = (deliveryId, driverId) =>
  apiRequest(`/api/replanning/${deliveryId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ driverId }),
  });

  
export const createOrganization = (organizationData) =>
  apiRequest("/api/organizations", {
    method: "POST",
    body: JSON.stringify(organizationData),
  });

export const getOrganizationById = (id) =>
  apiRequest(`/api/organizations/${id}`);


export const loginOrganization = (credentials) =>
  apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

// ===============================
// DRIVER AUTHENTICATION
// ===============================

export const registerDriver = (driverData) =>
  apiRequest("/api/driver-auth/register", {
    method: "POST",
    body: JSON.stringify(driverData),
  });

export const loginDriver = (credentials) =>
  apiRequest("/api/driver-auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });


// ===============================
// DRIVER DELIVERY MANAGEMENT
// ===============================

export const getMyDeliveries = () =>
  apiRequest("/api/driver-deliveries/my-deliveries");

export const updateMyDeliveryStatus = (id, status) =>
  apiRequest(`/api/driver-deliveries/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const cancelMyDelivery = (id, reason) =>
  apiRequest(`/api/driver-deliveries/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });

export const updateMyAvailability = (status) =>
  apiRequest("/api/driver-auth/availability", {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
