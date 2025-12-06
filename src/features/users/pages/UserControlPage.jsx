import { useState, useEffect } from "react";
import api, { getUsers } from "../../../services/auth";

export default function UserControlPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [availableMenus, setAvailableMenus] = useState([]);

const fetchAllMenus = async () => {
  try {
    const res = await api.get("/access/admin/menus/");
    setAvailableMenus(res.data.data.menus);
    console.log("Menus fetched:", res.data.data.menus);
  } catch (err) {
    console.error("Error fetching menus", err);
  }
};

  useEffect(() => {
    fetchUsers();
    fetchAllMenus();
  }, []);

  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id); // Changed to email
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers();
      console.log("Users response:", response);

      const userList = response.data.results || response.data || response; // safe handling
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async (userId) => {
  try {
    const res = await api.get(`/access/admin/users/${userId}/menus/`);
    setUserPermissions(res.data);
  } catch (error) {
    console.error("Error fetching permissions", error);
  }
};


  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSuccessMessage('');
  };

  const togglePermission = (menuId) => {
    setUserPermissions(prev => ({
      ...prev,
      [menuId]: {
        view: !(prev[menuId]?.view)
      }
    }));
  };

  const toggleAllInCategory = (category) => {
    const menusInCategory = availableMenus.filter(m => m.category === category);
    const allEnabled = menusInCategory.every(m => userPermissions[m.id]?.view);
    
    const updates = {};
    menusInCategory.forEach(m => {
      updates[m.id] = { view: !allEnabled };
    });

    setUserPermissions(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleSavePermissions = async () => {
  if (!selectedUser) return;
  setSaveLoading(true);

  try {
    const enabledMenus = Object.keys(userPermissions).filter((key) => userPermissions[key]?.view);

    await api.post("/access/admin/assign-menus/", {
      user_id: selectedUser.id,
      menus: enabledMenus,
    });

    setSuccessMessage("Permissions updated successfully");
  } catch (err) {
    console.error("Save error:", err);
  } finally {
    setSaveLoading(false);
  }
};

  const filteredUsers = Array.isArray(users) ? users.filter(u =>
    (u.name || u.full_name || u.first_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const categories = [...new Set(availableMenus.map(m => m.category))];

  const getEnabledCount = () => {
    return Object.values(userPermissions).filter(p => p?.view).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">User Access Control</h1>
          <p className="text-gray-600">Manage menu access and permissions for admins and users at Alfa Agencies</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

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
                  filteredUsers.map((u) => (
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
                        } flex items-center justify-center text-white font-semibold overflow-hidden`}>
                          {u.profilePhoto ? (
                            <img 
                              src={u.profilePhoto} 
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{u.name}</p>
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
                  ))
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
                      } flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden`}>
                        {selectedUser.profilePhoto ? (
                          <img 
                            src={selectedUser.profilePhoto} 
                            alt={selectedUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          selectedUser.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl font-bold text-gray-800">{selectedUser.name}</h2>
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

                {/* Permissions by Category */}
                <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                  {categories.map((category) => {
                    const menusInCategory = availableMenus.filter(m => m.category === category);
                    const allEnabled = menusInCategory.every(m => userPermissions[m.id]?.view);
                    
                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-bold">
                              {menusInCategory.length}
                            </span>
                            {category}
                          </h3>
                          <button
                            onClick={() => toggleAllInCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              allEnabled
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                            }`}
                          >
                            {allEnabled ? 'Disable All' : 'Enable All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {menusInCategory.map((menu) => (
                            <button
                              key={menu.id}
                              onClick={() => togglePermission(menu.id)}
                              className={`p-4 rounded-lg border-2 transition-all text-left ${
                                userPermissions[menu.id]?.view
                                  ? 'border-teal-500 bg-teal-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{menu.icon}</span>
                                  <span className={`font-semibold ${
                                    userPermissions[menu.id]?.view ? 'text-teal-700' : 'text-gray-700'
                                  }`}>
                                    {menu.name}
                                  </span>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  userPermissions[menu.id]?.view
                                    ? 'border-teal-500 bg-teal-500'
                                    : 'border-gray-300'
                                }`}>
                                  {userPermissions[menu.id]?.view && (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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