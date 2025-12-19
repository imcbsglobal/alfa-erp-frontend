import { ChevronLeftIcon } from "../Icons";
import { SidebarMenu } from "./SidebarMenu";

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  openMenuId,
  onToggleMenu,
  onNavigate,
  visibleMenus = [],
}) {
  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[40] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${
          sidebarOpen ? "w-64" : "lg:w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col group/sidebar`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          zIndex: 50, // Reduced from 999
          overflow: "visible",
        }}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 flex-shrink-0 relative">
          {sidebarOpen ? (
            <img
              src="/alfa3.png"
              alt="Alfa Agencies"
              className="h-12 sm:h-16 w-auto object-contain"
            />
          ) : (
            <img
              src="/alfa4.png"
              alt="Alfa Agencies"
              className="h-12 sm:h-16 w-auto object-contain"
            />
          )}
          
          {/* Toggle Button - Hidden on mobile, visible on desktop */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:shadow-lg transition-all ${
              !sidebarOpen ? 'opacity-0 group-hover/sidebar:opacity-100' : 'opacity-100'
            }`}
            aria-label={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            style={{ zIndex: 51 }}
          >
            <ChevronLeftIcon 
              className={`w-4 h-4 text-gray-600 hover:text-teal-600 transition-transform ${
                !sidebarOpen && "rotate-180"
              }`} 
            />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 py-4 px-3 space-y-1"
          style={{ overflowY: "auto", overflowX: "visible" }}
        >
          {visibleMenus.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-6">
              No menu access
            </p>
          ) : (
            visibleMenus.map((menu) => (
              <SidebarMenu
                key={menu.id}
                menu={menu}
                sidebarOpen={sidebarOpen}
                openMenuId={openMenuId}
                onToggle={onToggleMenu}
                onNavigate={onNavigate}
              />
            ))
          )}
        </nav>
      </aside>
    </>
  );
}