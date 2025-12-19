import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { LogoutIcon, ChevronDownIcon } from "./Icons";
import ToastProvider from "../components/ToastProvider";

const ROLE_TITLES = {
  PICKER: "Picking Dashboard",
  PACKER: "Packing Dashboard",
  DELIVERY: "Delivery Dashboard",
  STORE: "Store Operations",
};

export default function OperationsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const title = ROLE_TITLES[user?.role] || "Operations";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          {/* Logo */}
          <img
            src="/alfa3.png"
            alt="Alfa Agencies"
            className="h-12 sm:h-16 w-auto object-contain flex-shrink-0"
          />

          {/* Title + subtitle */}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl font-bold text-gray-800 leading-tight truncate">
              {title}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block truncate">
              Welcome back, {user?.name || "User"}
            </p>
          </div>
        </div>

        {/* Profile Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-gray-800 text-sm">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.replace("_", " ").toLowerCase() || "User"}
              </p>
            </div>

            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-teal-100 overflow-hidden">
              {user?.profilePhoto ? (
                <img 
                  src={user.profilePhoto} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-sm sm:text-base">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>

            <ChevronDownIcon
              className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 transition-transform ${
                showProfileMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-white border border-gray-200 shadow-xl rounded-lg py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-gray-800 text-sm">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 break-all">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">
                  {user?.role?.replace("_", " ").toLowerCase()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              >
                <LogoutIcon className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
        <ToastProvider />
        <Outlet />
      </main>
    </div>
  );
}