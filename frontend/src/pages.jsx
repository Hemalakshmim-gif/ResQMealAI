import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Truck, Users, Plus, CheckCircle2, MapPin, RefreshCw, Building, Database, Cpu, Layers, TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

import {
  createOrganization,
  createDonation,
  createFood,
  getOrganizations,
  loginOrganization,
  getFoodSafetyAnalysis,
  submitFoodSafetyReview,
  getInventory,
  updateDonation,
  getSettings,
  updateSettings,
  getNotifications,
  markAllNotificationsRead,
  getImpactAnalytics,
  getMonitoringIncidents,
  getReplanningProposals,
  approveReplanningProposal
} from './api.js';

export function LandingPage({ navigate }) {

const [analytics, setAnalytics] = useState(null);
const [analyticsLoading, setAnalyticsLoading] = useState(true);

useEffect(() => {
  let cancelled = false;

  async function loadAnalytics() {
    try {
      const response = await getImpactAnalytics();

      if (!response.success) {
        throw new Error("Unable to load impact metrics.");
      }

      if (!cancelled) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error("Landing page analytics error:", error);
    } finally {
      if (!cancelled) {
        setAnalyticsLoading(false);
      }
    }
  }

  loadAnalytics();

  return () => {
    cancelled = true;
  };
}, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflowY: 'auto', background: 'var(--page-bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 60px', background: '#FFFFFF', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img
            src="/resqmeal-logo.png"
            alt="ResQMealAI — Rescue Food. Redirect Hope."
            style={{ width: '76px', height: '60px', objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-green)' }}>ResQMealAI</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.2px' }}>Rescue Food. Redirect Hope.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#features" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>Features</a>
          <a href="#how-it-works" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>How It Works</a>
          <a href="#impact" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>Impact</a>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid var(--primary-green)', color: 'var(--primary-green)', padding: '10px 22px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Login</button>
        </div>
      </nav>

      <header style={{ padding: '80px 20px', textAlign: 'center', background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAF7 100%)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px 48px', boxShadow: 'var(--shadow-card)', marginBottom: '32px', display: 'inline-block' }}>
            <img
              src="/resqmeal-logo.png"
              alt="ResQMealAI — Rescue Food. Redirect Hope."
              style={{ width: 'min(100%, 360px)', height: 'auto', display: 'block', objectFit: 'contain', margin: '0 auto' }}
            />
            <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '20px 0' }}></div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Intelligence That Nourishes.</h3>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Predict surplus. Connect communities. Rescue every possible meal.</p>
          </div>

          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '700px', lineHeight: '1.6', marginBottom: '36px' }}>
            An intelligent food rescue platform that predicts surplus, connects food providers with communities in need, coordinates delivery, and adapts when unexpected challenges arise through an autonomous 7-agent AI system.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/register')} style={{ background: '#FFFFFF', color: 'var(--primary-green)', border: '1px solid var(--primary-green)', padding: '14px 32px', borderRadius: 'var(--radius-md)', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
              Register Organization
            </button>
          </div>
        </div>
      </header>

      <section style={{ padding: '80px 60px', maxWidth: '1200px', margin: '0 auto' }} id="features">
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '12px' }}>Designed for Every Stakeholder</h2>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Connecting the entire surplus food ecosystem in real-time.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: '50px', height: '50px', background: 'var(--light-green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)', marginBottom: '20px' }}>
              <Building size={26} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Food Providers</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Restaurants, hotels, and supermarkets list surplus inventory, run AI-driven demand forecasting, and verify safety effortlessly.</p>
          </div>
          <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: '50px', height: '50px', background: 'var(--light-green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)', marginBottom: '20px' }}>
              <Users size={26} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Recipient Organizations</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>NGOs, food banks, and community shelters discover available food, submit requests, and track incoming zero-emission deliveries.</p>
          </div>
          <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ width: '50px', height: '50px', background: 'var(--light-green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)', marginBottom: '20px' }}>
              <Cpu size={26} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>AI Administrators</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Monitor multi-agent execution, oversee logistics fleet, handle dynamic replanning incidents, and evaluate sustainability metrics.</p>
          </div>
        </div>
      </section>

      <section style={{ background: '#FFFFFF', padding: '80px 60px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }} id="how-it-works">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '12px' }}>The 7-Step Agentic AI Workflow</h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Fully autonomous coordination from surplus prediction to final meal delivery.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { step: '01', title: 'Predict Surplus', desc: 'AI forecasts expected surplus before prep.' },
              { step: '02', title: 'Assess Safety', desc: 'Multi-parameter thermal & shelf-life verification.' },
              { step: '03', title: 'Match Recipients', desc: 'Compatibility matching with NGO requirements.' },
              { step: '04', title: 'Allocate Food', desc: 'Equitable priority-based reservation.' },
              { step: '05', title: 'Coordinate Transport', desc: 'Zero-emission routing & driver assignment.' },
              { step: '06', title: 'Monitor Delivery', desc: 'Real-time telemetry and condition tracking.' },
              { step: '07', title: 'Adaptive Replanning', desc: 'Instant recovery when disruptions occur.' }
            ].map((s, idx) => (
              <div key={idx} style={{ background: 'var(--page-bg)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--emerald-accent)', background: 'var(--light-green)', padding: '4px 8px', borderRadius: '4px' }}>STEP {s.step}</span>
                <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '12px 0 6px 0' }}>{s.title}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 60px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }} id="impact">
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px' }}>Real-Time Impact Metrics</h2>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '40px' }}>Demonstration data representing live platform telemetry.</p>
        <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
  }}
>
  {[
    {
      val: analytics
        ? analytics.totalMealsRedistributed.toLocaleString()
        : analyticsLoading
          ? "Loading..."
          : "Unavailable",
      label: "Meals Redistributed",
    },
    {
      val: analytics
        ? analytics.activeProviderNetwork.toLocaleString()
        : analyticsLoading
          ? "Loading..."
          : "Unavailable",
      label: "Active Food Providers",
    },
    {
      val: analytics
        ? analytics.activeRecipientOrganizations != null
          ? analytics.activeRecipientOrganizations.toLocaleString()
          : "Not available"
        : analyticsLoading
          ? "Loading..."
          : "Unavailable",
      label: "Recipient NGOs & Shelters",
    },
    {
      val: analytics
        ? analytics.successfulDeliveryRate != null
          ? `${analytics.successfulDeliveryRate}%`
          : "Not available"
        : analyticsLoading
          ? "Loading..."
          : "Unavailable",
      label: "Successful Delivery Rate",
    },
  ].map((stat) => (
    <div
      key={stat.label}
      style={{
        background: "#FFFFFF",
        padding: "32px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-subtle)",
      }}
    >
      <h3
        style={{
          fontSize: "36px",
          fontWeight: "900",
          color: "var(--primary-green)",
          marginBottom: "8px",
        }}
      >
        {stat.val}
      </h3>

      <p
        style={{
          fontSize: "14px",
          fontWeight: "700",
          color: "var(--text-secondary)",
        }}
      >
        {stat.label}
      </p>
    </div>
  ))}
</div>
      </section>

      <footer style={{ background: '#17211B', color: '#fff', padding: '50px 60px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>ResQMeal AI — Food Rescue Network</p>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>An Agentic AI System for Intelligent Food Redistribution (Academic Project Prototype)</p>
        <p style={{ fontSize: '12px', color: '#647067' }}>© 2026 ResQMeal AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export function LoginPage({
  navigate,
  setUserRole,
  setCurrentUser,
  addToast,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelect, setRoleSelect] = useState('');

  
const handleLogin = async (e) => {
  e.preventDefault();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    addToast("Please enter your email and password.", "error");
    return;
  }

  try {
    // Admin is still a simulated demo role, not real authentication.
    if (roleSelect === "admin") {
      addToast(
        "Administrator access is still in demo mode.",
        "error"
      );
      return;
    }

    if (!roleSelect) {
      addToast("Please select your organization role.", "error");
      return;
    }

    // Verify credentials using the backend login API.
    const response = await loginOrganization({
      email: normalizedEmail,
      password,
    });

    
const organization = response.data?.organization;
const organizationRole = response.data?.role;

if (!organization || !organizationRole || !response.data?.token) {
  addToast("The login response was incomplete.", "error");
  return;
}

if (organizationRole !== roleSelect) {
  addToast(
    `This organization should use the ${organizationRole} role.`,
    "error"
  );
  return;
}

// Save the token and logged-in organization.
localStorage.setItem("nourivya-token", response.data.token);

localStorage.setItem(
  "nourivya-user",
  JSON.stringify({
    id: organization._id,
    name: organization.contact || organization.name,
    email: organization.email,
    role: organizationRole,
    org: organization.name
  })
);

    if (!organization || !organizationRole) {
      addToast("The login response was incomplete.", "error");
      return;
    }

    // Ensure the selected role matches the registered organization.
    if (organizationRole !== roleSelect) {
      addToast(
        `This organization should use the ${organizationRole} role.`,
        "error"
      );
      return;
    }

    // Update the profile displayed throughout the application.
    setCurrentUser({
      id: organization._id,
      name: organization.contact || organization.name,
      email: organization.email,
      role: organizationRole,
      org: organization.name,
    });

    setUserRole(organizationRole);

    addToast("Login successful!", "success");

    navigate(
      organizationRole === "provider"
        ? "/provider/dashboard"
        : "/recipient/dashboard"
    );
  } catch (error) {
    console.error("Login failed:", error);

    addToast(
      error.message || "Unable to log in. Please try again.",
      "error"
    );
  }
};

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--page-bg)' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ background: '#FFFFFF', padding: '48px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', width: '100%', maxWidth: '460px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img
              src="/resqmeal-logo.png"
              alt="ResQMealAI Logo"
              style={{ width: '76px', height: '54px', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-green)' }}>ResQMealAI</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>Rescue Food. Redirect Hope.</p>
            </div>
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Welcome Back</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Sign in to manage surplus rescue operations.</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div>
  <label
    style={{
      display: 'block',
      fontSize: '13px',
      fontWeight: '700',
      marginBottom: '8px',
    }}
  >
    Organization Role
  </label>

  <select
    value={roleSelect}
    onChange={(e) => setRoleSelect(e.target.value)}
    required
    style={{
      width: '100%',
      padding: '12px 16px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-color)',
      fontSize: '14px',
      outline: 'none',
      background: '#fff',
    }}
  >
    <option value="">Select your role</option>
    <option value="provider">Food Provider (Restaurant/Hotel)</option>
    <option value="recipient">Recipient Organization (NGO/Shelter)</option>
  </select>
</div>
            <button type="submit" style={{ background: 'var(--primary-green)', color: '#fff', border: 'none', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '10px' }}>
              Sign In
            </button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Don't have an account? <span onClick={() => navigate('/register')} style={{ color: 'var(--primary-green)', fontWeight: '700', cursor: 'pointer' }}>Register organization</span>
          </p>
        </div>
      </div>

      <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--emerald-accent) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', padding: '60px', textAlign: 'center' }}>
        <img
          src="/resqmeal-logo.png"
          alt="ResQMealAI Logo"
          style={{ width: 'min(100%, 300px)', height: 'auto', objectFit: 'contain', marginBottom: '24px', borderRadius: '16px' }}
        />
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '16px' }}>Intelligence That Nourishes.</h2>
        <p style={{ fontSize: '16px', maxWidth: '480px', lineHeight: '1.6', opacity: '0.9' }}>
          Join the autonomous food redistribution network connecting surplus providers with hungry communities in real-time.
        </p>
      </div>
    </div>
  );
}


