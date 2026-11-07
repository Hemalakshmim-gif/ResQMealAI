import { useState } from "react";
import { registerDriver, loginDriver } from "./api.js";

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px 16px",
  background: "var(--page-bg)"
};

const cardStyle = {
  width: "100%",
  maxWidth: "480px",
  background: "var(--card-bg)",
  border: "1px solid var(--border-color)",
  borderRadius: "18px",
  padding: "36px",
  boxShadow: "var(--shadow-card)"
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  background: "var(--card-bg)",
  color: "var(--text-primary)",
  fontSize: "14px",
  outline: "none"
};

const buttonStyle = {
  width: "100%",
  padding: "13px",
  border: "none",
  borderRadius: "8px",
  background: "var(--primary-green)",
  color: "#FFFFFF",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer"
};

function DriverAuthLayout({ title, subtitle, children, navigate }) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "28px",
            cursor: "pointer"
          }}
          onClick={() => navigate("/")}
        >
          <img
            src="/resqmeal-logo.png"
            alt="ResQMealAI"
            style={{
              width: "75px",
              height: "55px",
              objectFit: "contain"
            }}
          />

          <div>
            <h2 style={{
              color: "var(--primary-green)",
              fontSize: "21px",
              fontWeight: "900"
            }}>
              ResQMealAI
            </h2>

            <p style={{
              fontSize: "11px",
              color: "var(--text-secondary)"
            }}>
              Driver Portal
            </p>
          </div>
        </div>

        <h2 style={{
          fontSize: "25px",
          fontWeight: "800",
          marginBottom: "8px"
        }}>
          {title}
        </h2>

        <p style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          marginBottom: "25px",
          lineHeight: "1.6"
        }}>
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "13px",
        fontWeight: "700",
        marginBottom: "7px"
      }}>
        {label}
      </label>

      {children}
    </div>
  );
}

// DRIVER LOGIN PAGE
export function DriverLoginPage({
  navigate,
  setUserRole,
  setCurrentUser,
  addToast
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      addToast("Please enter your email and password.", "error");
      return;
    }

    try {
      setLoading(true);

      const response = await loginDriver({
        email: email.trim().toLowerCase(),
        password
      });

      if (!response.success || !response.token || !response.driver) {
        throw new Error("Invalid driver login response.");
      }

      const driverUser = {
        id: response.driver.id,
        name: response.driver.name,
        email: response.driver.email,
        phone: response.driver.phone,
        role: "driver",
        vehicleType: response.driver.vehicleType,
        capacityMeals: response.driver.capacityMeals,
        status: response.driver.status,
        currentLocation: response.driver.currentLocation
      };

      localStorage.setItem(
        "nourivya-driver-token",
        response.token
      );

      localStorage.setItem(
        "nourivya-driver-user",
        JSON.stringify(driverUser)
      );

      setCurrentUser(driverUser);
      setUserRole("driver");

      addToast("Driver login successful!", "success");
      navigate("/driver/dashboard");

    } catch (error) {
      console.error("Driver login failed:", error);
      addToast(
        error.message || "Unable to log in. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DriverAuthLayout
      title="Driver Login"
      subtitle="Sign in to manage your food deliveries and track your assignments."
      navigate={navigate}
    >
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}
      >
        <FormField label="Email Address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={inputStyle}
          />
        </FormField>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Signing in..." : "Login as Driver"}
        </button>
      </form>

      <p style={{
        textAlign: "center",
        marginTop: "22px",
        fontSize: "14px",
        color: "var(--text-secondary)"
      }}>
        New driver?{" "}
        <button
          type="button"
          onClick={() => navigate("/driver/register")}
          style={{
            border: "none",
            background: "none",
            color: "var(--primary-green)",
            fontWeight: "800",
            cursor: "pointer"
          }}
        >
          Create an account
        </button>
      </p>

      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          width: "100%",
          marginTop: "12px",
          padding: "10px",
          background: "transparent",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          cursor: "pointer",
          color: "var(--text-secondary)"
        }}
      >
        Back to Organization Login
      </button>
    </DriverAuthLayout>
  );
}

// DRIVER REGISTRATION PAGE
export function DriverRegisterPage({ navigate, addToast }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    vehicleType: "motorcycle",
    capacityMeals: "",
    currentLocation: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const capacityMeals = Number(formData.capacityMeals);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    if (
      !/^\+?[0-9\s()-]{7,20}$/.test(phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      addToast("Please enter a valid phone number.", "error");
      return;
    }

    if (formData.password.length < 8) {
      addToast(
        "Password must contain at least 8 characters.",
        "error"
      );
      return;
    }

    if (!Number.isInteger(capacityMeals) || capacityMeals < 1) {
      addToast(
        "Vehicle capacity must be a whole number of at least one meal.",
        "error"
      );
      return;
    }

    try {
      setLoading(true);

      const response = await registerDriver({
        ...formData,
        name: formData.name.trim(),
        phone,
        email,
        capacityMeals,
        currentLocation: formData.currentLocation.trim()
      });

      if (!response.success) {
        throw new Error(
          response.message || "Driver registration failed."
        );
      }

      addToast(
        "Driver account created successfully!",
        "success"
      );

      navigate("/driver/login");

    } catch (error) {
      console.error("Driver registration failed:", error);

      addToast(
        error.message || "Unable to register driver.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DriverAuthLayout
      title="Join as a Driver"
      subtitle="Register to help rescue surplus food and deliver meals to communities."
      navigate={navigate}
    >
      <form
        onSubmit={handleRegister}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px"
        }}
      >
        <FormField label="Full Name">
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Phone Number">
          <input
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Include country code if needed"
            maxLength={20}
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Email Address">
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Password">
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Vehicle Type">
          <select
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="bicycle">Bicycle</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="car">Car</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="other">Other</option>
          </select>
        </FormField>

        <FormField label="Meal Carrying Capacity">
          <input
            name="capacityMeals"
            type="number"
            min="1"
            value={formData.capacityMeals}
            onChange={handleChange}
            placeholder="Example: 20"
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Current Location">
          <input
            name="currentLocation"
            value={formData.currentLocation}
            onChange={handleChange}
            placeholder="Enter your city or area"
            required
            style={inputStyle}
          />
        </FormField>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            marginTop: "8px",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Creating Account..." : "Register as Driver"}
        </button>
      </form>

      <p style={{
        textAlign: "center",
        marginTop: "22px",
        fontSize: "14px",
        color: "var(--text-secondary)"
      }}>
        Already registered?{" "}
        <button
          type="button"
          onClick={() => navigate("/driver/login")}
          style={{
            border: "none",
            background: "none",
            color: "var(--primary-green)",
            fontWeight: "800",
            cursor: "pointer"
          }}
        >
          Login
        </button>
      </p>
    </DriverAuthLayout>
  );
}
