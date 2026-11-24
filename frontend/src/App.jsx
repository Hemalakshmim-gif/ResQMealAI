import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { INITIAL_DATA } from './data.js';
import { Sidebar, Topbar } from './components.jsx';
import {
  LandingPage, LoginPage, RegisterPage, AdminDashboard, ProviderDashboard,
  InventoryPage, PredictionsPage, SafetyPage, RecipientDashboard,
  RecipientRequirements, MatchingPage, DonationsPage, DonationDetailView,
  LogisticsPage, DeliveryTrackingView, AgentActivityPage, MonitoringPage,
  ReplanningCenter, AnalyticsPage, NotificationsPage, SettingsPage
} from './pages.jsx';
import {
  DriverDashboard,
  DriverDeliveriesPage,
  DriverProfilePage
} from './DriverPages.jsx';
import './App.css';
import {
  getInventory,
  getFoodSafetyAnalysis,
  getDonations,
  getDeliveries,
  getDrivers,
  getSettings,
  getNotifications,
} from './api.js';

const defaultUser = {
  name: "Dr. Aris Thorne",
  email: "aris.thorne@nourivya.org",
  role: "System Administrator",
  org: "ResQMeal AI Hub"
};

const readStoredUser = (key) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const readStoredDriverSession = () => {
  const driver = readStoredUser("nourivya-driver-user");
  return localStorage.getItem("nourivya-driver-token") &&
    driver?.role === "driver"
    ? driver
    : null;
};

