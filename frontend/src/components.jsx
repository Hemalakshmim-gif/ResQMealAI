import React from 'react';
import { 
  Leaf, ShieldCheck, Truck, BarChart3, Users, Bell, Search, Settings, 
  ChevronRight, ArrowRight, Menu, X, Plus, Filter, AlertTriangle, CheckCircle2, 
  Clock, MapPin, Activity, RefreshCw, Eye, Edit, Trash2, Send, Check, 
  User, LogOut, Lock, Mail, Phone, Building, Globe, Zap, Database, Cpu, 
  Layers, ArrowUpRight, TrendingUp, AlertCircle, Play, Download, HelpCircle,
  CheckSquare, XCircle, Compass, Radio, Server
} from 'lucide-react';

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'U';
    
export function Sidebar({ currentRoute, navigate, collapsed, setCollapsed, userRole, user, unreadCount }) {
  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { label: 'Admin Dashboard', path: '/admin/dashboard', icon: BarChart3, roles: ['admin'] },
        { label: 'Provider Dashboard', path: '/provider/dashboard', icon: Building, roles: ['admin', 'provider'] },
        { label: 'Recipient Dashboard', path: '/recipient/dashboard', icon: Users, roles: ['admin', 'recipient'] }
      ]
    },
    {
      title: 'Food & Operations',
      items: [
        { label: 'Inventory', path: '/provider/inventory', icon: Database, roles: ['admin', 'provider'] },
        { label: 'Surplus Predictions', path: '/provider/predictions', icon: TrendingUp, roles: ['admin', 'provider'] },
        { label: 'Food Safety', path: '/provider/safety', icon: ShieldCheck, roles: ['admin', 'provider'] },
        { label: 'Recipient Matching', path: '/matching', icon: Cpu, roles: ['admin', 'provider', 'recipient'] },
        { label: 'Donations', path: '/donations', icon: Layers, roles: ['admin', 'provider', 'recipient'] }
      ]
    },
    {
      title: 'Logistics & AI Agents',
      items: [
        { label: 'Logistics & Fleet', path: '/logistics', icon: Truck, roles: ['admin'] },
        { label: 'Agent Activity', path: '/agents', icon: Activity, roles: ['admin'] },
        { label: 'Monitoring Center', path: '/monitoring', icon: Radio, roles: ['admin'] },
        { label: 'Replanning Center', path: '/replanning', icon: Zap, roles: ['admin'] }
      ]
    },
    {
      title: 'System & Reports',
      items: [
        { label: 'Impact Analytics', path: '/analytics', icon: Globe, roles: ['admin', 'provider', 'recipient'] },
        { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount, roles: ['admin', 'provider', 'recipient'] },
        { label: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'provider', 'recipient'] }
      ]
    }
  ];

  return (
    <div style={{
      width: collapsed ? '80px' : '340px',
      minWidth: collapsed ? '88px' : '260px',
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 10
    }}>
      <div
  style={{
  padding: collapsed ? '16px 8px' : '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  borderBottom: '1px solid var(--border-color)',
  minHeight: '82px',
  position: 'relative'
}}
>
        <div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    minWidth: 0
  }}
  onClick={() => navigate('/')}
>
          

<div
  style={{
    width: collapsed ? '64px' : '76px',
    height: collapsed ? '64px' : '76px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }}
>
  <img
    src="/resqmeal-icon.png"
    alt="ResQMealAI"
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      display: 'block'
    }}
  />
</div>


          {!collapsed && (
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-green)', letterSpacing: '-0.3px' }}>ResQMealAI</h1>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.2px' }}>Rescue Food. Redirect Hope.</p>
            </div>
          )}
        </div>
       <button
  onClick={() => setCollapsed(!collapsed)}
  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '6px',
    position: collapsed ? 'absolute' : 'static',
    right: collapsed ? '4px' : 'auto',
    top: collapsed ? '4px' : 'auto',
  }}
