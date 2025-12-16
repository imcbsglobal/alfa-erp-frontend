import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { LogoutIcon } from "./Icons";

const ROLE_TITLES = {
  PICKER: "Picking Dashboard",
  PACKER: "Packing Dashboard",
  DELIVERY: "Delivery Dashboard",
  STORE: "Store Operations",
};

export default function OperationsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const title = ROLE_TITLES[user?.role] || "Operations";

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* TOP BAR */}
      <header className="h-16 bg-white border-b shadow-sm flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>

        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-700">
            {user?.email}
          </span>

          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700"
          >
            <LogoutIcon className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
