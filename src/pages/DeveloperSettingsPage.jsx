import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, AlertTriangle, TrendingUp, Package, Users, Briefcase, Building2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/AuthContext';

const DeveloperSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    console.log('👤 Current user:', user);
    console.log('🔑 Access token exists:', !!localStorage.getItem('access_token'));
    loadTableStats();
  }, []);

  const loadTableStats = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching table stats from:', '/developer/table-stats/');
      const response = await api.get('/developer/table-stats/');
      console.log('✅ Table stats response:', response.data);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('❌ Failed to load table stats:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Unauthorized: Only SUPERADMIN can access developer settings. Please ensure you are logged in as SUPERADMIN.', { duration: 6000 });
      } else if (error.response?.status === 403) {
        toast.error('Forbidden: You do not have permission to access developer settings', { duration: 6000 });
      } else {
        toast.error('Failed to load database statistics');
      }
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
    if (confirmText !== 'CLEAR') {
      toast.error('Please type CLEAR to confirm');
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
        
        // Reload stats to show current database state
        await loadTableStats();
        
        // Broadcast event to trigger reload on all pages
        window.dispatchEvent(new CustomEvent('dataCleared', { 
          detail: { 
            tableName: selectedTable.name,
            timestamp: Date.now()
          } 
        }));
        
        // If clearing all or specific tables, notify components to refresh
        if (selectedTable.name === 'all' || 
            ['invoices', 'picking_sessions', 'packing_sessions', 'delivery_sessions'].includes(selectedTable.name)) {
          // Trigger a hard refresh of data in open tabs/components
          localStorage.setItem('lastDataClear', Date.now().toString());
        }
      } else {
        toast.error(response.data.message || 'Failed to clear data');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      if (error.response?.status === 401) {
        toast.error('Unauthorized: Only SUPERADMIN can clear data');
      } else {
        const errorMsg = error.response?.data?.message || 'Failed to clear data';
        toast.error(errorMsg);
      }
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
        { key: 'invoices', label: 'Invoices', description: 'Clear invoices from view (database unchanged)' },
        { key: 'picking_sessions', label: 'Picking Sessions', description: 'Clear picking sessions from view' },
        { key: 'packing_sessions', label: 'Packing Sessions', description: 'Clear packing sessions from view' },
        { key: 'delivery_sessions', label: 'Delivery Sessions', description: 'Clear delivery sessions from view' },
        { key: 'customers', label: 'Customers', description: 'Clear customer records from view' },
        { key: 'salesmen', label: 'Salesmen', description: 'Clear salesman records from view' },
        { key: 'couriers', label: 'Couriers', description: 'Clear courier service providers from view' }
      ]
    },
    {
      name: 'Users & Organization',
      icon: <Users className="w-5 h-5" />,
      color: 'blue',
      tables: [
        { key: 'users', label: 'Users', description: 'Clear non-SUPERADMIN users from view' },
        { key: 'departments', label: 'Departments', description: 'Clear organization departments from view' },
        { key: 'job_titles', label: 'Job Titles', description: 'Clear job title definitions from view' }
      ]
    },
    {
      name: 'All Data',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'red',
      tables: [
        { key: 'all', label: 'All Data', description: 'Clear ALL data from view (database unchanged)' }
      ]
    }
  ];

  const getIcon = (key) => {
    switch (key) {
      case 'invoices': return <Package className="w-5 h-5" />;
      case 'picking_sessions': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case 'packing_sessions': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
      case 'delivery_sessions': return <TrendingUp className="w-5 h-5" />;
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Developer Options</h1>
                <p className="text-white/90 text-sm">Database maintenance and data clearing tools</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-xs text-white/70">Logged in as</p>
              <p className="font-semibold">{user?.email || 'Unknown'}</p>
              <p className="text-xs text-white/90">Role: {user?.role || 'Unknown'}</p>
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
          <div className="bg-blue-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirm View Clear</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-semibold">ℹ️ Frontend View Only</p>
                <p className="text-blue-700 text-sm mt-1">
                  This will clear: <strong>{selectedTable.label}</strong> from your frontend view only. Database remains intact.
                </p>
              </div>
              
              <p className="text-gray-700 mb-4">
                Type <strong className="text-blue-600">CLEAR</strong> to confirm this action:
              </p>
              
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CLEAR"
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
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
                  disabled={confirmText !== 'CLEAR' || deleting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {deleting ? 'Clearing...' : 'Clear View'}
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