export function RegisterPage({ navigate, addToast }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    orgType: 'Restaurant',
    city: 'Bengaluru',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    const typeMap = {
      Restaurant: 'restaurant',
      Hotel: 'hotel',
      Supermarket: 'supermarket',
      NGO: 'ngo',
      'Food Bank': 'food_bank',
    };

    try {
      const response = await createOrganization({
        name: formData.name.trim(),
        type: typeMap[formData.orgType],
        contact: formData.contact.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
      });

      const organization = response.data;

      if (organization?._id) {
        localStorage.setItem(
          'resqmeal_registered_organization_id',
          organization._id
        );
        localStorage.setItem(
          'resqmeal_registered_organization_email',
          organization.email
        );
      }

      addToast(
        'Organization registered successfully! Welcome to ResQMeal AI.',
        'success'
      );

      navigate('/login');
    } catch (error) {
      addToast(
        error.message || 'Registration failed. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '6px',
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--page-bg)',
      overflowY: 'auto',
      padding: '40px',
      boxSizing: 'border-box',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF',
        padding: '48px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        width: '100%',
        maxWidth: '600px',
        margin: 'auto',
        boxSizing: 'border-box',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <img
            src="/resqmeal-logo.png"
            alt="ResQMealAI Logo"
            style={{
              width: '76px',
              height: '54px',
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '900',
              color: 'var(--primary-green)',
            }}>
              ResQMealAI Registration
            </h2>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '3px',
            }}>
              Rescue Food. Redirect Hope.
            </p>
          </div>
        </div>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
        }}>
          Register your organization to participate in intelligent food rescue.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            <div>
              <label style={labelStyle}>Organization Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Grand Bistro"
                value={formData.name}
                onChange={(e) => setFormData({
                  ...formData, name: e.target.value,
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Organization Type</label>
              <select
                value={formData.orgType}
                onChange={(e) => setFormData({
                  ...formData, orgType: e.target.value,
                })}
                style={{ ...inputStyle, background: '#fff' }}
              >
                <option value="Restaurant">Restaurant</option>
                <option value="Hotel">Hotel</option>
                <option value="Supermarket">Supermarket</option>
                <option value="NGO">NGO / Shelter</option>
                <option value="Food Bank">Food Bank</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={formData.contact}
                onChange={(e) => setFormData({
                  ...formData, contact: e.target.value,
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                required
                placeholder="name@org.com"
                value={formData.email}
                onChange={(e) => setFormData({
                  ...formData, email: e.target.value,
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                required
                placeholder="Contact number"
                value={formData.phone}
                onChange={(e) => setFormData({
                  ...formData, phone: e.target.value,
                })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>City</label>
              <input
                type="text"
                required
                placeholder="e.g. Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({
                  ...formData, city: e.target.value,
                })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Organization Address</label>
            <input
              type="text"
              required
              placeholder="Street, area, and locality"
              value={formData.address}
              onChange={(e) => setFormData({
                ...formData, address: e.target.value,
              })}
              style={inputStyle}
            />
          </div>

          <div>
  <label style={labelStyle}>Password</label>
  <input
    type="password"
    required
    minLength={8}
    autoComplete="new-password"
    placeholder="Create a password (at least 8 characters)"
    value={formData.password}
    onChange={(e) =>
      setFormData({
        ...formData,
        password: e.target.value,
      })
    }
    style={inputStyle}
  />
</div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'var(--primary-green)',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '700',
              fontSize: '15px',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: '10px',
            }}
          >
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          Already registered?{' '}
          <span
            onClick={() => navigate('/login')}
            style={{
              color: 'var(--primary-green)',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}

export function AdminDashboard({ appData, addToast, navigate }) {
  const chartData = [
    { day: 'Mon', rescued: 120, predicted: 140 },
    { day: 'Tue', rescued: 190, predicted: 180 },
    { day: 'Wed', rescued: 150, predicted: 160 },
    { day: 'Thu', rescued: 220, predicted: 210 },
    { day: 'Fri', rescued: 280, predicted: 260 },
    { day: 'Sat', rescued: 310, predicted: 300 },
    { day: 'Sun', rescued: 250, predicted: 240 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--emerald-accent) 100%)', padding: '32px', borderRadius: 'var(--radius-lg)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Good morning, Administrator</h2>
          <p style={{ fontSize: '14px', opacity: '0.9' }}>Here's the operational overview of your autonomous food rescue network.</p>
        </div>
        <button onClick={() => addToast('System agents successfully synchronized!', 'success')} style={{ background: '#fff', color: 'var(--primary-green)', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Sync Agents
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
{[
  {
    label: 'Inventory Records',
    val: appData.inventory.length,
    icon: Database,
    color: 'var(--info-blue)'
  },
  {
    label: 'Calculated Surplus',
    val: 'See Predictions',
    icon: TrendingUp,
    color: 'var(--emerald-accent)'
  },
  {
    label: 'Donation Records',
    val: appData.donations.length,
    icon: Layers,
    color: 'var(--warning-amber)'
  },
  {
    label: 'Delivery Records',
    val: appData.deliveries.length,
    icon: Truck,
    color: 'var(--primary-green)'
  }
].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ background: '#FFFFFF', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-subtle)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--light-green)', color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>{card.label}</p>
                <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>{card.val}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>Food Rescued vs. Predicted Surplus (kg)</h3>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e2" />
                <XAxis dataKey="day" stroke="#647067" />
                <YAxis stroke="#647067" />
                <Tooltip />
                <Area type="monotone" dataKey="rescued" stroke="#166534" fill="#DCFCE7" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Critical Incidents & Alerts</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {appData.incidents.map((inc, i) => (
              <div key={i} style={{ background: '#fff5f5', borderLeft: '4px solid var(--critical-red)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--critical-red)' }}>{inc.id}: {inc.type}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{inc.detectedAt}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{inc.description}</p>
                <button onClick={() => navigate('/replanning')} style={{ background: 'var(--critical-red)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Resolve via Replanning
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProviderDashboard({ appData, navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Food Provider Dashboard</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Manage your surplus food inventory and AI forecasts.</p>
        </div>
        <button onClick={() => navigate('/provider/inventory')} style={{ background: 'var(--primary-green)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Manage Inventory
        </button>
      </div>

      <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Current Inventory Overview</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <th style={{ padding: '12px' }}>Food Item</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Expiry</th>
              <th style={{ padding: '12px' }}>Safety</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {appData.inventory.slice(0, 4).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                <td style={{ padding: '14px 12px', fontWeight: '700' }}>{item.name}</td>
                <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{item.category}</td>
                <td style={{ padding: '14px 12px' }}>{item.quantity} {item.unit}</td>
                <td style={{ padding: '14px 12px' }}>{item.expiryTime}</td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: item.safety === 'SAFE' ? 'var(--light-green)' : item.safety === 'URGENT' ? '#fef3c7' : '#fee2e2',
                    color: item.safety === 'SAFE' ? 'var(--primary-green)' : item.safety === 'URGENT' ? 'var(--warning-amber)' : 'var(--critical-red)'
                  }}>
                    {item.safety}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>{item.donationStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export function InventoryPage({ appData, setAppData, addToast }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Prepared Meals',
    quantity: '10',
    unit: 'meals',
    expiryTime: '',
    providerName: '',
    pickupAddress: '',
  });

  const updateField = (field, value) => {
    setNewItem((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setNewItem({
      name: '',
      category: 'Prepared Meals',
      quantity: '10',
      unit: 'meals',
      expiryTime: '',
      providerName: '',
      pickupAddress: '',
    });
  };

  const handleAddItem = async (event) => {
    event.preventDefault();

    if (saving) return;

    const foodName = newItem.name.trim();
    const providerName = newItem.providerName.trim();
    const pickupAddress = newItem.pickupAddress.trim();
    const quantity = Number(newItem.quantity);
    const expiryDate = new Date(newItem.expiryTime);

    if (!foodName) {
      addToast('Please enter the food name.', 'error');
      return;
    }

    if (!providerName) {
      addToast('Please enter the food provider name.', 'error');
      return;
    }

    if (!pickupAddress) {
      addToast('Please enter the food pickup address.', 'error');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      addToast('Quantity must be greater than zero.', 'error');
      return;
    }

    if (
      !newItem.expiryTime ||
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate.getTime() <= Date.now()
    ) {
      addToast(
        'Please select a valid future expiry date and time.',
        'error'
      );
      return;
    }

    const foodTypeMap = {
      Bakery: 'bakery',
      Produce: 'produce',
      'Prepared Meals': 'cooked',
      Dairy: 'dairy',
    };

    const payload = {
      foodName,
      quantity,
      unit: newItem.unit,
      providerName,
      pickupAddress,
      expiryTime: expiryDate.toISOString(),
      foodType: foodTypeMap[newItem.category],
      status: 'available',
    };

    try {
      setSaving(true);

      const response = await createFood(payload);

      // Support common response formats returned by Express APIs.
      const food =
        response?.data?.food ??
        response?.data ??
        response?.food ??
        response;

      if (!food || !food._id) {
        throw new Error(
          'The backend response did not contain the saved food record.'
        );
      }

      const savedItem = {
        id: food._id,
        name: food.foodName || foodName,
        category: food.foodType || payload.foodType,
        quantity: food.quantity ?? quantity,
        unit: food.unit || newItem.unit,
        expiryTime: food.expiryTime
          ? new Date(food.expiryTime).toLocaleString()
          : expiryDate.toLocaleString(),
        safety: 'REVIEW REQUIRED',
        donationStatus:
          food.status === 'available'
            ? 'Available'
            : food.status || 'Available',
        prepTime: 'Just now',
        location: food.pickupAddress || pickupAddress,
        providerName: food.providerName || providerName,
        pickupAddress: food.pickupAddress || pickupAddress,
      };

      setAppData((previous) => ({
        ...previous,
        inventory: [
          savedItem,
          ...(previous.inventory || []).filter(
            (item) => item.id !== savedItem.id
          ),
        ],
      }));

      setModalOpen(false);
      resetForm();

      addToast(
        'Food item saved to the backend successfully.',
        'success'
      );
    } catch (error) {
      console.error('Failed to save food item:', error);

      addToast(
        error.message || 'Failed to save the food item.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    boxSizing: 'border-box',
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    background: '#FFFFFF',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
            Food Inventory Management
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            Manage available food items and prepare them for redistribution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            background: 'var(--primary-green)',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={16} />
          Add Food Item
        </button>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          overflowX: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
              }}
            >
              <th style={{ padding: '12px' }}>ID</th>
              <th style={{ padding: '12px' }}>Food Item</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Expiry Time</th>
              <th style={{ padding: '12px' }}>Safety</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {(appData.inventory || []).map((item, index) => (
              <tr
                key={item.id || index}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '14px',
                }}
              >
                <td
                  style={{
                    padding: '14px 12px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {item.id}
                </td>

                <td style={{ padding: '14px 12px', fontWeight: '700' }}>
                  {item.name}
                </td>

                <td
                  style={{
                    padding: '14px 12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {item.category}
                </td>

                <td style={{ padding: '14px 12px' }}>
                  {item.quantity} {item.unit}
                </td>

                <td style={{ padding: '14px 12px' }}>
                  {item.expiryTime || 'Not recorded'}
                </td>

                <td style={{ padding: '14px 12px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      background:
                        item.safety === 'SAFE'
                          ? 'var(--light-green)'
                          : item.safety === 'URGENT'
                            ? '#FEF3C7'
                            : '#FEE2E2',
                      color:
                        item.safety === 'SAFE'
                          ? 'var(--primary-green)'
                          : item.safety === 'URGENT'
                            ? 'var(--warning-amber)'
                            : 'var(--critical-red)',
                    }}
                  >
                    {item.safety || 'REVIEW REQUIRED'}
                  </span>
                </td>

                <td
                  style={{
                    padding: '14px 12px',
                    fontWeight: '600',
                  }}
                >
                  {item.donationStatus || 'Unknown'}
                </td>
              </tr>
            ))}

            {(appData.inventory || []).length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '28px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No inventory records are available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
            zIndex: 1000,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-card)',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '800',
                marginBottom: '8px',
              }}
            >
              Add Food Inventory Item
            </h3>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginBottom: '20px',
              }}
            >
              Enter the food details. New items remain subject to food-safety
              checks before they can be requested.
            </p>

            <form
              onSubmit={handleAddItem}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <label style={labelStyle}>Food Name</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(event) =>
                    updateField('name', event.target.value)
                  }
                  placeholder="e.g. Fresh vegetable rice"
                  style={inputStyle}
                  disabled={saving}
                />
              </div>

              <div>
                <label style={labelStyle}>Food Provider Name</label>
                <input
                  type="text"
                  required
                  value={newItem.providerName}
                  onChange={(event) =>
                    updateField('providerName', event.target.value)
                  }
                  placeholder="e.g. Green Leaf Restaurant"
                  style={inputStyle}
                  disabled={saving}
                />
              </div>

              <div>
                <label style={labelStyle}>Pickup Address</label>
                <input
                  type="text"
                  required
                  value={newItem.pickupAddress}
                  onChange={(event) =>
                    updateField('pickupAddress', event.target.value)
                  }
                  placeholder="Enter the food collection address"
                  style={inputStyle}
                  disabled={saving}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={newItem.category}
                    onChange={(event) =>
                      updateField('category', event.target.value)
                    }
                    style={inputStyle}
                    disabled={saving}
                  >
                    <option value="Bakery">Bakery</option>
                    <option value="Produce">Produce</option>
                    <option value="Prepared Meals">Prepared Meals</option>
                    <option value="Dairy">Dairy</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Quantity</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    value={newItem.quantity}
                    onChange={(event) =>
                      updateField('quantity', event.target.value)
                    }
                    style={inputStyle}
                    disabled={saving}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label style={labelStyle}>Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(event) =>
                      updateField('unit', event.target.value)
                    }
                    style={inputStyle}
                    disabled={saving}
                  >
                    <option value="meals">Meals</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="items">Items</option>
                    <option value="packets">Packets</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Expiry Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    min={(() => {
                      const now = new Date();
                      now.setMinutes(
                        now.getMinutes() - now.getTimezoneOffset()
                      );
                      return now.toISOString().slice(0, 16);
                    })()}
                    value={newItem.expiryTime}
                    onChange={(event) =>
                      updateField('expiryTime', event.target.value)
                    }
                    style={inputStyle}
                    disabled={saving}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  style={{
                    background: '#F1F5F1',
                    color: '#17212F',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'var(--primary-green)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '700',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictionsPage({ addToast }) {
  const [analysis, setAnalysis] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const runPrediction = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(
        `${baseUrl}/api/agents/inventory-surplus/analyze`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to analyze inventory.'
        );
      }

      setAnalysis(result.data);

      addToast(
        'Inventory surplus analysis completed successfully.',
        'success'
      );
    } catch (err) {
      setError(err.message || 'Could not load inventory analysis.');
      addToast('Inventory analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    let cancelled = false;

    const loadPrediction = async () => {
      try {
        setLoading(true);
        setError('');

        const baseUrl =
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        const response = await fetch(
          `${baseUrl}/api/agents/inventory-surplus/analyze`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to analyze inventory.'
          );
        }

        if (!cancelled) {
          setAnalysis(result.data);
        }

        if (!cancelled) {
          addToast(
            'Inventory surplus analysis completed successfully.',
            'success'
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load inventory analysis.');
          addToast('Inventory analysis failed.', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const recommendations = analysis?.recommendations || [];

  const eligibleCount = recommendations.filter(
    (item) =>
      item.surplusPrediction?.predictionStatus === 'estimated'
  ).length;

  const excludedCount =
    analysis?.summary?.excluded ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
            Surplus AI Predictions
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            Inventory analysis and rule-based surplus estimation.
          </p>
        </div>

        <button
          onClick={runPrediction}
          disabled={loading}
          style={{
            background: 'var(--primary-green)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: '700',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Analyzing...' : 'Run Prediction Model'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '16px',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#B91C1C',
          }}
        >
          {error}
        </div>
      )}

      {analysis && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                padding: '28px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  marginBottom: '16px',
                }}
              >
                Inventory Records
              </h3>

              <p
                style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  color: 'var(--primary-green)',
                  marginBottom: '8px',
                }}
              >
                {analysis.summary?.totalRecords ?? 0}
              </p>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Records analyzed by the backend
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                padding: '28px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '800',
                  marginBottom: '16px',
                }}
              >
                Surplus Estimates
              </h3>

              <p
                style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: 'var(--warning-amber)',
                  marginBottom: '8px',
                }}
              >
                {eligibleCount}
              </p>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Records with a calculated surplus
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                padding: '28px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    marginBottom: '16px',
                  }}
                >
                  Excluded Food
                </h3>

                <p
                  style={{
                    fontSize: '36px',
                    fontWeight: '900',
                    color: '#B91C1C',
                    marginBottom: '8px',
                  }}
                >
                  {excludedCount}
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Records excluded by inventory rules
                </p>
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>
              Inventory Analysis Details
            </h3>

            {analysis.aiStatus !== 'available' && (
              <p
                style={{
                  padding: '12px',
                  background: '#FFFBEB',
                  borderRadius: '8px',
                  color: '#92400E',
                  marginBottom: '16px',
                }}
              >
                AI recommendations are unavailable. Results below come
                from the existing rule-based inventory analysis.
              </p>
            )}

            {recommendations.length === 0 ? (
              <p>No inventory analysis records were returned.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                      }}
                    >
                      <th style={{ padding: '12px' }}>Food</th>
                      <th style={{ padding: '12px' }}>Quantity</th>
                      <th style={{ padding: '12px' }}>Priority</th>
                      <th style={{ padding: '12px' }}>Prediction</th>
                      <th style={{ padding: '12px' }}>Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recommendations.map((item) => (
                      <tr
                        key={item._id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '14px',
                        }}
                      >
                        <td style={{ padding: '14px 12px', fontWeight: '700' }}>
                          {item.foodName}
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          {item.quantity} {item.unit}
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          {item.priority}
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          {item.surplusPrediction?.predictionStatus === 'estimated'
                            ? `${item.surplusPrediction.estimatedSurplus} ${item.unit}`
                            : item.surplusPrediction?.predictionStatus === 'excluded'
                              ? 'Excluded'
                              : 'Insufficient demand data'}
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          {item.surplusPrediction?.reason ||
                            item.reason ||
                            'No explanation provided'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '16px',
              }}
            >
              No confidence percentage or peak surplus time is shown because
              the current API does not return those metrics.
            </p>
          </div>
        </>
      )}
    </div>
  );
}



export function SafetyPage({ addToast }) {
  const [safetyResults, setSafetyResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingFoodId, setSavingFoodId] = useState(null);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [storageVerified, setStorageVerified] = useState(false);
  const [packagingVerified, setPackagingVerified] = useState(false);
  const [handlingVerified, setHandlingVerified] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('approved');

  const loadSafetyResults = async () => {
    try {
      const response = await getFoodSafetyAnalysis();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid food safety response.');
      }

      setSafetyResults(response.data);
    } catch (error) {
      addToast(
        error.message || 'Could not load food safety results.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchSafetyResults = async () => {
      try {
        const response = await getFoodSafetyAnalysis();
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error('Invalid food safety response.');
        }

        if (!cancelled) {
          setSafetyResults(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          addToast(
            error.message || 'Could not load food safety results.',
            'error'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSafetyResults();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const selectedFood = safetyResults.find(
    (food) => food.id === selectedFoodId
  );

  const resetForm = () => {
    setSelectedFoodId('');
    setStorageVerified(false);
    setPackagingVerified(false);
    setHandlingVerified(false);
    setReviewNotes('');
    setReviewStatus('approved');
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!selectedFoodId) {
      addToast('Please select a food listing.', 'error');
      return;
    }

    if (!reviewerName.trim()) {
      addToast('Please enter the reviewer name.', 'error');
      return;
    }

    if (
      reviewStatus === 'approved' &&
      (!storageVerified || !packagingVerified || !handlingVerified)
    ) {
      addToast(
        'Approval requires all three verification checks.',
        'error'
      );
      return;
    }

    setSavingFoodId(selectedFoodId);

    try {
      const response = await submitFoodSafetyReview({
        foodId: selectedFoodId,
        reviewStatus,
        storageVerified,
        packagingVerified,
        handlingVerified,
        reviewedBy: reviewerName.trim(),
        reviewNotes: reviewNotes.trim(),
      });

      addToast(
        response.message || 'Safety review saved.',
        'success'
      );

      resetForm();
      await loadSafetyResults();
    } catch (error) {
      addToast(
        error.message || 'Could not save food safety review.',
        'error'
      );
    } finally {
      setSavingFoodId(null);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    background: '#FFFFFF',
    color: 'var(--text-primary)',
  };

  const statusColor = (food) => {
    if (food.eligibilityStatus === 'approved') {
      return { background: '#dcfce7', color: '#166534' };
    }

    if (food.eligibilityStatus === 'ineligible') {
      return { background: '#fee2e2', color: '#991b1b' };
    }

    return { background: '#fef3c7', color: '#92400e' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
          Food Safety &amp; Quality Assessment
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Review storage, packaging, handling, and expiry before food can
          be recommended to recipient organizations.
        </p>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: 0 }}>
          Submit a safety review
        </h3>

        <form
          onSubmit={handleSubmitReview}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <label style={{ fontSize: '13px', fontWeight: '700' }}>
            Food listing
            <select
              required
              value={selectedFoodId}
              onChange={(event) => setSelectedFoodId(event.target.value)}
              style={{ ...fieldStyle, marginTop: '6px' }}
            >
              <option value="">Select food to review</option>
              {safetyResults.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.foodName} — {food.reviewStatus || 'pending'} review
                </option>
              ))}
            </select>
          </label>

          {selectedFood && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              <div>
                <strong>Quantity:</strong> {selectedFood.quantity}{' '}
                {selectedFood.unit}
              </div>
              <div>
                <strong>Food type:</strong> {selectedFood.foodType}
              </div>
              <div>
                <strong>Expiry:</strong>{' '}
                {selectedFood.expiryTime
                  ? new Date(selectedFood.expiryTime).toLocaleString()
                  : 'Not provided'}
              </div>
              <div>
                <strong>Current eligibility:</strong>{' '}
                {selectedFood.eligibilityStatus}
              </div>

              {selectedFood.reasons?.length > 0 && (
                <ul style={{ marginBottom: 0 }}>
                  {selectedFood.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label style={{ fontSize: '13px', fontWeight: '700' }}>
            Reviewer name
            <input
              required
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Enter reviewer name"
              style={{ ...fieldStyle, marginTop: '6px' }}
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Verification checklist
            </span>

            {[
              {
                label: 'Storage conditions verified',
                checked: storageVerified,
                setter: setStorageVerified,
              },
              {
                label: 'Packaging integrity verified',
                checked: packagingVerified,
                setter: setPackagingVerified,
              },
              {
                label: 'Food handling verified',
                checked: handlingVerified,
                setter: setHandlingVerified,
              },
            ].map((item) => (
              <label
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.setter(event.target.checked)}
                />
                {item.label}
              </label>
            ))}
          </div>

          <label style={{ fontSize: '13px', fontWeight: '700' }}>
            Review decision
            <select
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
              style={{ ...fieldStyle, marginTop: '6px' }}
            >
              <option value="approved">Approve after verification</option>
              <option value="rejected">Reject</option>
              <option value="pending">Keep pending</option>
            </select>
          </label>

          <label style={{ fontSize: '13px', fontWeight: '700' }}>
            Review notes
            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Record observations or reasons for rejection"
              rows={3}
              style={{
                ...fieldStyle,
                marginTop: '6px',
                resize: 'vertical',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={Boolean(savingFoodId) || loading}
            style={{
              background: 'var(--primary-green)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 18px',
              fontWeight: '800',
              cursor: savingFoodId ? 'wait' : 'pointer',
              opacity: savingFoodId || loading ? 0.65 : 1,
            }}
          >
            {savingFoodId ? 'Saving review...' : 'Submit safety review'}
          </button>
        </form>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
            Food safety results
          </h3>
          <button
            type="button"
            onClick={loadSafetyResults}
            disabled={loading}
            style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading food safety results...</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              minWidth: '650px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}
              >
                <th style={{ padding: '12px' }}>Food item</th>
                <th style={{ padding: '12px' }}>Expiry</th>
                <th style={{ padding: '12px' }}>Review</th>
                <th style={{ padding: '12px' }}>Eligibility</th>
                <th style={{ padding: '12px' }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {safetyResults.map((food) => (
                <tr
                  key={food.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '13px',
                  }}
                >
                  <td style={{ padding: '14px 12px', fontWeight: '700' }}>
                    {food.foodName}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    {food.expiryTime
                      ? new Date(food.expiryTime).toLocaleString()
                      : 'Not provided'}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    {food.reviewStatus || 'pending'}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span
                      style={{
                        ...statusColor(food),
                        padding: '4px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}
                    >
                      {food.eligibilityStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    {food.canBeRecommended ? 'Eligible' : 'Blocked'}
                  </td>
                </tr>
              ))}

              {safetyResults.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px 12px' }}>
                    No food listings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function RecipientDashboard({ appData, addToast, navigate }) {
  const [organizationId, setOrganizationId] = useState('');
  const [loadingOrganization, setLoadingOrganization] = useState(true);
  const [requestingFoodId, setRequestingFoodId] = useState(null);
  const [safetyResults, setSafetyResults] = useState([]);
  const [loadingSafety, setLoadingSafety] = useState(true);
  const [safetyError, setSafetyError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrganization() {
      try {
        const response = await getOrganizations();
        const organizations = response.data || [];
        const activeOrganization = organizations.find(
          (organization) => organization.isActive
        );

        if (!cancelled && activeOrganization) {
          setOrganizationId(activeOrganization._id);
        } else if (!cancelled) {
          addToast('No active recipient organization was found.', 'error');
        }
      } catch (error) {
        if (!cancelled) {
          addToast(error.message || 'Could not load recipient organization.', 'error');
        }
      } finally {
        if (!cancelled) setLoadingOrganization(false);
      }
    }

    loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  useEffect(() => {
  let cancelled = false;

  async function loadFoodSafety() {
    try {
      setLoadingSafety(true);
      setSafetyError('');

      const response = await getFoodSafetyAnalysis();

      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid food-safety analysis response.');
      }

      if (!cancelled) {
        setSafetyResults(response.data);
      }
    } catch (error) {
      if (!cancelled) {
        setSafetyError(
          error.message || 'Could not load food-safety results.'
        );
      }
    } finally {
      if (!cancelled) {
        setLoadingSafety(false);
      }
    }
  }

  loadFoodSafety();

  return () => {
    cancelled = true;
  };
}, []);

  const handleRequestFood = async (item) => {
    if (!organizationId) {
      addToast('Recipient organization is not ready. Please try again.', 'error');
      return;
    }

    if (!item.id || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      addToast('This food listing has invalid information.', 'error');
      return;
    }

    setRequestingFoodId(item.id);

    try {
      const result = await createDonation({
        food: item.id,
        recipient: organizationId,
        quantity: Number(item.quantity),
        notes: 'Requested through the Recipient Dashboard',
      });

      addToast(
        result.message || `Request submitted for ${item.name}.`,
        'success'
      );

      navigate('/donations');
    } catch (error) {
      addToast(error.message || 'Could not submit food request.', 'error');
    } finally {
      setRequestingFoodId(null);
    }
  };

  const safetyByFoodId = new Map(
  safetyResults.map((result) => [result.id, result])
);

const availableItems = appData.inventory.filter((item) => {
  const safety = safetyByFoodId.get(item.id);

  return (
    item.donationStatus === 'Available' &&
    safety?.canBeRecommended === true &&
    safety?.eligibilityStatus === 'eligible'
  );
});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
          Recipient Organization Hub
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Discover available food surplus and request donations.
        </p>
      </div>

      {loadingSafety && (
  <p style={{ color: 'var(--text-secondary)' }}>
    Checking food-safety eligibility...
  </p>
)}

{!loadingSafety && safetyError && (
  <p style={{ color: '#B91C1C' }}>
    {safetyError} Food requests are disabled until safety status can be verified.
  </p>
)}

{!loadingSafety && !safetyError && availableItems.length === 0 && (
  <div
    style={{
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      background: '#FFFFFF',
    }}
  >
    <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
      No food currently eligible for requests
    </h3>
    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
      Available food must pass expiry and food-safety checks before it can
      be requested. Please check again later.
    </p>
  </div>
)}

      {loadingOrganization && (
        <p style={{ color: 'var(--text-secondary)' }}>
          Loading recipient organization...
        </p>
      )}

      <div
        style={{
          display: loadingSafety || safetyError ? 'none' : 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        {availableItems.map((item) => (
          <div
            key={item.id}
            style={{
              background: '#FFFFFF',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  background: 'var(--light-green)',
                  color: 'var(--primary-green)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {item.category}
              </span>

              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '12px 0 6px 0' }}>
                {item.name}
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Quantity: <strong>{item.quantity} {item.unit}</strong>
              </p>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Location: {item.location}
              </p>
            </div>

            <button
              onClick={() => handleRequestFood(item)}
              disabled={loadingOrganization || !organizationId || requestingFoodId !== null}
              style={{
                background: 'var(--primary-green)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                cursor: loadingOrganization || !organizationId || requestingFoodId !== null
                  ? 'not-allowed'
                  : 'pointer',
                opacity: loadingOrganization || !organizationId || requestingFoodId !== null
                  ? 0.65
                  : 1,
                width: '100%',
              }}
            >
              {requestingFoodId === item.id
                ? 'Submitting Request...'
                : 'Request Food Opportunity'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecipientRequirements({ addToast }) {
  const [reqs, setReqs] = useState({ capacity: 150, maxDistance: 10, categories: 'Bakery, Prepared Meals' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '600px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Organization Requirements & Capabilities</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Configure your recipient shelter capacity for automated matching.</p>
      </div>

      <div style={{ background: '#FFFFFF', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <form onSubmit={e => { e.preventDefault(); addToast('Requirements saved successfully!', 'success'); }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Max Daily Receiving Capacity (Meals)</label>
            <input type="number" value={reqs.capacity} onChange={e => setReqs({...reqs, capacity: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Max Travel Distance (km)</label>
            <input type="number" value={reqs.maxDistance} onChange={e => setReqs({...reqs, maxDistance: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Preferred Food Categories</label>
            <input type="text" value={reqs.categories} onChange={e => setReqs({...reqs, categories: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
          </div>
          <button type="submit" style={{ background: 'var(--primary-green)', color: '#fff', border: 'none', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer' }}>
            Save Requirements
          </button>
        </form>
      </div>
    </div>
  );
}

export function MatchingPage() {
  const [matches, setMatches] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/agents/demand-matching/analyze`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to load matching results.'
          );
        }

        if (!cancelled) {
          setMatches(result.data?.matches || []);
          setSummary(result.data?.summary || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load matching results.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMatches();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
      }}
    >
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
          AI Recipient Matching Matrix
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Intelligent pairing based on food eligibility and recipient demand.
        </p>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>
          Matching Results
        </h3>

        {loading && <p>Loading matching results from the backend...</p>}

        {!loading && error && (
          <div>
            <p style={{ color: '#B91C1C' }}>
              Unable to load matching results: {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && summary && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            <div>
              <strong>{summary.totalFoodRecords ?? 0}</strong>
              <p>Total food records</p>
            </div>

            <div>
              <strong>{summary.eligibleFoodRecords ?? 0}</strong>
              <p>Eligible food records</p>
            </div>

            <div>
              <strong>{summary.activeOrganizations ?? 0}</strong>
              <p>Active organizations</p>
            </div>

            <div>
              <strong>{summary.totalMatches ?? matches.length}</strong>
              <p>Matches found</p>
            </div>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div
            style={{
              padding: '24px',
              background: '#F8FAFC',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <h4>No eligible matches available</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              The matching agent returned no matches. Food must pass the
              required safety checks before it can be considered for donation.
            </p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  <th style={{ padding: '12px' }}>Food</th>
                  <th style={{ padding: '12px' }}>Organization</th>
                  <th style={{ padding: '12px' }}>Quantity</th>
                  <th style={{ padding: '12px' }}>Match Details</th>
                </tr>
              </thead>

              <tbody>
                {matches.map((match, index) => (
                  <tr
                    key={match._id || match.id || index}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  >
                    <td style={{ padding: '14px 12px' }}>
                      {match.foodName ||
                        match.food?.foodName ||
                        match.food?.name ||
                        'Not specified'}
                    </td>

                    <td style={{ padding: '14px 12px' }}>
                      {match.organizationName ||
                        match.organization?.name ||
                        match.organization?.organizationName ||
                        match.recipientName ||
                        'Not specified'}
                    </td>

                    <td style={{ padding: '14px 12px' }}>
                      
{match.quantity != null
  ? `${match.quantity} ${match.unit || match.food?.unit || ''}`.trim()
  : match.matching?.proposedMeals != null
    ? `${match.matching.proposedMeals} meals`
    : match.proposedMeals != null
      ? `${match.proposedMeals} meals`
      : 'Not specified'}
                    </td>

                    <td style={{ padding: '14px 12px' }}>
                      {match.compatibility ||
                        match.reason ||
                        match.explanation ||
                        'Match returned by backend'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


export function DonationsPage({ appData, setAppData, addToast, navigate }) {
  const [foods, setFoods] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [foodId, setFoodId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [inventoryResponse, organizationResponse] =
          await Promise.all([getInventory(), getOrganizations()]);

        if (!cancelled) {
          setFoods(inventoryResponse.data || []);
          setOrganizations(
            (organizationResponse.data || []).filter(
              organization => organization.isActive
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          addToast(`Could not load donation options: ${error.message}`, 'error');
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const selectedFood = foods.find(food => food._id === foodId);
  const selectedOrganization = organizations.find(
    organization => organization._id === recipientId
  );

  async function handleSubmit(event) {
    event.preventDefault();

    const requestedQuantity = Number(quantity);

    if (!selectedFood || !selectedOrganization) {
      addToast('Select both a food item and a recipient.', 'error');
      return;
    }

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      addToast('Enter a quantity greater than zero.', 'error');
      return;
    }

    if (selectedFood.unit !== 'meals') {
      addToast(
        'This recipient demand is measured in meals. Select food measured in meals; no unit conversion is assumed.',
        'error'
      );
      return;
    }

    if (requestedQuantity > selectedFood.quantity) {
      addToast('Quantity exceeds the listed inventory quantity.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await createDonation({
        food: foodId,
        recipient: recipientId,
        quantity: requestedQuantity,
        notes: notes.trim(),
      });

      const donation = response.data;

      const mappedDonation = {
        id: donation._id,
        provider: donation.food?.providerName || 'Unknown provider',
        recipient: donation.recipient?.name || 'Unknown recipient',
        items: donation.food?.foodName || 'Unknown food',
        quantity: `${donation.quantity} ${donation.food?.unit || ''}`.trim(),
        date: donation.requestedAt
          ? new Date(donation.requestedAt).toLocaleString()
          : new Date().toLocaleString(),
        status: donation.status,
        deliveryStatus: donation.status,
        notes: donation.notes || '',
      };

      setAppData(previous => ({
        ...previous,
        donations: [
          mappedDonation,
          ...previous.donations.filter(item => item.id !== mappedDonation.id),
        ],
      }));

      addToast('Donation request created successfully.', 'success');
      setFoodId('');
      setRecipientId('');
      setQuantity('');
      setNotes('');
    } catch (error) {
      addToast(error.message || 'Could not create donation.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>
          Donation Lifecycle Management
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Create requests and track donations through delivery.
        </p>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: 0 }}>
          Create Donation Request
        </h3>

        {loadingOptions ? (
          <p>Loading food and recipient options...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: '16px', maxWidth: '650px' }}
          >
            <label>
              Food item
              <select
                required
                value={foodId}
                onChange={event => setFoodId(event.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px', marginTop: '6px' }}
              >
                <option value="">Select available food</option>
                {foods
                  .filter(food => food.status === 'available')
                  .map(food => (
                    <option key={food._id} value={food._id}>
                      {food.foodName} — {food.quantity} {food.unit}
                    </option>
                  ))}
              </select>
            </label>

            {selectedFood && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                Listed quantity: {selectedFood.quantity} {selectedFood.unit}.
                Safety and expiry are checked by the backend when submitting.
              </p>
            )}

            <label>
              Recipient organization
              <select
                required
                value={recipientId}
                onChange={event => setRecipientId(event.target.value)}
                style={{ display: 'block', width: '100%', padding: '10px', marginTop: '6px' }}
              >
                <option value="">Select recipient</option>
                {organizations.map(organization => (
                  <option key={organization._id} value={organization._id}>
                    {organization.name} — {organization.city}
                  </option>
                ))}
              </select>
            </label>

            {selectedOrganization && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                Requested demand: {selectedOrganization.requestedMeals ?? 0} meals.
                Choose food with compatible units.
              </p>
            )}

            <label>
              Quantity
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={quantity}
                onChange={event => setQuantity(event.target.value)}
                placeholder="Enter quantity"
                style={{ display: 'block', width: '100%', padding: '10px', marginTop: '6px' }}
              />
            </label>

            <label>
              Notes (optional)
              <textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={3}
                placeholder="Pickup instructions or additional details"
                style={{ display: 'block', width: '100%', padding: '10px', marginTop: '6px' }}
              />
            </label>

            <button type="submit" disabled={submitting || !foods.length || !organizations.length}>
              {submitting ? 'Submitting...' : 'Create Donation Request'}
            </button>
          </form>
        )}
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          overflowX: 'auto',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: 0 }}>
          Existing Donations
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <th style={{ padding: '12px' }}>Donation ID</th>
              <th style={{ padding: '12px' }}>Provider</th>
              <th style={{ padding: '12px' }}>Recipient</th>
              <th style={{ padding: '12px' }}>Items</th>
              <th style={{ padding: '12px' }}>Quantity</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {appData.donations.map((donation, index) => (
              <tr key={donation.id || index} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                <td style={{ padding: '14px 12px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  {donation.id}
                </td>
                <td style={{ padding: '14px 12px' }}>{donation.provider}</td>
                <td style={{ padding: '14px 12px' }}>{donation.recipient}</td>
                <td style={{ padding: '14px 12px' }}>{donation.items}</td>
                <td style={{ padding: '14px 12px' }}>{donation.quantity || donation.items}</td>
                <td style={{ padding: '14px 12px', fontWeight: '600' }}>{donation.status}</td>
                <td style={{ padding: '14px 12px' }}>
                  <button
                    onClick={() => navigate(`/donations/${donation.id}`)}
                    style={{ background: 'var(--light-green)', color: 'var(--primary-green)', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    View Timeline
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function DonationDetailView({
  appData,
  setAppData,
  currentRoute,
  navigate,
  addToast,
}) {
  const id = currentRoute.split('/')[2];
  const donation = appData.donations.find(d => d.id === id);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!donation) {
    return (
      <div style={{ padding: '28px' }}>
        <button
          onClick={() => navigate('/donations')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-green)',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          ← Back to Donations
        </button>
        <h2>Donation not found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          This donation could not be found in the currently loaded records.
        </p>
      </div>
    );
  }

  const status = String(donation.status || 'pending').toLowerCase();

  const nextStatus = {
    pending: { value: 'accepted', label: 'Accept Donation' },
    accepted: { value: 'preparing', label: 'Start Preparation' },
    preparing: { value: 'picked_up', label: 'Mark Picked Up' },
    picked_up: { value: 'delivered', label: 'Mark Delivered' },
  }[status];

  async function handleStatusUpdate() {
    if (!nextStatus || updatingStatus) return;

    setUpdatingStatus(true);

    try {
      const response = await updateDonation(id, {
        status: nextStatus.value,
      });

      const updated = response.data;

      setAppData(previous => ({
        ...previous,
        donations: previous.donations.map(item =>
          item.id === id
            ? {
                ...item,
                status: updated.status,
                deliveryStatus: updated.status,
                notes: updated.notes || '',
                date: updated.requestedAt
                  ? new Date(updated.requestedAt).toLocaleString()
                  : item.date,
              }
            : item
        ),
      }));

      addToast(`Donation status updated to ${updated.status}.`, 'success');
    } catch (error) {
      addToast(error.message || 'Could not update donation status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  const stages = [
    {
      step: 'Donation Request Created',
      done: true,
      time: donation.date || null,
    },
    {
      step: 'Donation Accepted',
      done: ['accepted', 'preparing', 'picked_up', 'delivered'].includes(status),
    },
    {
      step: 'Food Preparation',
      done: ['preparing', 'picked_up', 'delivered'].includes(status),
    },
    {
      step: 'Food Picked Up',
      done: ['picked_up', 'delivered'].includes(status),
    },
    {
      step: 'Successfully Delivered',
      done: status === 'delivered',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <button
        onClick={() => navigate('/donations')}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--primary-green)',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        ← Back to Donations
      </button>

      <div
        style={{
          background: '#FFFFFF',
          padding: '36px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
          Donation Timeline: {donation.id}
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}
        >
          {donation.items} from <strong>{donation.provider}</strong> to{' '}
          <strong>{donation.recipient}</strong>.
        </p>

        <p style={{ marginBottom: '28px' }}>
          Current status:{' '}
          <strong style={{ color: 'var(--primary-green)' }}>
            {status.replaceAll('_', ' ').toUpperCase()}
          </strong>
        </p>
{nextStatus && (
  <button
    type="button"
    onClick={handleStatusUpdate}
    disabled={updatingStatus}
    style={{
      background: 'var(--primary-green)',
      color: '#FFFFFF',
      border: 'none',
      padding: '12px 18px',
      borderRadius: '8px',
      fontWeight: '700',
      cursor: updatingStatus ? 'wait' : 'pointer',
      marginBottom: '24px',
    }}
  >
    {updatingStatus ? 'Updating...' : nextStatus.label}
  </button>
)}

{!nextStatus && (
  <p style={{ color: 'var(--text-secondary)' }}>
    This donation has reached a final status. No further status action is available.
  </p>
)}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            borderLeft: '2px solid var(--light-green)',
            paddingLeft: '24px',
            marginLeft: '10px',
          }}
        >
          {stages.map((stage) => (
            <div key={stage.step} style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '-31px',
                  top: '2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: stage.done ? 'var(--primary-green)' : '#cbd5cb',
                  border: '2px solid #fff',
                }}
              />

              <h4
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: stage.done
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {stage.step}
              </h4>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {stage.time || (stage.done ? 'Completed; timestamp unavailable' : 'Not yet completed')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export function LogisticsPage({ appData, navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Logistics & Fleet Operations</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Manage zero-emission vehicles, drivers, and active deliveries.</p>
      </div>

      <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Deliveries</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <th style={{ padding: '12px' }}>Delivery ID</th>
              <th style={{ padding: '12px' }}>Donation</th>
              <th style={{ padding: '12px' }}>Driver</th>
              <th style={{ padding: '12px' }}>Vehicle</th>
              <th style={{ padding: '12px' }}>Distance</th>
              <th style={{ padding: '12px' }}>ETA</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {appData.deliveries.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                 <td style={{ padding: '14px 12px' }}>
  <button
    onClick={() => navigate(`/deliveries/${d.id}`)}
    style={{
      background: 'none',
      border: 'none',
      padding: 0,
      color: 'var(--primary-green)',
      fontWeight: '700',
      cursor: 'pointer',
      textAlign: 'left',
    }}
    title="View delivery tracking"
  >
    {d.id}
  </button>
</td>
                <td style={{ padding: '14px 12px' }}>{d.donationId}</td>
                <td style={{ padding: '14px 12px', fontWeight: '700' }}>{d.driver}</td>
                <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{d.vehicle}</td>
                <td style={{ padding: '14px 12px' }}>{d.distance}</td>
                <td style={{ padding: '14px 12px', fontWeight: '700' }}>{d.eta}</td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{ background: 'var(--light-green)', color: 'var(--primary-green)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DeliveryTrackingView({ appData, currentRoute, navigate }) {
  const requestedId = (currentRoute || '').split('/')[2];

  const deliveries = appData.deliveries || [];
  const delivery = requestedId
    ? deliveries.find((item) => item.id === requestedId)
    : deliveries[0];

  const formatDate = (value) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
  };

  if (!delivery) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button
          onClick={() => navigate('/logistics')}
          style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          ← Back to Logistics
        </button>
        <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Delivery Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
            No matching delivery is available. Return to Logistics and select a delivery.
          </p>
        </div>
      </div>
    );
  }

  const status = String(delivery.status || 'unknown').replaceAll('_', ' ');
  const driverName = typeof delivery.driver === 'string'
    ? delivery.driver
    : delivery.driver?.name || 'Unassigned';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <button
        onClick={() => navigate('/logistics')}
        style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
      >
        ← Back to Logistics
      </button>

      <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
          Delivery Tracking
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Delivery information loaded from the Nourivya backend.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            ['Delivery ID', delivery.id],
            ['Status', status],
            ['Driver', driverName],
            ['Vehicle', delivery.vehicle || 'Not specified'],
            ['Pickup Address', delivery.pickupAddress || 'Not recorded'],
            ['Delivery Address', delivery.deliveryAddress || 'Not recorded'],
            ['Scheduled Pickup', formatDate(delivery.plannedPickupAt)],
            ['Picked Up At', formatDate(delivery.pickedUpAt)],
            ['Delivered At', formatDate(delivery.deliveredAt)],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '16px', background: 'var(--page-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', minWidth: 0 }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</p>
              <p style={{ fontSize: '14px', fontWeight: '700', overflowWrap: 'anywhere', textTransform: label === 'Status' ? 'capitalize' : 'none' }}>{value}</p>
            </div>
          ))}
        </div>

        {delivery.failureReason && (
          <div style={{ padding: '16px', marginBottom: '20px', borderRadius: 'var(--radius-md)', background: '#FFF1F0', border: '1px solid #F5C2C0', color: '#9B2525' }}>
            <strong>Delivery issue:</strong> {delivery.failureReason}
          </div>
        )}

        <div style={{ width: '100%', minHeight: '220px', background: 'var(--page-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', padding: '24px', textAlign: 'center' }}>
          <MapPin size={40} color="var(--primary-green)" />
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Map Preview — Simulation
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '560px' }}>
            Pickup and destination addresses are shown above. Live GPS coordinates, actual route distance, and real-time driver location are not currently provided by the backend.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AgentActivityPage({ appData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Agentic AI Architecture & Activity</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Overview of the 7 specialized autonomous agents powering ResQMeal AI.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {appData.agents.map((ag, i) => (
          <div key={i} style={{ background: '#FFFFFF', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', background: 'var(--light-green)', color: 'var(--primary-green)', padding: '4px 8px', borderRadius: '4px' }}>{ag.id}</span>
                <span style={{ 
                  fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '12px',
                  background: ag.status === 'Running' ? 'var(--light-green)' : ag.status === 'Completed' ? '#e2e8f0' : '#fef3c7',
                  color: ag.status === 'Running' ? 'var(--primary-green)' : ag.status === 'Completed' ? '#475569' : 'var(--warning-amber)'
                }}>
                  {ag.status}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{ag.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>{ag.purpose}</p>
            </div>
            <div style={{ background: 'var(--page-bg)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>LATEST DECISION:</p>
              <p style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>{ag.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function MonitoringPage({ setAppData }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadIncidents = async () => {
      try {
        const response = await getMonitoringIncidents();

        if (!active) return;

        const records = response.data || [];
        setIncidents(records);

        setAppData((prev) => ({
          ...prev,
          incidents: records
        }));

        setError("");
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load monitoring incidents."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadIncidents();

    return () => {
      active = false;
    };
  }, [setAppData]);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2>Real-Time Monitoring Center</h2>
        <p>
          Operational incidents detected from inventory, food safety,
          and delivery records.
        </p>
      </div>

      <div>
        <h3>Active Incidents ({incidents.length})</h3>

        {loading && <p>Loading incidents from the backend...</p>}

        {!loading && error && (
          <div>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && incidents.length === 0 && (
          <p>No active incidents detected. All monitored conditions are clear.</p>
        )}

        {!loading && !error && incidents.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Type</th>
                  <th>Related Donation</th>
                  <th>Detected / Updated</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td>{incident.id}</td>
                    <td>{incident.type}</td>
                    <td>{incident.donationId || "—"}</td>
                    <td>{formatDate(incident.detectedAt)}</td>
                    <td>{incident.severity}</td>
                    <td>{incident.status}</td>
                    <td>{incident.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


export function ReplanningCenter({ addToast }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDrivers, setSelectedDrivers] = useState({});
  const [approvingId, setApprovingId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProposals() {
      setLoading(true);
      setError("");

      try {
        const response = await getReplanningProposals();

        if (!response.success) {
          throw new Error("Could not load replanning proposals.");
        }

        if (!cancelled) {
          const items = response.data || [];
          setProposals(items);

          setSelectedDrivers((previous) => {
            const next = {};

            items.forEach((proposal) => {
              const previousDriver = previous[proposal.deliveryId];
              const stillEligible = proposal.candidates?.some(
                (driver) => driver.id === previousDriver
              );

              next[proposal.deliveryId] = stillEligible
                ? previousDriver
                : proposal.candidates?.[0]?.id || "";
            });

            return next;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load replanning proposals.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProposals();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleApprove = async (proposal) => {
    const deliveryId = proposal.deliveryId;
    const driverId = selectedDrivers[deliveryId];

    if (!driverId) {
      addToast("Select an eligible alternative driver first.", "error");
      return;
    }

    const selectedDriver = proposal.candidates?.find(
      (driver) => driver.id === driverId
    );

    if (!selectedDriver) {
      addToast("The selected driver is no longer eligible. Refresh proposals.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Approve reassignment for ${proposal.foodName} (${proposal.quantity} ${proposal.unit}) to ${selectedDriver.name}?\n\nThis will update the real delivery record.`
    );

    if (!confirmed) return;

    setApprovingId(deliveryId);

    try {
      const response = await approveReplanningProposal(deliveryId, driverId);

      if (!response.success) {
        throw new Error(response.message || "The backend did not approve the reassignment.");
      }

      addToast(
        `Delivery reassigned successfully to ${selectedDriver.name}.`,
        "success"
      );

      setRefreshKey((key) => key + 1);
    } catch (err) {
      addToast(
        err.message || "Could not approve the revised plan.",
        "error"
      );
      setError(err.message || "Could not approve the revised plan.");
    } finally {
      setApprovingId("");
    }
  };

  const cardStyle = {
    background: "#FFFFFF",
    padding: "28px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-color)",
    boxShadow: "var(--shadow-card)",
    minWidth: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "900" }}>
          Adaptive Replanning & Incident Management
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Review eligible fallback plans generated from actual delivery,
          donation, food inventory, and driver records.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading || Boolean(approvingId)}
          style={{
            background: "#FFFFFF",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            fontWeight: "700",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={15} style={{ marginRight: "7px", verticalAlign: "middle" }} />
          Refresh proposals
        </button>

        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {loading ? "Loading..." : `${proposals.length} eligible proposal(s)`}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "#FFF1F0",
            color: "var(--critical-red)",
            padding: "14px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid #FECACA",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "48px" }}>
          Loading real delivery proposals...
        </div>
      ) : proposals.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "52px 28px",
          }}
        >
          <CheckCircle2
            size={48}
            color="var(--emerald-accent)"
            style={{ margin: "0 auto 16px auto" }}
          />
          <h3 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px" }}>
            No Eligible Replanning Proposals
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            No failed deliveries currently meet the rules for reassignment.
            New proposals will appear when an eligible disruption is detected.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "24px" }}>
          {proposals.map((proposal) => {
            const selectedDriverId = selectedDrivers[proposal.deliveryId] || "";
            const selectedDriver = proposal.candidates?.find(
              (driver) => driver.id === selectedDriverId
            );

            return (
              <div
                key={proposal.deliveryId}
                style={{
                  ...cardStyle,
                  borderTop: "4px solid var(--critical-red)",
                }}
              >
                <div style={{ marginBottom: "20px" }}>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: "800",
                      color: "var(--critical-red)",
                      marginBottom: "8px",
                    }}
                  >
                    Disrupted Delivery
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                    Delivery ID: {proposal.deliveryId}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                    Donation ID: {proposal.donationId}
                  </p>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "12px" }}>
                    Original Delivery Details
                  </h4>

                  <p style={{ fontSize: "14px", marginBottom: "10px", overflowWrap: "anywhere" }}>
                    <strong>Food:</strong> {proposal.foodName}
                  </p>
                  <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                    <strong>Quantity:</strong> {proposal.quantity} {proposal.unit}
                  </p>
                  <p style={{ fontSize: "14px", marginBottom: "10px", overflowWrap: "anywhere" }}>
                    <strong>Pickup:</strong> {proposal.pickupAddress}
                  </p>
                  <p style={{ fontSize: "14px", marginBottom: "10px", overflowWrap: "anywhere" }}>
                    <strong>Destination:</strong> {proposal.deliveryAddress}
                  </p>
                  <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                    <strong>Status:</strong>{" "}
                    <span style={{ color: "var(--critical-red)", fontWeight: "700" }}>
                      {proposal.deliveryStatus}
                    </span>
                  </p>
                  <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                    <strong>Original driver:</strong>{" "}
                    {proposal.originalDriver?.name || "No driver assigned"}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    <strong>Food expiry:</strong>{" "}
                    {proposal.foodExpiry
                      ? new Date(proposal.foodExpiry).toLocaleString()
                      : "Not provided"}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "var(--primary-green)",
                      marginBottom: "12px",
                    }}
                  >
                    Proposed Alternative
                  </h4>

                  {proposal.candidates?.length ? (
                    <>
                      <label
                        htmlFor={`driver-${proposal.deliveryId}`}
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        Select an eligible driver
                      </label>

                      <select
                        id={`driver-${proposal.deliveryId}`}
                        value={selectedDriverId}
                        onChange={(event) =>
                          setSelectedDrivers((previous) => ({
                            ...previous,
                            [proposal.deliveryId]: event.target.value,
                          }))
                        }
                        disabled={Boolean(approvingId)}
                        style={{
                          width: "100%",
                          padding: "11px",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-sm)",
                          background: "#FFFFFF",
                          color: "var(--text-primary)",
                          marginBottom: "14px",
                        }}
                      >
                        {proposal.candidates.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} — {driver.vehicleType}, capacity{" "}
                            {driver.capacityMeals} meals
                            {driver.currentLocation
                              ? `, ${driver.currentLocation}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {selectedDriver && (
                        <div
                          style={{
                            background: "#F0FDF4",
                            padding: "14px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "13px",
                            lineHeight: 1.7,
                            marginBottom: "14px",
                          }}
                        >
                          <p><strong>Driver:</strong> {selectedDriver.name}</p>
                          <p><strong>Vehicle:</strong> {selectedDriver.vehicleType}</p>
                          <p><strong>Capacity:</strong> {selectedDriver.capacityMeals} meals</p>
                          <p><strong>Location:</strong> {selectedDriver.currentLocation || "Not provided"}</p>
                        </div>
                      )}

                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginBottom: "14px",
                        }}
                      >
                        No reassignment occurs until you approve. The backend
                        revalidates the delivery and driver before saving.
                      </p>

                      <button
                        onClick={() => handleApprove(proposal)}
                        disabled={!selectedDriverId || Boolean(approvingId)}
                        style={{
                          background: "var(--primary-green)",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "12px 18px",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: "700",
                          cursor: !selectedDriverId || approvingId ? "not-allowed" : "pointer",
                          opacity: !selectedDriverId || approvingId ? 0.65 : 1,
                          width: "100%",
                        }}
                      >
                        {approvingId === proposal.deliveryId
                          ? "Approving..."
                          : "Approve & Reassign Delivery"}
                      </button>
                    </>
                  ) : (
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      No eligible alternative drivers are currently available.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const response = await getImpactAnalytics();

        if (!response.success) {
          throw new Error("Could not load impact analytics.");
        }

        if (!cancelled) {
          setAnalytics(response.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load impact analytics.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = analytics
    ? [
        {
          label: "Total Meals Redistributed",
          value: analytics.totalMealsRedistributed.toLocaleString(),
        },
        {
          label: "CO₂ Emissions Avoided",
          value:
            analytics.co2EmissionsAvoidedTons == null
              ? "Not available"
              : `${analytics.co2EmissionsAvoidedTons} Tons`,
        },
        {
          label: "Active Provider Network",
          value: `${analytics.activeProviderNetwork} Orgs`,
        },
        {
          label: "Successful Delivery Rate",
          value:
            analytics.successfulDeliveryRate == null
              ? "Not available"
              : `${analytics.successfulDeliveryRate}%`,
        },
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "900" }}>
          Impact & Sustainability Analytics
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Impact metrics calculated from operational database records.
        </p>
      </div>

      {loading && <p>Loading live analytics...</p>}

      {!loading && error && (
        <div
          style={{
            padding: "16px",
            border: "1px solid #ef4444",
            borderRadius: "var(--radius-md)",
          }}
        >
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && analytics && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            {metrics.map(metric => (
              <div
                key={metric.label}
                style={{
                  background: "var(--card-bg)",
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "var(--shadow-subtle)",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "var(--text-secondary)",
                    marginBottom: "4px",
                  }}
                >
                  {metric.label}
                </p>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: "900",
                    color: "var(--primary-green)",
                  }}
                >
                  {metric.value}
                </h3>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "var(--card-bg)",
              padding: "20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 style={{ fontWeight: "800", marginBottom: "8px" }}>
              Delivery Performance
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {analytics.successfulDeliveries} successful deliveries out of{" "}
              {analytics.deliveryOutcomes} completed outcomes
              (delivered or failed).
            </p>
          </div>

          <div
            style={{
              background: "var(--card-bg)",
              padding: "20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 style={{ fontWeight: "800", marginBottom: "8px" }}>
              Environmental Impact
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {analytics.co2Explanation}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationsPage({ setAppData, addToast }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      const response = await getNotifications();

      if (!response.success) {
        throw new Error('Could not load notifications.');
      }

      const items = response.data || [];
      setNotifications(items);
      setAppData(prev => ({
        ...prev,
        notifications: items,
      }));
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [setAppData]);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      await loadNotifications();
      if (cancelled) {
        return;
      }
    };

    void fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      const response = await markAllNotificationsRead();

      if (!response.success) {
        throw new Error("Could not mark notifications as read.");
      }

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read: true
        }))
      );

      setAppData(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification => ({
          ...notification,
          read: true
        }))
      }));

      addToast("All notifications marked as read.", "success");
    } catch (err) {
      addToast(
        err.message || "Could not update notifications.",
        "error"
      );
    }
  };

  const formatTime = value => {
    if (!value) return "Time unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Time unavailable";
    }

    return date.toLocaleString();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px"
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "900" }}>
            System Notifications
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Operational alerts generated from your database records.
          </p>
        </div>

        <button
          onClick={markAllRead}
          disabled={loading || notifications.length === 0}
          style={{
            background: "var(--light-green)",
            color: "var(--primary-green)",
            border: "none",
            padding: "10px 20px",
            borderRadius: "var(--radius-sm)",
            fontWeight: "700",
            cursor: "pointer",
            opacity:
              loading || notifications.length === 0 ? 0.6 : 1
          }}
        >
          Mark All Read
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--text-secondary)" }}>
          Loading notifications...
        </p>
      )}

      {!loading && error && (
        <div
          style={{
            padding: "16px",
            border: "1px solid #ef4444",
            borderRadius: "var(--radius-md)"
          }}
        >
          <p>{error}</p>
          <button onClick={loadNotifications} style={{ marginTop: "10px" }}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div
          style={{
            background: "var(--card-bg)",
            padding: "24px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)"
          }}
        >
          No active operational notifications.
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notifications.map(notification => (
            <div
              key={notification._id || notification.eventKey}
              style={{
                background: "var(--card-bg)",
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                borderLeft: `5px solid ${
                  notification.read
                    ? "#cbd5cb"
                    : notification.severity === "critical"
                    ? "#dc2626"
                    : notification.severity === "warning"
                    ? "#d97706"
                    : "var(--emerald-accent)"
                }`
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "4px"
                  }}
                >
                  <h4 style={{ fontSize: "16px", fontWeight: "800" }}>
                    {notification.title}
                  </h4>

                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--page-bg)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: "700",
                      color: "var(--text-secondary)"
                    }}
                  >
                    {notification.category}
                  </span>

                  {!notification.read && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "var(--primary-green)"
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  {notification.desc}
                </p>

                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    marginTop: "6px"
                  }}
                >
                  Severity: {notification.severity || "info"}
                </p>
              </div>

              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  flexShrink: 0
                }}
              >
                {formatTime(notification.occurredAt || notification.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ user, setCurrentUser, addToast }) {
  const storageKey = 'resqmealai-settings';

  const defaults = useMemo(() => ({
    profile: {
      name: user?.name || '',
      email: user?.email || '',
      org: user?.org || ''
    },
    notifications: {
      donations: true,
      delivery: true,
      safety: true
    },
    appearance: {
      theme: 'light',
      density: 'comfortable'
    },
    food: {
      categories: ['Cooked Meals', 'Vegetables', 'Fruits'],
      pickupTime: 'Any time',
      serviceRadius: 10
    }
  }), [user?.email, user?.name, user?.org]);

  const mergeSettings = useCallback((parsed = {}) => ({
    ...defaults,
    ...parsed,
    profile: { ...defaults.profile, ...parsed.profile },
    notifications: {
      ...defaults.notifications,
      ...parsed.notifications
    },
    appearance: {
      ...defaults.appearance,
      ...parsed.appearance
    },
    food: { ...defaults.food, ...parsed.food }
  }), [defaults]);

  const loadSavedSettings = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return mergeSettings(JSON.parse(saved));
    } catch (error) {
      console.error('Could not load cached settings:', error);
    }
    return mergeSettings();
  };

  const [settings, setSettings] = useState(loadSavedSettings);
  const [savedSettings, setSavedSettings] = useState(loadSavedSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettingsFromServer() {
      try {
        const response = await getSettings();

        if (cancelled || !response.data) return;

        const loaded = mergeSettings(response.data);

// Always use the currently logged-in user's profile.
loaded.profile = {
  name: user?.name || '',
  email: user?.email || '',
  org: user?.org || '',
};

setSettings(loaded);
setSavedSettings(loaded);
        const dark = loaded.appearance.theme === 'dark';
        document.documentElement.setAttribute(
  'data-theme',
  loaded.appearance.theme
);

document.documentElement.style.setProperty(
  '--page-bg',
  dark ? '#111827' : '#F8FAFC'
);
document.documentElement.style.setProperty(
  '--card-bg',
  dark ? '#1F2937' : '#FFFFFF'
);
document.documentElement.style.setProperty(
  '--text-primary',
  dark ? '#F9FAFB' : '#17212F'
);
document.documentElement.style.setProperty(
  '--text-secondary',
  dark ? '#D1D5DB' : '#64748B'
);
document.documentElement.style.setProperty(
  '--border-color',
  dark ? '#374151' : '#E2E8F0'
);

document.body.dataset.layoutDensity = loaded.appearance.density;
        localStorage.setItem(storageKey, JSON.stringify(loaded));
      } catch (error) {
        console.error('Could not load settings from server:', error);
        if (!cancelled) {
          addToast(
            'Could not load settings from the server. Cached settings are shown.',
            'error'
          );
        }
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    }

    loadSettingsFromServer();

    return () => {
      cancelled = true;
    };
  }, [addToast, mergeSettings, user?.email, user?.name, user?.org]);

  const updateSection = (section, field, value) => {
    setSettings(previous => ({
      ...previous,
      [section]: {
        ...previous[section],
        [field]: value
      }
    }));
  };

  const updateProfile = (field, value) => {
    updateSection('profile', field, value);
  };

  const toggleCategory = category => {
    const categories = settings.food.categories;
    const updated = categories.includes(category)
      ? categories.filter(item => item !== category)
      : [...categories, category];

    updateSection('food', 'categories', updated);
  };

  const saveSettings = async event => {
    event.preventDefault();

    if (loadingSettings || savingSettings) return;

    if (
      !settings.profile.name.trim() ||
      !settings.profile.email.trim()
    ) {
      addToast('Please enter your name and email address.', 'error');
      return;
    }

    setSavingSettings(true);

    try {
      const response = await updateSettings(settings);

      if (!response.success || !response.data) {
        throw new Error('The server did not confirm the settings update.');
      }

      
const saved = mergeSettings(response.data);

// Keep the profile fields aligned with the shared app profile.
saved.profile = {
  name: settings.profile.name.trim(),
  email: settings.profile.email.trim(),
  org: settings.profile.org.trim(),
};

localStorage.setItem(storageKey, JSON.stringify(saved));
setSettings(saved);
setSavedSettings(saved);

setCurrentUser(previous => ({
  ...previous,
  name: saved.profile.name,
  email: saved.profile.email,
  org: saved.profile.org,
}));

      const dark = saved.appearance.theme === 'dark';

      document.documentElement.style.setProperty(
        '--page-bg',
        dark ? '#111827' : '#F8FAFC'
      );
      document.documentElement.style.setProperty(
        '--card-bg',
        dark ? '#1F2937' : '#FFFFFF'
      );
      document.documentElement.style.setProperty(
        '--text-primary',
        dark ? '#F9FAFB' : '#17212F'
      );
      document.documentElement.style.setProperty(
        '--text-secondary',
        dark ? '#D1D5DB' : '#64748B'
      );
      document.documentElement.style.setProperty(
        '--border-color',
        dark ? '#374151' : '#E2E8F0'
      );

      document.body.dataset.layoutDensity = saved.appearance.density;

      addToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Could not save settings:', error);
      addToast(
        error.message || 'Could not save settings. Please try again.',
        'error'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const cancelChanges = () => {
    setSettings(JSON.parse(JSON.stringify(savedSettings)));
    addToast('Unsaved changes discarded.', 'info');
  };

  const resetSettings = () => {
    setSettings(JSON.parse(JSON.stringify(savedSettings)));
    addToast('Settings restored to the last saved version.', 'info');
  };

  const sectionStyle = {
    background: 'var(--card-bg, #FFFFFF)',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-card)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    color: 'var(--text-primary, #17212F)'
  };

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg, #FFFFFF)',
    color: 'var(--text-primary, #17212F)',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '7px'
  };

  const buttonStyle = {
    padding: '12px 18px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '700',
    cursor: 'pointer',
    border: '1px solid var(--border-color)'
  };

  const role = String(user?.role || '').toLowerCase();
  const isProvider = role.includes('provider');
  const isRecipient =
    role.includes('recipient') || role.includes('ngo');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '900px',
        width: '100%',
        paddingBottom: '32px',
        color: 'var(--text-primary, #17212F)'
      }}
    >
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 8px' }}>
          System & Account Settings
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Manage your ResQMealAI profile, notifications, appearance and food rescue preferences.
        </p>
      </div>

      <form
        onSubmit={saveSettings}
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* 1. ACCOUNT & PROFILE */}
        <section style={sectionStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              1. Account & Profile
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Update your personal and organization information.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              required
              value={settings.profile.name}
              onChange={e => updateProfile('name', e.target.value)}
              style={fieldStyle}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              required
              value={settings.profile.email}
              onChange={e => updateProfile('email', e.target.value)}
              style={fieldStyle}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label style={labelStyle}>Organization Name</label>
            <input
              type="text"
              value={settings.profile.org}
              onChange={e => updateProfile('org', e.target.value)}
              style={fieldStyle}
              placeholder="Enter your organization name"
            />
          </div>
        </section>

        {/* 2. NOTIFICATIONS */}
        <section style={sectionStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              2. Notification Preferences
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Choose which alerts you want enabled.
            </p>
          </div>

          {[
            {
              key: 'donations',
              title: 'Donation Alerts',
              description: 'New donations and matching updates'
            },
            {
              key: 'delivery',
              title: 'Pickup & Delivery Updates',
              description: 'Pickup schedules and delivery status changes'
            },
            {
              key: 'safety',
              title: 'Food Expiry & Safety Alerts',
              description: 'Expiry reminders and food safety warnings'
            }
          ].map(item => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                cursor: 'pointer'
              }}
            >
              <span>
                <strong style={{ display: 'block', fontSize: '14px' }}>
                  {item.title}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.description}
                </span>
              </span>

              <input
                type="checkbox"
                checked={settings.notifications[item.key]}
                onChange={e =>
                  updateSection('notifications', item.key, e.target.checked)
                }
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-green)' }}
              />
            </label>
          ))}
        </section>

        {/* 3. FOOD RESCUE PREFERENCES */}
        <section style={sectionStyle}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
              3. Food Rescue Preferences
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Choose the food categories and collection preferences relevant to your role.
            </p>
          </div>

          {!isProvider && !isRecipient && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Administrator view: these preferences are a local demo configuration.
            </p>
          )}

          <div>
            <label style={labelStyle}>
              {isRecipient ? 'Food Categories Needed' : 'Accepted Food Categories'}
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[
                'Cooked Meals',
                'Vegetables',
                'Fruits',
                'Bakery',
                'Packaged Food',
                'Dairy'
              ].map(category => (
                <label
                  key={category}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '13px',
                    padding: '8px 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.food.categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    style={{ accentColor: 'var(--primary-green)' }}
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Preferred Pickup Time</label>
            <select
              value={settings.food.pickupTime}
              onChange={e => updateSection('food', 'pickupTime', e.target.value)}
              style={fieldStyle}
            >
              <option>Any time</option>
              <option>Morning (6 AM – 12 PM)</option>
              <option>Afternoon (12 PM – 4 PM)</option>
              <option>Evening (4 PM – 9 PM)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Service Radius: {settings.food.serviceRadius} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={settings.food.serviceRadius}
              onChange={e =>
                updateSection('food', 'serviceRadius', Number(e.target.value))
              }
              style={{ width: '100%', accentColor: 'var(--primary-green)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </section>

        {/* 4. SAVE, CANCEL & RESET */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={cancelChanges}
            style={{
              ...buttonStyle,
              background: 'var(--card-bg, #FFFFFF)',
              color: 'var(--text-primary, #17212F)'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={resetSettings}
            style={{
              ...buttonStyle,
              background: 'var(--card-bg, #FFFFFF)',
              color: 'var(--text-primary, #17212F)'
            }}
          >
            Reset to Saved
          </button>

          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: 'var(--primary-green)',
              color: '#FFFFFF',
              borderColor: 'var(--primary-green)'
            }}
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
