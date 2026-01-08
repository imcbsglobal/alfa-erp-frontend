import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDownIcon } from "../Icons";

export function SidebarMenu({ 
  menu, 
  user,
  sidebarOpen, 
  openMenuId, 
  onToggle, 
  onNavigate 
}) {
  const location = useLocation();
  const buttonRef = useRef(null);
  const [openNestedId, setOpenNestedId] = useState(null);

  // Helper function to resolve path (handles both string and function)
  const resolvePath = (path) => {
    if (!path) return "#";
    return typeof path === 'function' ? path(user) : path;
  };

  const handleMouseEnter = () => {
    // Only trigger on desktop when sidebar is collapsed
    if (window.innerWidth >= 1024 && !sidebarOpen && menu.type === "dropdown") {
      onToggle(menu.id);
    }
  };

  const handleMouseLeave = () => {
    // Only trigger on desktop when sidebar is collapsed
    if (window.innerWidth >= 1024 && !sidebarOpen && menu.type === "dropdown") {
      onToggle(null);
      setOpenNestedId(null);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (menu.type === "single") {
      const path = resolvePath(menu.path);
      onNavigate(path);
    } else if (menu.type === "dropdown") {
      if (sidebarOpen) {
        onToggle(openMenuId === menu.id ? null : menu.id);
        setOpenNestedId(null);
      }
    }
  };

  const handleNestedToggle = (itemId) => {
    setOpenNestedId(openNestedId === itemId ? null : itemId);
  };

  const menuPath = resolvePath(menu.path);
  const isMenuActive = menu.isActive 
    ? menu.isActive(location.pathname) 
    : location.pathname === menuPath;

  const isOpen = openMenuId === menu.id;

  return (
    <div 
      style={{ position: "relative", zIndex: 10 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        id={`menu-${menu.id}`}
        onClick={handleClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-lg transition-all ${
          isMenuActive
            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
        } ${!sidebarOpen && "lg:justify-center"}`}
      >
        <menu.icon className="w-5 h-5 flex-shrink-0" />
        {sidebarOpen && (
          <>
            <span className="font-medium flex-1 text-left text-sm sm:text-base">{menu.label}</span>
            {menu.type === "dropdown" && (
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </>
        )}
      </button>

      {/* Submenu - Expanded Sidebar (Mobile & Desktop) */}
      {menu.type === "dropdown" && sidebarOpen && isOpen && (
        <div className="mt-1 space-y-1 pl-3 sm:pl-4">
          {menu.submenu.map((item, index) => {
            const itemPath = resolvePath(item.path);
            
            // Handle nested dropdown
            if (item.type === "nested-dropdown") {
              const isNestedOpen = openNestedId === `${menu.id}-${index}`;
              return (
                <div key={index} className="space-y-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNestedToggle(`${menu.id}-${index}`);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-xs sm:text-sm font-medium transition-all ${
                      isNestedOpen
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDownIcon
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isNestedOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isNestedOpen && (
                    <div className="pl-6 space-y-1">
                      {item.submenu.map((subItem, subIndex) => {
                        const subItemPath = resolvePath(subItem.path);
                        return (
                          <button
                            key={subIndex}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onNavigate(subItemPath);
                              onToggle(null);
                              setOpenNestedId(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-lg w-full text-xs sm:text-sm transition-all ${
                              location.pathname === subItemPath
                                ? "bg-teal-50 text-teal-700 font-medium shadow-sm"
                                : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                            }`}
                          >
                            <subItem.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // Regular submenu item
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate(itemPath);
                  onToggle(null);
                }}
                className={`flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-lg w-full text-xs sm:text-sm transition-all ${
                  location.pathname === itemPath
                    ? "bg-teal-50 text-teal-700 font-medium shadow-sm"
                    : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Submenu - Collapsed Sidebar (Desktop only - Flyout) */}
      {menu.type === "dropdown" && !sidebarOpen && isOpen && (
        <div
          style={{
            position: "fixed",
            left: "5rem",
            top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().top}px` : "auto",
            zIndex: 2000,
            minWidth: "240px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
          className="hidden lg:block bg-white border border-gray-200 shadow-2xl rounded-lg py-2 ml-2 animate-in fade-in slide-in-from-left-2 duration-200"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {menu.label}
            </p>
          </div>
          {menu.submenu.map((item, index) => {
            const itemPath = resolvePath(item.path);
            
            // Handle nested dropdown in flyout
            if (item.type === "nested-dropdown") {
              const isNestedOpen = openNestedId === `${menu.id}-${index}`;
              return (
                <div key={index} className="border-b border-gray-100 last:border-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNestedToggle(`${menu.id}-${index}`);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 w-full text-sm font-medium transition-all ${
                      isNestedOpen
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDownIcon
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isNestedOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isNestedOpen && (
                    <div className="bg-gray-50 animate-in slide-in-from-top-1 duration-150">
                      {item.submenu.map((subItem, subIndex) => {
                        const subItemPath = resolvePath(subItem.path);
                        return (
                          <button
                            key={subIndex}
                            onClick={(e) => {
                              e.preventDefault();
                              onNavigate(subItemPath);
                              onToggle(null);
                              setOpenNestedId(null);
                            }}
                            className={`flex items-center gap-3 px-6 py-2.5 w-full text-sm transition-all ${
                              location.pathname === subItemPath
                                ? "bg-teal-50 text-teal-700 font-medium shadow-sm"
                                : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                            }`}
                          >
                            <subItem.icon className="w-4 h-4 flex-shrink-0" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // Regular flyout item
            return (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(itemPath);
                  onToggle(null);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm transition-all ${
                  location.pathname === itemPath
                    ? "bg-teal-50 text-teal-700 font-medium shadow-sm"
                    : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}