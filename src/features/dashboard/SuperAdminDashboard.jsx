import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { getUsers } from '../../services/auth';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    inProgressInvoices: 0,
    completedInvoices: 0,
  });
  const [todayStats, setTodayStats] = useState({
    totalInvoices: 0,
    completedPicking: 0,
    completedPacking: 0,
    completedDelivery: 0,
    holdInvoices: 0,
    pendingInvoices: 0,
  });
  const [breakdown, setBreakdown] = useState({
    picking: { completed: 0, preparing: 0, pending: 0 },
    packing: { completed: 0, preparing: 0, pending: 0 },
    delivery: { completed: 0, preparing: 0, pending: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchAllStats();
    fetchTodayStats();
    fetchBreakdown();

    const setupSSE = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const baseURL = window.location.origin.includes('localhost')
        ? 'http://localhost:8000'
        : window.location.origin;
      const sseUrl = `${baseURL}/api/analytics/dashboard-stats-stream/?token=${token}`;

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stats) {
            setTodayStats({
              totalInvoices: data.stats.totalInvoices || 0,
              completedPicking: data.stats.completedPicking || 0,
              completedPacking: data.stats.completedPacking || 0,
              completedDelivery: data.stats.completedDelivery || 0,
              holdInvoices: data.stats.holdInvoices || 0,
              pendingInvoices: data.stats.pendingInvoices || 0,
            });
            // Also refresh breakdown on SSE update
            fetchBreakdown();
          }
        } catch (error) {
          console.error('❌ Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          setTimeout(() => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            setupSSE();
          }, 3000);
        }
      };
    };

    const sseTimeout = setTimeout(setupSSE, 1000);

    // Poll breakdown every 10s for live feel
    const breakdownInterval = setInterval(fetchBreakdown, 5000);

    const fetchRecentActivity = async () => {
      try {
        const [pickingHistoryRes, packingHistoryRes] = await Promise.allSettled([
          api.get('/sales/picking/history/', { params: { page_size: 5, ordering: '-created_at' } }),
          api.get('/sales/packing/history/', { params: { page_size: 5, ordering: '-created_at' } }),
        ]);

        const activities = [];

        if (pickingHistoryRes.status === 'fulfilled') {
          const sessions = pickingHistoryRes.value?.data?.results || [];
          sessions.forEach(session => {
            activities.push({
              type: 'picking',
              user: session.picker_name || 'Unknown',
              action: session.picking_status === 'PICKED' ? 'Completed picking' : 'Started picking',
              time: session.end_time || session.start_time || session.created_at,
              status: session.picking_status,
            });
          });
        }

        if (packingHistoryRes.status === 'fulfilled') {
          const sessions = packingHistoryRes.value?.data?.results || [];
          sessions.forEach(session => {
            activities.push({
              type: 'packing',
              user: session.packer_name || 'Unknown',
              action: session.packing_status === 'PACKED' ? 'Completed packing' : 'Started packing',
              time: session.end_time || session.start_time || session.created_at,
              status: session.packing_status,
            });
          });
        }

        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error('❌ Error fetching recent activity:', error);
      }
    };

    fetchRecentActivity();
    const activityInterval = setInterval(fetchRecentActivity, 10000);

    return () => {
      clearTimeout(sseTimeout);
      clearInterval(activityInterval);
      clearInterval(breakdownInterval);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const fetchBreakdown = async () => {
    try {
      const response = await api.get('/analytics/status-breakdown/');
      if (response.data.success && response.data.breakdown) {
        setBreakdown(response.data.breakdown);
      }
    } catch (error) {
      console.error('❌ Error fetching breakdown:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await api.get('/analytics/dashboard-stats/');
      if (response.data.success && response.data.stats) {
        setTodayStats({
          totalInvoices: response.data.stats.totalInvoices || 0,
          completedPicking: response.data.stats.completedPicking || 0,
          completedPacking: response.data.stats.completedPacking || 0,
          completedDelivery: response.data.stats.completedDelivery || 0,
          holdInvoices: response.data.stats.holdInvoices || 0,
          pendingInvoices: response.data.stats.pendingInvoices || 0,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching today's stats:", error);
    }
  };

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const [usersRes, invoicesRes] = await Promise.allSettled([
        getUsers(),
        api.get('/sales/invoices/', { params: { page_size: 1000 } }),
      ]);

      let totalAdmins = 0, totalUsers = 0, activeUsers = 0;
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value?.data?.data?.results || [];
        totalAdmins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length;
        totalUsers = users.length;
        activeUsers = users.filter(u => u.is_active === true).length;
      }

      let totalInvoices = 0, pendingInvoices = 0, inProgressInvoices = 0, completedInvoices = 0;
      if (invoicesRes.status === 'fulfilled') {
        const invoices = invoicesRes.value?.data?.results || [];
        totalInvoices = invoicesRes.value?.data?.count || invoices.length;
        pendingInvoices = invoices.filter(inv => inv.status === 'PENDING').length;
        inProgressInvoices = invoices.filter(inv => ['ASSIGNED', 'PICKING', 'PICKED', 'PACKING'].includes(inv.status)).length;
        completedInvoices = invoices.filter(inv => ['PACKED', 'DELIVERED', 'COMPLETED'].includes(inv.status)).length;
      }

      setStats({ totalAdmins, totalUsers, activeUsers, totalInvoices, pendingInvoices, inProgressInvoices, completedInvoices });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Donut Chart Component ──────────────────────────────────────────────────
  const formatCount = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };

  const DonutChart = ({ title, data }) => {
    const total = data.completed + data.preparing + data.pending;
    const COLORS = {
      completed: '#10b981', // emerald
      preparing: '#f59e0b', // amber
      pending: '#8b5cf6',   // violet
    };
    const LABELS = { completed: 'Completed', preparing: 'Preparing', pending: 'Pending' };

    // SVG donut math
    const cx = 60, cy = 60, r = 44, strokeWidth = 14;
    const circumference = 2 * Math.PI * r;

    const segments = [
      { key: 'completed', value: data.completed, color: COLORS.completed },
      { key: 'preparing', value: data.preparing, color: COLORS.preparing },
      { key: 'pending', value: data.pending, color: COLORS.pending },
    ].filter(s => s.value > 0);

    let offset = 0;
    const arcs = segments.map(seg => {
      const fraction = total > 0 ? seg.value / total : 0;
      const dashArray = circumference * fraction;
      const dashOffset = -(offset * circumference);
      offset += fraction;
      return { ...seg, dashArray, dashOffset };
    });

    const isEmpty = total === 0;

    return (
      <div
        className="bg-white rounded-2xl shadow-md p-5 border border-gray-100"
      >
        <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide uppercase">{title}</h3>

        <div className="flex items-center gap-4">
          {/* SVG Donut */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {isEmpty ? (
                <circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                />
              ) : (
                arcs.map(arc => (
                  <circle
                    key={arc.key}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arc.dashArray} ${circumference}`}
                    strokeDashoffset={arc.dashOffset}
                    strokeLinecap="butt"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: `${cx}px ${cy}px`,
                      transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease',
                    }}
                  />
                ))
              )}
            </svg>
          </div>

          {/* Legend + Values */}
          <div className="flex flex-col gap-2 flex-1">
            {Object.entries(COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600 font-medium">{LABELS[key]}</span>
                </div>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color }}
                >
                  {formatCount(data[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const overviewCards = [
    {
      title: 'HOLD INVOICES',
      value: loading ? '...' : todayStats.holdInvoices,
      icon: (<svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
      gradient: 'from-amber-400 to-orange-500',
      onClick: () => navigate('/invoices/pending'),
    },
    {
      title: 'TODAYS INVOICES',
      value: loading ? '...' : todayStats.totalInvoices,
      icon: (<svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
      gradient: 'from-indigo-500 to-blue-600',
      onClick: () => navigate('/history/invoice-report'),
    },
    {
      title: 'COMPLETED PICKING',
      value: loading ? '...' : todayStats.completedPicking,
      icon: (<svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
      gradient: 'from-teal-400 to-cyan-600',
      onClick: () => navigate('/history/picking-report'),
    },
    {
      title: 'COMPLETED PACKING',
      value: loading ? '...' : todayStats.completedPacking,
      icon: (<svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>),
      gradient: 'from-purple-500 to-violet-600',
      onClick: () => navigate('/history/packing-report'),
    },
    {
      title: 'COMPLETED DELIVERY',
      value: loading ? '...' : todayStats.completedDelivery,
      icon: (<svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>),
      gradient: 'from-pink-500 to-rose-600',
    },
  ];

  const quickActions = [
    { title: 'Invoice Management', description: 'View all invoices', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>), color: 'from-teal-400 to-teal-600', action: () => navigate('/invoices') },
    { title: 'User Management', description: 'Manage all users', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>), color: 'from-orange-400 to-orange-600', action: () => navigate('/user-management') },
    { title: 'Create User', description: 'Add new user', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>), color: 'from-blue-400 to-blue-600', action: () => navigate('/add-user?action=create-user') },
    { title: 'Packing Management', description: 'View packing operations', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>), color: 'from-purple-400 to-purple-600', action: () => navigate('/packing/invoices') },
    { title: 'Delivery Dispatch', description: 'Manage deliveries', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>), color: 'from-green-400 to-green-600', action: () => navigate('/delivery/dispatch') },
    { title: 'User Control', description: 'Manage permissions', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>), color: 'from-pink-400 to-pink-600', action: () => navigate('/user-control') },
    { title: 'Master Data', description: 'Manage departments', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>), color: 'from-indigo-400 to-indigo-600', action: () => navigate('/master/department') },
    { title: 'History', description: 'View history logs', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), color: 'from-yellow-400 to-yellow-600', action: () => navigate('/history') },
  ];

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 text-white py-6 sm:py-8 px-4 sm:px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-teal-50 text-sm sm:text-base">Welcome back, {user?.name || 'Super Admin'}</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => { fetchAllStats(); fetchTodayStats(); fetchBreakdown(); }}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Session Overview */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Session Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
            {overviewCards.map((stat, index) => (
              <div
                key={index}
                onClick={stat.onClick}
                className={`bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-200 hover:shadow-2xl hover:scale-[1.03] ${stat.onClick ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-white/90 text-xs font-bold tracking-widest uppercase leading-tight">{stat.title}</p>
                  <div className="bg-white/20 rounded-xl p-2 text-white flex-shrink-0">{stat.icon}</div>
                </div>
                <p className="text-white text-5xl leading-none tracking-tight">{stat.value}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl" />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">

            {/* ── Status Breakdown ── */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">📈</span> Status Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DonutChart
                  title="Picking Status"
                  data={breakdown.picking}
                />
                <DonutChart
                  title="Packing Status"
                  data={breakdown.packing}
                />
                <DonutChart
                  title="Delivery Status"
                  data={breakdown.delivery}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Quick Actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">{action.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🕒</span> Recent Activity
            </h2>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-4 sm:p-6 max-h-[600px] overflow-y-auto border border-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent" />
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3 relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500 via-teal-300 to-transparent" />
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="relative pl-12 pr-2 py-3 hover:bg-white/60 transition-colors rounded-lg group">
                      <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-md group-hover:scale-125 transition-transform border-2 border-white" />
                      {index === 0 && (
                        <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-teal-400 animate-ping opacity-75" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${activity.type === 'picking' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                            {activity.user}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{activity.action}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              ['COMPLETED', 'PICKED', 'PACKED', 'DELIVERED'].includes(activity.status)
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : ['IN_PROGRESS', 'PREPARING', 'IN_TRANSIT'].includes(activity.status)
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {activity.status ? activity.status.replace(/_/g, ' ') : 'Unknown'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${activity.type === 'picking' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {activity.type === 'picking' ? '📦 Pick' : '🎁 Pack'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap font-medium">{formatTime(activity.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                    <span className="text-3xl">📭</span>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">Activities will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}