>
          <Menu size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {menuGroups.map((group, idx) => {
          const filteredItems = group.items.filter(item => item.roles.includes(userRole));
          if (filteredItems.length === 0) return null;
          return (
            <div key={idx} style={{ marginBottom: '20px' }}>
              {!collapsed && (
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', padding: '0 12px 8px 12px', letterSpacing: '0.5px' }}>
                  {group.title}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredItems.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.path;
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(item.path)}
                      title={collapsed ? item.label : ''}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        background: isActive ? 'var(--light-green)' : 'transparent',
                        color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '14px',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      <Icon size={18} style={{ minWidth: '18px', color: isActive ? 'var(--primary-green)' : 'var(--text-secondary)' }} />
                      {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
                      {!collapsed && item.badge > 0 && (
                        <span style={{ background: 'var(--critical-red)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      
<div
  style={{
    padding: collapsed ? '12px 0 12px 10px' : '16px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'flex-start' : 'flex-start',
    gap: collapsed ? '0' : '12px',
    overflow: 'hidden',
    background: '#fafafa',
    minHeight: '72px',
    position: 'relative',
    flexShrink: 0
  }}
>

        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>
          {getInitials(user?.name)}
        </div>
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
  {user?.name || 'User'}
</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{userRole} Mode</p>
          </div>
        )}
        
<button
  onClick={() => navigate('/login')}
  title="Log out"
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    flexShrink: 0,
    position: collapsed ? 'absolute' : 'static',
    right: collapsed ? '4px' : 'auto'
  }}
>
  <LogOut size={16} />
</button>
      </div>
    </div>
  );
}


export function Topbar({ currentRoute, navigate, user, userRole, setUserRole, searchQuery, setSearchQuery, unreadCount }) {
  const getPageTitle = () => {
    if (currentRoute === '/admin/dashboard') return 'Admin Operations Center';
    if (currentRoute === '/provider/dashboard') return 'Food Provider Dashboard';
    if (currentRoute === '/provider/inventory') return 'Inventory Management';
    if (currentRoute === '/provider/predictions') return 'Surplus AI Predictions';
    if (currentRoute === '/provider/safety') return 'Food Safety & Quality Assessment';
    if (currentRoute === '/recipient/dashboard') return 'Recipient Organization Hub';
    if (currentRoute === '/recipient/requirements') return 'Recipient Requirements & Capacities';
    if (currentRoute === '/matching') return 'AI Recipient Matching Matrix';
    if (currentRoute === '/donations') return 'Donation Lifecycle Management';
    if (currentRoute === '/logistics') return 'Logistics & Fleet Operations';
    if (currentRoute === '/agents') return 'Agentic AI Architecture & Activity';
    if (currentRoute === '/monitoring') return 'Real-Time Monitoring Center';
    if (currentRoute === '/replanning') return 'Adaptive Replanning & Incident Management';
    if (currentRoute === '/analytics') return 'Impact & Sustainability Analytics';
    if (currentRoute === '/notifications') return 'System Notifications';
    if (currentRoute === '/settings') return 'System & Account Settings';
    return 'Dashboard';
  };

  return (
    <div style={{
      height: '70px',
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      zIndex: 5
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{getPageTitle()}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ResQMeal AI — Rescue Food. Redirect Hope.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--page-bg)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Role:</span>
          
<select
  value={userRole}
  onChange={(e) => {
    const role = e.target.value;
    setUserRole(role);

    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'provider') navigate('/provider/dashboard');
    else if (role === 'recipient') navigate('/recipient/dashboard');
  }}
  style={{
    background: 'transparent',
    border: 'none',
    fontWeight: '700',
    fontSize: '13px',
    color: 'var(--primary-green)',
    cursor: 'pointer',
    outline: 'none'
  }}
>
  <option value="admin">Administrator</option>
  <option value="provider">Food Provider</option>
  <option value="recipient">Recipient NGO</option>
</select>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--light-green)', padding: '6px 12px', borderRadius: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald-accent)', display: 'inline-block', boxShadow: '0 0 8px var(--emerald-accent)' }}></span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-green)' }}>7 Agents Active</span>
        </div>

        <button onClick={() => navigate('/notifications')} style={{ position: 'relative', background: 'none', border: '1px solid var(--border-color)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--critical-red)', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
              {unreadCount}
            </span>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary-green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
            {getInitials(user?.name)}
          </div>
        </div>
      </div>
    </div>
  );
}
