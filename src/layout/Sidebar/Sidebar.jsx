import { ChevronLeftIcon } from "../Icons";
import { SidebarMenu } from "./SidebarMenu";
import { MENU_CONFIG } from "./menuConfig";

export function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen, 
  openMenuId, 
  onToggleMenu, 
  onNavigate,
  visibleMenus,
  permissionsLoaded 
}) {
  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      style={{ 
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 1000,
        overflow: 'visible'
      }}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 w-full">
            <img 
              src="/alfa3.png" 
              alt="Alfa Agencies" 
              className="h-16 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            <img 
              src="/alfa4.png" 
              alt="Alfa Agencies" 
              className="h-18 w-auto object-contain"
            />
          </div>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 py-4 px-3 space-y-1" style={{ overflowY: 'auto', overflowX: 'visible', position: 'relative' }}>
        {permissionsLoaded && visibleMenus.map((menu) => (
          <SidebarMenu
            key={menu.id}
            menu={menu}
            sidebarOpen={sidebarOpen}
            openMenuId={openMenuId}
            onToggle={onToggleMenu}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ zIndex: 1050 }}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-teal-300 transition-all group"
        aria-label="Toggle Sidebar"
      >
        <ChevronLeftIcon 
          className={`w-4 h-4 text-gray-600 group-hover:text-teal-600 transition-all ${
            !sidebarOpen && "rotate-180"
          }`} 
        />
      </button>
    </aside>
  );
}