function App() {
 const [currentRoute, setCurrentRoute] = useState(
  () => window.location.pathname || '/'
);
  const [currentUser, setCurrentUser] = useState(() =>
    readStoredDriverSession() || readStoredUser("nourivya-user") || defaultUser
  );

const [userRole, setUserRole] = useState(() => {
  const driver = readStoredDriverSession();
  const savedUser = readStoredUser("nourivya-user");
  return driver?.role || savedUser?.role || currentUser.role || "admin";
});

  const isDriverContext =
    userRole === "driver" || currentRoute.startsWith("/driver/");

  
  useEffect(() => {
    let cancelled = false;

    async function loadSavedProfile() {
      try {
        if (isDriverContext) return;

        // Don't load account settings without a saved login token.
        const token = localStorage.getItem("nourivya-token");
        if (!token) return;

        // Restore the logged-in organization's profile.
        let savedUser = null;

        try {
          savedUser = JSON.parse(
            localStorage.getItem("nourivya-user") || "null"
          );
        } catch {
          savedUser = null;
        }

        const response = await getSettings();

        if (cancelled || !response.success || !response.data) {
          return;
        }

        const profile = response.data.profile || {};

        // Preserve the account identity and update its saved profile.
        const updatedUser = {
          ...(savedUser || {}),
          name: profile.name || savedUser?.name || "",
          email: profile.email || savedUser?.email || "",
          org: profile.org || savedUser?.org || "",
          id: savedUser?.id,
          role: savedUser?.role || "admin"
        };

        if (cancelled) return;

        localStorage.setItem(
          "nourivya-user",
          JSON.stringify(updatedUser)
        );

        setCurrentUser(previous => ({
          ...previous,
          ...updatedUser
        }));

        setUserRole(updatedUser.role);

        // Restore saved appearance preferences.
        const theme = response.data.appearance?.theme || "light";
        const density =
          response.data.appearance?.density || "comfortable";

        document.documentElement.setAttribute("data-theme", theme);
        document.body.dataset.layoutDensity = density;
      } catch (error) {
        console.error("Could not load the saved profile:", error);
      }
    }

    loadSavedProfile();

    return () => {
      cancelled = true;
    };
  }, [isDriverContext]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760);
  const [toasts, setToasts] = useState([]);
  const [appData, setAppData] = useState(INITIAL_DATA);

  const addToast = (message, type = 'success') => {
  const id = Date.now();

  setToasts(prev => [...prev, { id, message, type }]);

  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 4000);
};

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleDriverSessionExpired = () => {
      localStorage.removeItem("nourivya-driver-token");
      localStorage.removeItem("nourivya-driver-user");
      const savedUser = readStoredUser("nourivya-user") || defaultUser;
      setCurrentUser(savedUser);
      setUserRole(savedUser.role || "admin");
      window.history.replaceState({}, "", "/driver/login");
      setCurrentRoute("/driver/login");
      addToast("Your driver session expired. Please sign in again.", "error");
    };

    window.addEventListener(
      "nourivya-driver-session-expired",
      handleDriverSessionExpired
    );
    return () => window.removeEventListener(
      "nourivya-driver-session-expired",
      handleDriverSessionExpired
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        if (isDriverContext || !localStorage.getItem("nourivya-token")) return;

        const response = await getNotifications();

        if (cancelled || !response.success) return;

        setAppData(previous => ({
          ...previous,
          notifications: response.data || [],
        }));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }

    loadNotifications();
    const refreshTimer = window.setInterval(loadNotifications, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [isDriverContext]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
  let cancelled = false;

  async function loadDonations() {
    try {
      if (isDriverContext) return;

      const response = await getDonations();

      const donations = (response.data || []).map(donation => ({
        id: donation._id,
        provider: donation.food?.providerName || 'Unknown provider',
        recipient: donation.recipient?.name || 'Unknown recipient',
        items: donation.food?.foodName || 'Unknown food',
        quantity: `${donation.quantity} ${donation.food?.unit || ''}`.trim(),
        date: donation.requestedAt
          ? new Date(donation.requestedAt).toLocaleString()
          : '—',
        
        status: donation.status,
        deliveryStatus: donation.status,
        notes: donation.notes || '',
      }));

      if (!cancelled) {
        setAppData(previous => ({
          ...previous,
          donations,
        }));
      }
    
    } catch (error) {
      console.error('Failed to load donations:', error);
    }
  }

  loadDonations();

  return () => {
    cancelled = true;
  };
}, [isDriverContext]);

  useEffect(() => {
  let cancelled = false;

  async function loadInventory() {
    try {
      if (isDriverContext) return;

      const [inventoryResult, safetyResult] = await Promise.allSettled([
        getInventory(),
        getFoodSafetyAnalysis(),
      ]);
      if (inventoryResult.status === 'rejected') throw inventoryResult.reason;
      const response = inventoryResult.value;
      const safetyResponse = safetyResult.status === 'fulfilled'
        ? safetyResult.value
        : { data: [] };
      const safetyByFoodId = new Map(
        (safetyResponse.data || []).map(result => [String(result.id), result])
      );

      const inventory = (response.data || []).map(food => {
        const safety = safetyByFoodId.get(String(food._id));
        return ({
        id: food._id,
        name: food.foodName,
        category: food.foodType,
        quantity: food.quantity,
        unit: food.unit,
        expiryTime: food.expiryTime
          ? food.expiryTime.slice(0, 16).replace('T', ' ')
          : '',
        location: food.pickupAddress,
        safety: safety?.canBeRecommended
          ? 'SAFE'
          : safety?.eligibilityStatus === 'ineligible'
            ? 'INELIGIBLE'
            : 'REVIEW REQUIRED',
        donationStatus:
          food.status === 'available' ? 'Available' : food.status,
        description: food.description || '',
        provider: food.providerName,
      });
      });

      if (!cancelled) {
        setAppData(previous => ({
          ...previous,
          inventory,
        }));
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      if (!cancelled) {
        addToast('Could not load live inventory from the backend.', 'error');
      }
    }
  }

  loadInventory();

  return () => {
    cancelled = true;
  };
}, [isDriverContext]);

  useEffect(() => {
  let cancelled = false;

  async function loadLogistics() {
    try {
      if (isDriverContext) return;

      const [deliveryResponse, driverResponse] = await Promise.all([
        getDeliveries(),
        getDrivers(),
      ]);

      const deliveries = (deliveryResponse.data || []).map(delivery => ({
        id: delivery._id,
        donationId:
          typeof delivery.donation === 'object'
            ? delivery.donation?._id
            : delivery.donation,
        driver:
          typeof delivery.driver === 'object'
            ? delivery.driver?.name || 'Unassigned'
            : delivery.driver || 'Unassigned',
        vehicle:
          typeof delivery.driver === 'object'
            ? delivery.driver?.vehicleType || 'Not specified'
            : 'Not specified',
        distance: 'Not available',
        eta: delivery.deliveredAt
  ? `Delivered: ${new Date(delivery.deliveredAt).toLocaleString()}`
  : delivery.plannedPickupAt
    ? `Pickup: ${new Date(delivery.plannedPickupAt).toLocaleString()}`
    : 'Not scheduled',
        status: delivery.status,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        plannedPickupAt: delivery.plannedPickupAt,
        failureReason: delivery.failureReason || '',
        createdAt: delivery.createdAt,
        pickedUpAt: delivery.pickedUpAt,
        deliveredAt: delivery.deliveredAt,
      }));

      const drivers = (driverResponse.data || []).map(driver => ({
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicleType,
        capacityMeals: driver.capacityMeals,
        status: driver.status,
        currentLocation: driver.currentLocation,
      }));

      if (!cancelled) {
        setAppData(previous => ({
          ...previous,
          deliveries,
          drivers,
        }));
      }
    } catch (error) {
      console.error('Failed to load logistics:', error);

      if (!cancelled) {
        addToast('Could not load live deliveries and drivers.', 'error');
      }
    }
  }

  loadLogistics();

  return () => {
    cancelled = true;
  };
}, [isDriverContext]);

  useEffect(() => 
    {
      localStorage.setItem('resqmeal-current-route', currentRoute);
    }, [currentRoute]);

  useEffect(() => {
  const handlePopState = () => {
    setCurrentRoute(window.location.pathname);
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);

  const navigate = useCallback((route) => {
  if (route !== window.location.pathname) {
    window.history.pushState({}, '', route);
  }

  setCurrentRoute(route);
  window.scrollTo(0, 0);
  }, []);

  const handleLogout = () => {
    if (userRole === "driver") {
      localStorage.removeItem("nourivya-driver-token");
      localStorage.removeItem("nourivya-driver-user");
      const savedUser = readStoredUser("nourivya-user") || defaultUser;
      setCurrentUser(savedUser);
      setUserRole(savedUser.role || "admin");
      navigate("/driver/login");
      return;
    }

    navigate("/login");
  };

  useEffect(() => {
    const isDriverPublicRoute = [
      "/driver/login",
      "/driver/register"
    ].includes(currentRoute);
    const isDriverPrivateRoute =
      currentRoute.startsWith("/driver/") && !isDriverPublicRoute;
    const driverSession = readStoredDriverSession();

    if (isDriverPrivateRoute && !driverSession) {
      queueMicrotask(() => navigate("/driver/login"));
      return;
    }

    if (isDriverPrivateRoute && driverSession && userRole !== "driver") {
      queueMicrotask(() => {
        setCurrentUser(driverSession);
        setUserRole("driver");
      });
      return;
    }

    if (
      userRole === "driver" &&
      (!currentRoute.startsWith("/driver/") || isDriverPublicRoute)
    ) {
      queueMicrotask(() => navigate("/driver/dashboard"));
    }
  }, [currentRoute, navigate, userRole]);

  return (
    <div className={`nourivya-app${userRole === "driver" ? " driver-app" : ""}`}>
      
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <AlertTriangle size={18} />}
            {t.type === 'warning' && <AlertCircle size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {currentRoute === '/' && <LandingPage navigate={navigate} />}
      {currentRoute === '/login' && (
  <LoginPage
    navigate={navigate}
    setUserRole={setUserRole}
    setCurrentUser={setCurrentUser}
    addToast={addToast}
  />
)}
      {currentRoute === '/register' && <RegisterPage navigate={navigate} addToast={addToast} />}
      {currentRoute === '/driver/login' && (
        <LoginPage
          navigate={navigate}
          setUserRole={setUserRole}
          setCurrentUser={setCurrentUser}
          addToast={addToast}
          initialRole="driver"
        />
      )}
      {currentRoute === '/driver/register' && (
        <RegisterPage
          navigate={navigate}
          addToast={addToast}
          initialAccountType="driver"
        />
      )}

      {currentRoute !== '/' &&
        currentRoute !== '/login' &&
        currentRoute !== '/register' &&
        currentRoute !== '/driver/login' &&
        currentRoute !== '/driver/register' && (
        <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
          <Sidebar
  currentRoute={currentRoute}
  navigate={navigate}
  collapsed={sidebarCollapsed || (userRole === "driver" && isMobile)}
  setCollapsed={setSidebarCollapsed}
  userRole={userRole}
  user={currentUser}
  unreadCount={appData.notifications.filter(n => !n.read).length}
  onLogout={handleLogout}
/>
  <div className={userRole === "driver" ? "driver-main" : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--page-bg)' }}>
    <Topbar
              currentRoute={currentRoute} 
              navigate={navigate} 
              user={currentUser}
              userRole={userRole} 
              setUserRole={setUserRole}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              unreadCount={appData.notifications.filter(n => !n.read).length}
            />
            <div className={userRole === "driver" ? "driver-content" : undefined} style={{ flex: 1, overflowY: 'auto', padding: isMobile && userRole === "driver" ? "14px" : "28px" }}>
              {currentRoute === '/admin/dashboard' && <AdminDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/provider/dashboard' && <ProviderDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/provider/inventory' && <InventoryPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/provider/predictions' && <PredictionsPage appData={appData} addToast={addToast} />}
              {currentRoute === '/provider/safety' && <SafetyPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/recipient/dashboard' && <RecipientDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/recipient/requirements' && <RecipientRequirements appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/matching' && <MatchingPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/donations' && <DonationsPage appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute.startsWith('/donations/') && <DonationDetailView appData={appData} setAppData={setAppData} currentUser={currentUser} currentRoute={currentRoute} navigate={navigate} addToast={addToast} />}
              {currentRoute === '/logistics' && (
  <LogisticsPage
    appData={appData}
    setAppData={setAppData}
    addToast={addToast}
    navigate={navigate}
  />
)}
              {currentRoute.startsWith('/deliveries/') && <DeliveryTrackingView appData={appData} currentRoute={currentRoute} navigate={navigate} />}
              {currentRoute === '/agents' && <AgentActivityPage appData={appData} currentUser={currentUser} addToast={addToast} />}
              {currentRoute === '/monitoring' && <MonitoringPage appData={appData} setAppData={setAppData} addToast={addToast} currentUser={currentUser} />}
              {currentRoute === '/replanning' && <ReplanningCenter appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/analytics' && <AnalyticsPage appData={appData} />}
              {currentRoute === '/notifications' && <NotificationsPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/settings' && (
  <SettingsPage
    user={currentUser}
    setCurrentUser={setCurrentUser}
    addToast={addToast}
  />
)}
              {currentRoute === '/driver/dashboard' && (
                <DriverDashboard user={currentUser} navigate={navigate} />
              )}
              {currentRoute === '/driver/deliveries' && (
                <DriverDeliveriesPage
                  user={currentUser}
                  setUser={setCurrentUser}
                />
              )}
              {currentRoute === '/driver/profile' && (
                <DriverProfilePage
                  user={currentUser}
                  setUser={setCurrentUser}
                  addToast={addToast}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
