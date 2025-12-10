import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { getUsers } from '../../services/auth';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    setStats(prev => ({
      ...prev,
      pendingInvoices: 12,
      pickedInvoices: 8,
      readyForPacking: 5,
      completedInvoices: 20
    }));
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await getUsers();
      const users = response.data.results;

      // Calculate stats from actual user data
      const totalAdmins = users.filter(
        (u) => u.role === "ADMIN" || u.role === "SUPERADMIN"
      ).length;

      const totalUsers = users.length;

      const activeUsers = users.filter((u) => u.is_active === true).length;

      // You can calculate pending approvals based on your logic
      // For now, setting it to 0 as there's no such field in the user data
      const pendingApprovals = 0;

      setStats({
        totalAdmins,
        totalUsers,
        activeUsers,
        pendingApprovals
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create Admin',
      description: 'Add new administrator',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      color: 'from-purple-400 to-purple-600',
      action: () => navigate('/add-user?action=create-admin')
    },
    {
      title: 'Create User',
      description: 'Add new user',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-blue-400 to-blue-600',
      action: () => navigate('/add-user?action=create-user')
    },
    {
      title: 'User Control',
      description: 'Manage user permissions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'from-teal-400 to-teal-600',
      action: () => navigate('/user-control')
    },
    {
      title: 'View All Users',
      description: 'Manage all users',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-orange-400 to-orange-600',
      action: () => navigate('/user-management')
    }
  ];

  const statCards = [
    { 
      title: 'Total Users', 
      value: loading ? '...' : stats.totalUsers, 
      icon: '👥', 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Total Admins', 
      value: loading ? '...' : stats.totalAdmins, 
      icon: '👨‍💼', 
      color: 'bg-purple-500' 
    },
    { 
      title: 'Active Users', 
      value: loading ? '...' : stats.activeUsers, 
      icon: '✅', 
      color: 'bg-green-500' 
    },
    { 
      title: 'Pending Approvals', 
      value: loading ? '...' : stats.pendingApprovals, 
      icon: '⏳', 
      color: 'bg-orange-500' 
    },

    // NEW INVOICE RELATED CARDS
    { 
      title: 'Pending Invoices', 
      value: stats.pendingInvoices || 0, 
      icon: '📄',
      color: 'bg-yellow-500' 
    },
    { 
      title: 'Picked Invoices', 
      value: stats.pickedInvoices || 0, 
      icon: '📦',
      color: 'bg-teal-500' 
    },
    { 
      title: 'Ready for Packing', 
      value: stats.readyForPacking || 0, 
      icon: '🎁',
      color: 'bg-cyan-500' 
    },
    { 
      title: 'Completed Invoices', 
      value: stats.completedInvoices || 0, 
      icon: '✔️',
      color: 'bg-green-600' 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-teal-50">Welcome back, {user?.name || 'Super Admin'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-14 h-14 rounded-full flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{action.title}</h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}