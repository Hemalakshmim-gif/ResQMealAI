
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";


async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("nourivya-token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  // Send the JWT with protected settings requests.
  if (path.startsWith("/api/settings") && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const result = await response.json().catch(() => ({}));

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

