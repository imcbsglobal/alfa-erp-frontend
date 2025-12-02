import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    // TODO: Fetch stats from API
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    { title: 'Total Admins', value: stats.totalAdmins, icon: '👨‍💼', color: 'bg-purple-500' },
    { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { title: 'Active Users', value: stats.activeUsers, icon: '✅', color: 'bg-green-500' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: '⏳', color: 'bg-orange-500' }
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

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activities</h2>
          <div className="space-y-4">
            {[
              { user: 'Admin John', action: 'Created new user', time: '5 minutes ago', type: 'create' },
              { user: 'Admin Sarah', action: 'Updated user permissions', time: '15 minutes ago', type: 'update' },
              { user: 'Admin Mike', action: 'Deleted user account', time: '1 hour ago', type: 'delete' },
              { user: 'Admin Lisa', action: 'Assigned department access', time: '2 hours ago', type: 'assign' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'create' ? 'bg-green-100 text-green-600' :
                    activity.type === 'update' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'delete' ? 'bg-red-100 text-red-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {activity.type === 'create' && '➕'}
                    {activity.type === 'update' && '✏️'}
                    {activity.type === 'delete' && '🗑️'}
                    {activity.type === 'assign' && '🔐'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{activity.user}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}