import { useState, useEffect } from 'react';
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
import './App.css';
import {
  getInventory,
  getDonations,
  getDeliveries,
  getDrivers,
  getSettings,
  getNotifications,
} from './api.js';

function App() {
 const [currentRoute, setCurrentRoute] = useState(
  () => window.location.pathname || '/'
);
  const [currentUser, setCurrentUser] = useState(() => {
  try {
    const savedUser = localStorage.getItem("nourivya-user");
    return savedUser ? JSON.parse(savedUser) : {
      name: "Dr. Aris Thorne",
      email: "aris.thorne@nourivya.org",
      role: "System Administrator",
      org: "ResQMeal AI Hub"
    };
  } catch {
    return {
      name: "Dr. Aris Thorne",
      email: "aris.thorne@nourivya.org",
      role: "System Administrator",
      org: "ResQMeal AI Hub"
    };
  }
});

const [userRole, setUserRole] = useState(() => {
  const savedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("nourivya-user") || "null");
    } catch {
      return null;
    }
  })();

  return savedUser?.role || currentUser.role || "admin";
});

  
  useEffect(() => {
    let cancelled = false;

    async function loadSavedProfile() {
      try {
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
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    let cancelled = false;

    async function loadNotifications() {
      try {
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

    return () => {
      cancelled = true;
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
  let cancelled = false;

  async function loadDonations() {
    try {
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
}, []);

  useEffect(() => {
  let cancelled = false;

  async function loadInventory() {
    try {
      const response = await getInventory();

      const inventory = (response.data || []).map(food => ({
        id: food._id,
        name: food.foodName,
        category: food.foodType,
        quantity: food.quantity,
        unit: food.unit,
        expiryTime: food.expiryTime
          ? food.expiryTime.slice(0, 16).replace('T', ' ')
          : '',
        location: food.pickupAddress,
        safety: 'REVIEW REQUIRED',
        donationStatus:
          food.status === 'available' ? 'Available' : food.status,
        description: food.description || '',
        provider: food.providerName,
      }));

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
}, []);

  useEffect(() => {
  let cancelled = false;

  async function loadLogistics() {
    try {
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
}, []);

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

  const navigate = (route) => {
  if (route !== window.location.pathname) {
    window.history.pushState({}, '', route);
  }

  setCurrentRoute(route);
  window.scrollTo(0, 0);
};

  return (
    <div className="nourivya-app">
      
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

      {currentRoute !== '/' && currentRoute !== '/login' && currentRoute !== '/register' && (
        <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
          <Sidebar
  currentRoute={currentRoute}
  navigate={navigate}
  collapsed={sidebarCollapsed}
  setCollapsed={setSidebarCollapsed}
  userRole={userRole}
  user={currentUser}
  unreadCount={appData.notifications.filter(n => !n.read).length}
/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--page-bg)' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {currentRoute === '/admin/dashboard' && <AdminDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/provider/dashboard' && <ProviderDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/provider/inventory' && <InventoryPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/provider/predictions' && <PredictionsPage appData={appData} addToast={addToast} />}
              {currentRoute === '/provider/safety' && <SafetyPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/recipient/dashboard' && <RecipientDashboard appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute === '/recipient/requirements' && <RecipientRequirements appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/matching' && <MatchingPage appData={appData} setAppData={setAppData} addToast={addToast} />}
              {currentRoute === '/donations' && <DonationsPage appData={appData} setAppData={setAppData} addToast={addToast} navigate={navigate} />}
              {currentRoute.startsWith('/donations/') && <DonationDetailView appData={appData} currentRoute={currentRoute} navigate={navigate} />}
              {currentRoute === '/logistics' && (
  <LogisticsPage
    appData={appData}
    setAppData={setAppData}
    addToast={addToast}
    navigate={navigate}
  />
)}
              {currentRoute.startsWith('/deliveries/') && <DeliveryTrackingView appData={appData} currentRoute={currentRoute} navigate={navigate} />}
              {currentRoute === '/agents' && <AgentActivityPage appData={appData} />}
              {currentRoute === '/monitoring' && <MonitoringPage appData={appData} setAppData={setAppData} addToast={addToast} />}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

