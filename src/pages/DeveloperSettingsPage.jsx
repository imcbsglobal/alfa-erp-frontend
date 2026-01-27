import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, AlertTriangle, TrendingUp, Package, Users, Briefcase, Building2, Settings } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DeveloperSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTableStats();
  }, []);

  const loadTableStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/developer/table-stats/');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load table stats:', error);
      toast.error('Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearClick = (tableName, tableLabel) => {
    setSelectedTable({ name: tableName, label: tableLabel });
    setConfirmText('');
    setShowConfirmModal(true);
  };

  const handleConfirmClear = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      const response = await api.post('/developer/clear-data/', {
        table_name: selectedTable.name
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowConfirmModal(false);
        setSelectedTable(null);
        setConfirmText('');
        await loadTableStats();
      } else {
        toast.error(response.data.message || 'Failed to clear data');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      const errorMsg = error.response?.data?.message || 'Failed to clear data';
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const tableCategories = [
    {
      name: 'Sales & Operations',
      icon: <Package className="w-5 h-5" />,
      color: 'teal',
      tables: [
        { key: 'invoices', label: 'Invoices', description: 'All invoices and related data (items, sessions, returns)' },
        { key: 'sessions', label: 'Sessions', description: 'All picking, packing, and delivery sessions' },
        { key: 'customers', label: 'Customers', description: 'Customer records' },
        { key: 'salesmen', label: 'Salesmen', description: 'Salesman records' },
        { key: 'couriers', label: 'Couriers', description: 'Courier service providers' }
      ]
    },
    {
      name: 'Users & Organization',
      icon: <Users className="w-5 h-5" />,
      color: 'blue',
      tables: [
        { key: 'users', label: 'Users', description: 'All non-SUPERADMIN users (keeps at least one SUPERADMIN)' },
        { key: 'departments', label: 'Departments', description: 'Organization departments' },
        { key: 'job_titles', label: 'Job Titles', description: 'Job title definitions' }
      ]
    },
    {
      name: 'All Data',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'red',
      tables: [
        { key: 'all', label: 'All Data', description: 'Clear ALL data (invoices, customers, sessions, etc.)',  }
      ]
    }
  ];

  const getIcon = (key) => {
    switch (key) {
      case 'invoices': return <Package className="w-5 h-5" />;
      case 'customers': return <Users className="w-5 h-5" />;
      case 'salesmen': return <Briefcase className="w-5 h-5" />;
      case 'couriers': return <TrendingUp className="w-5 h-5" />;
      case 'users': return <Users className="w-5 h-5" />;
      case 'departments': return <Building2 className="w-5 h-5" />;
      case 'job_titles': return <Briefcase className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getColorClass = (color) => {
    const colors = {
      teal: 'from-teal-500 to-cyan-600',
      blue: 'from-blue-500 to-indigo-600',
      red: 'from-red-500 to-pink-600'
    };
    return colors[color] || colors.teal;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Developer Options</h1>
              <p className="text-white/90 text-sm">Database maintenance and data clearing tools</p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-semibold">⚠️ Caution - SUPERADMIN Only</h3>
              <p className="text-red-700 text-sm mt-1">
                These operations are irreversible and will permanently delete data from the database.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading database statistics...</p>
          </div>
        ) : stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Records</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Object.values(stats).reduce((sum, s) => sum + s.count, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Database className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Invoices</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.invoices?.count || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.users?.count || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-xl shadow p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={loadTableStats}
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>
              
              <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>

            {/* Developer Settings Section */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl shadow p-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  <h2 className="text-lg font-bold">Feature Toggles</h2>
                </div>
              </div>
              
              <div className="bg-white rounded-b-xl shadow overflow-hidden">
                <div className="p-6 space-y-4">

                  {/* Manual Picking Completion */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Manual Picking Completion</h3>
                        <p className="text-sm text-gray-600">Allow manual completion of picked bills from Picking Management</p>
                        <p className="text-xs text-gray-500 mt-1">When enabled, bills stay visible in Picking Management after being picked, with a "Complete" option for the user who picked them</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localStorage.getItem('enableManualPickingCompletion') === 'true'}
                        onChange={(e) => {
                          localStorage.setItem('enableManualPickingCompletion', e.target.checked);
                          toast.success(e.target.checked ? 'Manual picking completion enabled' : 'Manual picking completion disabled');
                          window.location.reload();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {localStorage.getItem('enableManualPickingCompletion') === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Categories */}
            {tableCategories.map((category) => (
              <div key={category.name} className="mb-6">
                <div className={`bg-gradient-to-r ${getColorClass(category.color)} text-white rounded-t-xl shadow p-4`}>
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <h2 className="text-lg font-bold">{category.name}</h2>
                  </div>
                </div>
                
                <div className="bg-white rounded-b-xl shadow overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {category.tables.map((table) => {
                      const tableStats = stats[table.key];
                      // Calculate total for "all" data key
                      const count = table.key === 'all' 
                        ? Object.values(stats).reduce((sum, s) => sum + s.count, 0)
                        : (tableStats?.count || 0);
                      
                      return (
                        <div key={table.key} className="p-4 hover:bg-gray-50 transition">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-10 h-10 ${table.danger ? 'bg-red-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
                                {getIcon(table.key)}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{table.label}</h3>
                                  {table.danger && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                      DANGER
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{table.description}</p>
                                {tableStats && table.key !== 'all' && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {tableStats.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">records</p>
                              </div>
                              
                              <button
                                onClick={() => handleClearClick(table.key, table.label)}
                                disabled={count === 0}
                                className={`px-4 py-2 ${table.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-red-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirm Data Deletion</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-semibold">⚠️ This action cannot be undone!</p>
                <p className="text-red-700 text-sm mt-1">
                  You are about to permanently delete: <strong>{selectedTable.label}</strong>
                </p>
              </div>
              
              <p className="text-gray-700 mb-4">
                Type <strong className="text-red-600">DELETE</strong> to confirm this action:
              </p>
              
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                autoFocus
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedTable(null);
                    setConfirmText('');
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClear}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperSettingsPage;
