import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { getUsers } from '../../services/auth';
import api from '../../services/api';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    inProgressInvoices: 0,
    completedInvoices: 0,
    totalCustomers: 0,
    totalDepartments: 0,
    totalJobTitles: 0,
    totalCouriers: 0,
    pickingActiveSessions: 0,
    packingActiveSessions: 0,
    deliveryActiveSessions: 0,
    completedPickingSessions: 0,
    completedPackingSessions: 0,
    completedDeliverySessions: 0,
  });
  const [todayStats, setTodayStats] = useState({
    totalInvoices: 0,
    completedPicking: 0,
    completedPacking: 0,
    completedDelivery: 0,
    holdInvoices: 0,
    pendingInvoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchAllStats();
    fetchTodayStats(); // Fetch initial today's stats
    
    // Setup SSE connection for real-time updates (with slight delay to allow token refresh)
    const setupSSE = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('⚠️ No access token found, skipping SSE connection');
        return;
      }
      
      // Get base URL without /api suffix since we'll add the full path
      const baseURL = window.location.origin.includes('localhost') 
        ? 'http://localhost:8000' 
        : window.location.origin;
      const sseUrl = `${baseURL}/api/analytics/dashboard-stats-stream/?token=${token}`;
      
      console.log('🔌 Connecting to SSE:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
      };
      
      eventSource.onmessage = (event) => {
        try {
          console.log('📨 Received SSE data:', event.data);
          const data = JSON.parse(event.data);
          if (data.stats) {
            console.log('📊 Updating today stats:', data.stats);
            setTodayStats({
              totalInvoices: data.stats.totalInvoices || 0,
              completedPicking: data.stats.completedPicking || 0,
              completedPacking: data.stats.completedPacking || 0,
              completedDelivery: data.stats.completedDelivery || 0,
              holdInvoices: data.stats.holdInvoices || 0,
              pendingInvoices: data.stats.pendingInvoices || 0,
            });
          }
        } catch (error) {
          console.error('❌ Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        console.log('SSE readyState:', eventSource.readyState);
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('⚠️ SSE connection closed. Will try to reconnect...');
          // Close and retry with fresh token after 3 seconds
          setTimeout(() => {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            setupSSE();
          }, 3000);
        }
      };
    };
    
    // Setup SSE after a brief delay to ensure token is refreshed if needed
    const sseTimeout = setTimeout(setupSSE, 1000);
    
    // Setup polling for recent activity updates (every 10 seconds)
    const fetchRecentActivity = async () => {
      try {
        const [pickingHistoryRes, packingHistoryRes] = await Promise.allSettled([
          api.get('/sales/picking/history/', { params: { page_size: 4, ordering: '-created_at' } }),
          api.get('/sales/packing/history/', { params: { page_size: 4, ordering: '-created_at' } }),
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
              status: session.picking_status
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
              status: session.packing_status
            });
          });
        }

        // Sort by time and limit to 4 most recent
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        setRecentActivity(activities.slice(0, 4));
      } catch (error) {
        console.error('❌ Error fetching recent activity:', error);
      }
    };

    // Initial fetch
    fetchRecentActivity();
    
    // Poll every 10 seconds for real-time updates
    const activityInterval = setInterval(fetchRecentActivity, 10000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(sseTimeout);
      clearInterval(activityInterval);
      if (eventSourceRef.current) {
        console.log('🔌 Closing SSE connection');
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchTodayStats = async () => {
    try {
      console.log('📊 Fetching today\'s stats via REST API...');
      const response = await api.get('/analytics/dashboard-stats/');
      if (response.data.success && response.data.stats) {
        console.log('✅ Today\'s stats fetched:', response.data.stats);
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
      console.error('❌ Error fetching today\'s stats:', error);
    }
  };

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [usersRes, invoicesRes, tableStatsRes, pickingHistoryRes, packingHistoryRes, deliveryHistoryRes] = await Promise.allSettled([
        getUsers(),
        api.get('/sales/invoices/', { params: { page_size: 1000 } }),
        api.get('/developer/table-stats/'),
        api.get('/sales/picking/history/', { params: { page_size: 10, ordering: '-created_at' } }),
        api.get('/sales/packing/history/', { params: { page_size: 10, ordering: '-created_at' } }),
        api.get('/sales/delivery/history/', { params: { page_size: 10, ordering: '-created_at' } }),
      ]);

      // Process Users
      let totalAdmins = 0;
      let totalUsers = 0;
      let activeUsers = 0;
      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value?.data?.data?.results || [];
        totalAdmins = users.filter((u) => u.role === "ADMIN" || u.role === "SUPERADMIN").length;
        totalUsers = users.length;
        activeUsers = users.filter((u) => u.is_active === true).length;
      }

      // Process Invoices
      let totalInvoices = 0;
      let pendingInvoices = 0;
      let inProgressInvoices = 0;
      let completedInvoices = 0;
      if (invoicesRes.status === 'fulfilled') {
        const invoices = invoicesRes.value?.data?.results || [];
        const totalCount = invoicesRes.value?.data?.count || invoices.length;
        
        totalInvoices = totalCount;
        pendingInvoices = invoices.filter(inv => inv.status === 'PENDING').length;
        inProgressInvoices = invoices.filter(inv => 
          ['ASSIGNED', 'PICKING', 'PICKED', 'PACKING'].includes(inv.status)
        ).length;
        completedInvoices = invoices.filter(inv => 
          ['PACKED', 'DELIVERED', 'COMPLETED'].includes(inv.status)
        ).length;
        
        console.log('📊 Dashboard Invoice Stats:', {
          totalInvoices,
          pendingInvoices,
          inProgressInvoices,
          completedInvoices,
          rawData: invoices.length
        });
      }

      // Process Table Stats
      let totalCustomers = 0;
      let totalDepartments = 0;
      let totalJobTitles = 0;
      let totalCouriers = 0;
      if (tableStatsRes.status === 'fulfilled') {
        const tableStats = tableStatsRes.value?.data?.stats || {};
        totalCustomers = tableStats.customers?.count || 0;
        totalDepartments = tableStats.departments?.count || 0;
        totalJobTitles = tableStats.job_titles?.count || 0;
        totalCouriers = tableStats.couriers?.count || 0;
      }

      // Process Active Sessions
      let pickingActiveSessions = 0;
      let packingActiveSessions = 0;
      let deliveryActiveSessions = 0;
      let completedPickingSessions = 0;
      let completedPackingSessions = 0;
      let completedDeliverySessions = 0;
      
      if (pickingHistoryRes.status === 'fulfilled') {
        const sessions = pickingHistoryRes.value?.data?.results || [];
        pickingActiveSessions = sessions.filter(s => s.picking_status === 'PREPARING').length;
        completedPickingSessions = sessions.filter(s => s.picking_status === 'PICKED').length;
      }
      
      if (packingHistoryRes.status === 'fulfilled') {
        const sessions = packingHistoryRes.value?.data?.results || [];
        packingActiveSessions = sessions.filter(s => s.packing_status === 'IN_PROGRESS').length;
        completedPackingSessions = sessions.filter(s => s.packing_status === 'PACKED').length;
      }
      
      if (deliveryHistoryRes.status === 'fulfilled') {
        const sessions = deliveryHistoryRes.value?.data?.results || [];
        deliveryActiveSessions = sessions.filter(s => s.delivery_status === 'IN_TRANSIT').length;
        completedDeliverySessions = sessions.filter(s => s.delivery_status === 'DELIVERED').length;
      }

      setStats({
        totalAdmins,
        totalUsers,
        activeUsers,
        pendingApprovals: 0,
        totalInvoices,
        pendingInvoices,
        inProgressInvoices,
        completedInvoices,
        totalCustomers,
        totalDepartments,
        totalJobTitles,
        totalCouriers,
        pickingActiveSessions,
        packingActiveSessions,
        deliveryActiveSessions,
        completedPickingSessions,
        completedPackingSessions,
        completedDeliverySessions,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Invoice Management',
      description: 'View all invoices',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-teal-400 to-teal-600',
      action: () => navigate('/invoices')
    },
    {
      title: 'User Management',
      description: 'Manage all users',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-orange-400 to-orange-600',
      action: () => navigate('/user-management')
    },
    {
      title: 'Create User',
      description: 'Add new user',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: 'from-blue-400 to-blue-600',
      action: () => navigate('/add-user?action=create-user')
    },
    {
      title: 'Packing Management',
      description: 'View packing operations',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'from-purple-400 to-purple-600',
      action: () => navigate('/packing/invoices')
    },
    {
      title: 'Delivery Dispatch',
      description: 'Manage deliveries',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      color: 'from-green-400 to-green-600',
      action: () => navigate('/delivery/dispatch')
    },
    {
      title: 'User Control',
      description: 'Manage permissions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'from-pink-400 to-pink-600',
      action: () => navigate('/user-control')
    },
    {
      title: 'Master Data',
      description: 'Manage departments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'from-indigo-400 to-indigo-600',
      action: () => navigate('/master/department')
    },
    {
      title: 'History',
      description: 'View history logs',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-yellow-400 to-yellow-600',
      action: () => navigate('/history')
    }
  ];

  // Overview Stats Cards - Top Row (Real-time updates for today)
  const overviewCards = [
    {
      title: 'HOLD INVOICES',
      value: loading ? '...' : todayStats.holdInvoices,
      icon: (
        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-amber-400 to-orange-500',
      onClick: () => navigate('/invoices/pending'),
    },
    {
      title: 'TODAYS INVOICES',
      value: loading ? '...' : todayStats.totalInvoices,
      icon: (
        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-blue-600',
      onClick: () => navigate('/history/invoice-report'),
    },
    {
      title: 'COMPLETED PICKING',
      value: loading ? '...' : todayStats.completedPicking,
      icon: (
        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-teal-400 to-cyan-600',
      onClick: () => navigate('/history/picking-report'),
    },
    {
      title: 'COMPLETED PACKING',
      value: loading ? '...' : todayStats.completedPacking,
      icon: (
        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      gradient: 'from-purple-500 to-violet-600',
      onClick: () => navigate('/history/packing-report'),
    },
    {
      title: 'COMPLETED DELIVERY',
      value: loading ? '...' : todayStats.completedDelivery,
      icon: (
        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      gradient: 'from-pink-500 to-rose-600',
    },
  ];


  // User & System Stats
  const userSystemCards = [
    { 
      title: 'Total Users', 
      value: loading ? '...' : stats.totalUsers, 
      icon: '👥', 
      color: 'bg-blue-500',
      onClick: () => navigate('/user-management')
    },
    { 
      title: 'Total Admins', 
      value: loading ? '...' : stats.totalAdmins, 
      icon: '👨‍💼', 
      color: 'bg-purple-500',
      onClick: () => navigate('/user-management')
    },
    { 
      title: 'Active Users', 
      value: loading ? '...' : stats.activeUsers, 
      icon: '✔️', 
      color: 'bg-green-500'
    },
    { 
      title: 'Total Customers', 
      value: loading ? '...' : stats.totalCustomers, 
      icon: '🏢', 
      color: 'bg-teal-500'
    }
  ];

  // Operational Stats
  const operationalCards = [
    { 
      title: 'Active Picking', 
      value: loading ? '...' : stats.pickingActiveSessions, 
      icon: '🔍',
      color: 'bg-indigo-500',
      onClick: () => navigate('/invoices')
    },
    { 
      title: 'Active Packing', 
      value: loading ? '...' : stats.packingActiveSessions, 
      icon: '📦',
      color: 'bg-purple-500',
      onClick: () => navigate('/packing/invoices')
    },
    { 
      title: 'Active Delivery', 
      value: loading ? '...' : stats.deliveryActiveSessions, 
      icon: '🚚',
      color: 'bg-green-500',
      onClick: () => navigate('/delivery/dispatch')
    },
    { 
      title: 'Total Couriers', 
      value: loading ? '...' : stats.totalCouriers, 
      icon: '🏍️', 
      color: 'bg-orange-500',
      onClick: () => navigate('/master/courier')
    }
  ];

  // Master Data Stats
  const masterDataCards = [
    { 
      title: 'Departments', 
      value: loading ? '...' : stats.totalDepartments, 
      icon: '🏢',
      color: 'bg-cyan-500',
      onClick: () => navigate('/master/department')
    },
    { 
      title: 'Job Titles', 
      value: loading ? '...' : stats.totalJobTitles, 
      icon: '💼',
      color: 'bg-pink-500',
      onClick: () => navigate('/master/job-title')
    },
    { 
      title: 'Courier Services', 
      value: loading ? '...' : stats.totalCouriers, 
      icon: '📮',
      color: 'bg-amber-500',
      onClick: () => navigate('/master/courier')
    },
    { 
      title: 'System Health', 
      value: '100%', 
      icon: '💚',
      color: 'bg-emerald-500'
    }
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
                onClick={fetchAllStats}
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
        {/* Invoice Overview - Top Priority */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Session Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
            {overviewCards.map((stat, index) => (
              <div
                key={index}
                onClick={stat.onClick}
                className={`
                  bg-gradient-to-br ${stat.gradient}
                  rounded-2xl shadow-lg p-5
                  flex flex-col gap-3
                  relative overflow-hidden
                  transition-all duration-200
                  hover:shadow-2xl hover:scale-[1.03]
                  ${stat.onClick ? 'cursor-pointer' : ''}
                `}
              >
                {/* Top row: label left, icon right */}
                <div className="flex items-start justify-between">
                  <p className="text-white/90 text-xs font-bold tracking-widest uppercase leading-tight">
                    {stat.title}
                  </p>
                  {/* Icon badge */}
                  <div className="bg-white/20 rounded-xl p-2 text-white flex-shrink-0">
                    {stat.icon}
                  </div>
                </div>

                {/* Large number */}
                <p className="text-white text-5xl leading-none tracking-tight">
                  {stat.value}
                </p>

                {/* Decorative bottom strip */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl" />

                {/* Subtle decorative circle */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Layout for Medium to Large Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Left Column - Stats */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* User & System Stats */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span> User & System
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {userSystemCards.map((stat, index) => (
                  <div 
                    key={index} 
                    onClick={stat.onClick}
                    className={`bg-white rounded-xl shadow-md p-4 hover:shadow-xl transition-all ${stat.onClick ? 'cursor-pointer transform hover:-translate-y-1' : ''} relative overflow-hidden`}
                  >
                    <div className="flex flex-col items-center text-center relative z-10">
                      <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                        {stat.icon}
                      </div>
                      <p className="text-gray-600 text-xs mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                      
                      {/* Mini progress bar at bottom */}
                      {!loading && stats.totalUsers > 0 && index < 3 && (
                        <div className="w-full mt-2">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${stat.color} rounded-full transition-all duration-1000`}
                              style={{ 
                                width: `${index === 0 ? 100 : index === 1 ? (stats.totalAdmins / stats.totalUsers) * 100 : (stats.activeUsers / stats.totalUsers) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Decorative background circle */}
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-gray-50 rounded-full opacity-50"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Data Stats */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">📁</span> Master Data
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {masterDataCards.map((stat, index) => (
                  <div 
                    key={index}
                    onClick={stat.onClick}
                    className={`bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-4 hover:shadow-xl transition-all ${stat.onClick ? 'cursor-pointer transform hover:-translate-y-1' : ''} border border-gray-100`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 shadow-md`}>
                        {stat.icon}
                      </div>
                      <p className="text-gray-600 text-xs mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                      
                      {/* Visual indicator bars */}
                      {index < 3 && !loading && (
                        <div className="w-full mt-2 flex gap-1 justify-center">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i}
                              className={`w-1 rounded-full transition-all duration-300 ${
                                i < 3 ? stat.color.replace('bg-', 'bg-') : 'bg-gray-200'
                              }`}
                              style={{ height: `${8 + i * 2}px` }}
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🕒</span> Recent Activity
            </h2>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-4 sm:p-6 max-h-[600px] overflow-y-auto border border-gray-100">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3 relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500 via-teal-300 to-transparent"></div>
                  
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      className="relative pl-12 pr-2 py-3 hover:bg-white/60 transition-colors rounded-lg group"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-md group-hover:scale-125 transition-transform border-2 border-white"></div>
                      
                      {/* Pulse animation for recent items */}
                      {index === 0 && (
                        <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-teal-400 animate-ping opacity-75"></div>
                      )}
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              activity.type === 'picking' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}></span>
                            {activity.user}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{activity.action}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              activity.status === 'COMPLETED' || activity.status === 'PICKED' || activity.status === 'PACKED' || activity.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : activity.status === 'IN_PROGRESS' || activity.status === 'PREPARING' || activity.status === 'IN_TRANSIT'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {activity.status ? activity.status.replace(/_/g, ' ') : 'Unknown'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              activity.type === 'picking' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
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

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
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
    </div>
  );
}