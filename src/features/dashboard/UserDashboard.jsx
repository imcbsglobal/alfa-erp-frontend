import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    myTasks: 0,
    completedTasks: 0,
    pendingApprovals: 0,
    notifications: 0
  });

  useEffect(() => {
    // Load user-specific data
    // This is a placeholder - replace with actual data loading
    setStats({
      myTasks: 5,
      completedTasks: 12,
      pendingApprovals: 2,
      notifications: 3
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl p-8 mb-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
          <p className="text-teal-50 text-lg">
            Here's what's happening with your work today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">My Tasks</p>
                <p className="text-3xl font-bold text-gray-800">{stats.myTasks}</p>
                <p className="text-xs text-gray-500 mt-1">Active tasks</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-800">{stats.completedTasks}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Notifications</p>
                <p className="text-3xl font-bold text-gray-800">{stats.notifications}</p>
                <p className="text-xs text-gray-500 mt-1">Unread messages</p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Tasks */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">My Tasks</h2>
              <button className="text-sm text-teal-600 hover:text-teal-700 font-semibold">
                View All →
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Items */}
              {[
                { title: 'Review Q4 Sales Report', priority: 'High', dueDate: 'Today', status: 'In Progress' },
                { title: 'Update Customer Database', priority: 'Medium', dueDate: 'Tomorrow', status: 'Pending' },
                { title: 'Prepare Meeting Presentation', priority: 'High', dueDate: 'Dec 2', status: 'In Progress' },
                { title: 'Follow up with Client', priority: 'Low', dueDate: 'Dec 5', status: 'Pending' }
              ].map((task, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500" />
                    <div>
                      <p className="font-semibold text-gray-800">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          task.priority === 'High' ? 'bg-red-100 text-red-700' :
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-500">Due: {task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition font-semibold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Task
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-semibold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Submit Report
                </button>
                <button className="w-full flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-semibold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Calendar
                </button>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Notifications</h2>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm font-semibold text-gray-800">Task Assigned</p>
                  <p className="text-xs text-gray-600 mt-1">New task assigned by manager</p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </div>
                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                  <p className="text-sm font-semibold text-gray-800">Report Approved</p>
                  <p className="text-xs text-gray-600 mt-1">Your Q3 report was approved</p>
                  <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                </div>
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm font-semibold text-gray-800">Reminder</p>
                  <p className="text-xs text-gray-600 mt-1">Meeting at 3:00 PM today</p>
                  <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}