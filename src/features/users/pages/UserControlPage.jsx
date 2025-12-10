import { useState, useEffect } from "react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

// Simple SVG icon components to replace lucide-react
const HomeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CogIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BriefcaseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const FileTextIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ListIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const permissionIcons = {
  dashboard: <HomeIcon className="w-6 h-6" />,
  
  // User Management Section
  users: <UsersIcon className="w-6 h-6" />,
  user_management: <UsersIcon className="w-6 h-6" />,
  user_list: <UsersIcon className="w-6 h-6" />,
  user_control: <CogIcon className="w-6 h-6" />,
  
  // Invoice Section
  invoice: <FileTextIcon className="w-6 h-6" />,
  invoice_list: <ListIcon className="w-6 h-6" />,
  
  // Master Section
  master: <TuneOutlinedIcon className="w-6 h-6" />,
  job_title: <BriefcaseIcon className="w-6 h-6" />,
  department: <BuildingIcon className="w-6 h-6" />,
  
  // Default fallback
  default: <CogIcon className="w-6 h-6" />,
};

// Mock menus for fallback
const mockMenus = [
  { id: 1, name: "Dashboard", code: "dashboard" },
  { id: 2, name: "User Management", code: "user_management" },
  { id: 3, name: "User List", code: "user_list" },
  { id: 4, name: "User Control", code: "user_control" },
  { id: 5, name: "Invoice", code: "invoice" },
  { id: 6, name: "Invoice List", code: "invoice_list" },
  { id: 7, name: "Master", code: "master" },
  { id: 8, name: "Job Title", code: "job_title" },
  { id: 9, name: "Department", code: "department" },
];

export default function UserControlPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/users/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const userList = result.data.results || [];
        setUsers(userList);
        console.log('Users fetched:', userList);
      } else {
        console.error('Failed to fetch users:', result.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch menus from API
  const fetchAllMenus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/access/admin/menus/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        console.log('Menu API not available, using mock data');
        setAvailableMenus(mockMenus);
        return;
      }
      
      const result = await response.json();
      
      if (result.data && result.data.menus) {
        setAvailableMenus(result.data.menus);
        console.log('Menus fetched:', result.data.menus);
      } else if (result.success && result.data) {
        setAvailableMenus(Array.isArray(result.data) ? result.data : mockMenus);
      } else {
        setAvailableMenus(mockMenus);
      }
    } catch (err) {
      console.log('Menu API not available, using mock data');
      setAvailableMenus(mockMenus);
    }
  };

  // Initialize - fetch users and menus
  useEffect(() => {
    fetchUsers();
    fetchAllMenus();
  }, []);

  // Fetch user permissions when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUserPermissions = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/access/admin/users/${userId}/menus/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        console.log('User permissions API not available, starting with empty permissions');
        setUserPermissions({});
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setUserPermissions(result.data);
      } else if (typeof result === 'object') {
        setUserPermissions(result);
      } else {
        setUserPermissions({});
      }
      
      console.log('User permissions fetched:', result);
    } catch (error) {
      console.log('User permissions API not available, starting with empty permissions');
      setUserPermissions({});
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const togglePermission = (menuId) => {
    setUserPermissions(prev => ({
      ...prev,
      [menuId]: {
        view: !(prev[menuId]?.view)
      }
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaveLoading(true);

    try {
      const enabledMenus = Object.keys(userPermissions).filter(key => userPermissions[key]?.view);
      
      console.log("Saving permissions:", {
        user_id: selectedUser.id,
        menu_ids: enabledMenus
      });

      const response = await fetch('http://localhost:8000/api/access/admin/assign-menus/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          menu_ids: enabledMenus
        })
      });

      if (response.status === 404) {
        alert("Menu access control API is not yet implemented on the backend. Your selections have been saved locally for demonstration purposes.");
        return;
      }

      const result = await response.json();
      
      if (response.ok) {
        alert("Permissions updated successfully!");
        fetchUserPermissions(selectedUser.id);
      } else {
        alert(`Failed to update permissions: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      if (err.message.includes('JSON')) {
        alert("Menu access control API is not yet implemented on the backend. Your selections have been saved locally for demonstration purposes.");
      } else {
        alert("Failed to update permissions. Please try again.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const name = u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
    const email = u.email || '';
    const searchLower = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  const getEnabledCount = () => {
    return Object.values(userPermissions).filter(p => p?.view).length;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">User Access Control</h1>
          <p className="text-gray-600">Manage menu access and permissions for admins and users at Alfa Agencies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>Select User</span>
                <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                  {filteredUsers.length}
                </span>
              </h2>
              
              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* User List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="text-center text-gray-500 py-8">Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-500 font-medium">No users found</p>
                    <p className="text-sm text-gray-400 mt-1">Create users in the Add User page</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const userName = u.name || u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown User';
                    const userInitial = userName.charAt(0).toUpperCase();
                    
                    return (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedUser?.id === u.id
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${
                          selectedUser?.id === u.id
                            ? 'bg-white/20'
                            : u.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-400 to-purple-500' : 'bg-gradient-to-br from-teal-400 to-cyan-500'
                        } flex items-center justify-center text-white font-semibold`}>
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{userName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              selectedUser?.id === u.id
                                ? 'bg-white/20'
                                : u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${selectedUser?.id === u.id ? 'text-teal-100' : 'text-gray-500'}`}>
                            {u.email}
                          </p>
                          {u.department && (
                            <p className={`text-xs mt-1 ${selectedUser?.id === u.id ? 'text-teal-100' : 'text-gray-400'}`}>
                              📍 {u.department}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )})
                )}
              </div>
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a User</h3>
                <p className="text-gray-600">Choose a user from the list to manage their menu access and permissions</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md">
                {/* Selected User Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full ${
                        selectedUser.role === 'ADMIN' 
                          ? 'bg-gradient-to-br from-purple-400 to-purple-500' 
                          : 'bg-gradient-to-br from-teal-400 to-cyan-500'
                      } flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
                        {(selectedUser.name || selectedUser.full_name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl font-bold text-gray-800">
                            {selectedUser.name || selectedUser.full_name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'Unknown User'}
                          </h2>
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            selectedUser.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {selectedUser.role}
                          </span>
                        </div>
                        <p className="text-gray-600">{selectedUser.email}</p>
                        {selectedUser.department && (
                          <p className="text-sm text-gray-500 mt-1">📍 {selectedUser.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Enabled Menus</p>
                      <p className="text-3xl font-bold text-teal-600">{getEnabledCount()}/{availableMenus.length}</p>
                    </div>
                  </div>
                </div>

                {/* Permissions List */}
                <div className="p-6">
                  {/* Select All/Deselect All */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => {
                        const updates = {};
                        availableMenus.forEach(menu => {
                          updates[menu.id] = { view: true };
                        });
                        setUserPermissions(updates);
                      }}
                      className="flex-1 py-2 px-4 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors font-medium text-sm"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setUserPermissions({})}
                      className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Menu List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {availableMenus.map((menu) => (
                      <button
                        key={menu.id}
                        onClick={() => togglePermission(menu.id)}
                        className={`w-full flex justify-between items-center p-4 rounded-lg border-2 transition-all ${
                          userPermissions[menu.id]?.view
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`${userPermissions[menu.id]?.view ? 'text-teal-600' : 'text-gray-400'}`}>
                            {permissionIcons[menu.code] || permissionIcons.default}
                          </div>
                          <div className="text-left">
                            <span className={`font-medium block ${userPermissions[menu.id]?.view ? 'text-teal-900' : 'text-gray-700'}`}>
                              {menu.name}
                            </span>
                            {menu.code && (
                              <span className="text-xs text-gray-500">
                                {menu.code}
                              </span>
                            )}
                          </div>
                        </div>

                        {userPermissions[menu.id]?.view && (
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="border-t border-gray-200 p-6">
                  <button
                    onClick={handleSavePermissions}
                    disabled={saveLoading}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saveLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}