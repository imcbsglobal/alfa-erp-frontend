import { useState, useEffect, useRef } from "react";
import api from "../services/api";

// Avatar component with initials
const UserAvatar = ({ user, isActive, onClick, isHovered, index, type }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const colors = [
    "bg-teal-500",
    "bg-cyan-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-orange-500",
    "bg-amber-500",
  ];

  const baseSize = isHovered ? "w-12 h-12" : "w-9 h-9";
  const scale = isHovered ? "scale-110" : "scale-100";

  // Get name based on type
  const userName = type === 'picking' ? user.picker_name 
    : type === 'packing' ? user.packer_name 
    : user.delivery_user_name || user.driver_name;

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      <div
        className={`${baseSize} ${scale} ${colors[index % colors.length]} 
          rounded-full flex items-center justify-center text-white font-bold
          cursor-pointer transition-all duration-300 ease-out shadow-lg
          hover:shadow-xl relative border-3 border-white
          ${isHovered ? "-translate-y-3" : ""}`}
        style={{
          transitionDelay: `${index * 30}ms`,
        }}
      >
        <span className={isHovered ? "text-base" : "text-xs"}>
          {getInitials(userName)}
        </span>
        
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -left-32 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-xl">
          <div className="font-semibold">{userName}</div>
          <div className="text-gray-300 text-[10px]">{user.invoice_no}</div>
          <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Task detail card popup - matching second image design
const TaskCard = ({ user, onClose, type }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Get details based on type
  const userName = type === 'picking' ? user.picker_name 
    : type === 'packing' ? user.packer_name 
    : user.delivery_user_name || user.driver_name;

  const activityLabel = type === 'picking' ? 'Picking' 
    : type === 'packing' ? 'Packing' 
    : 'Delivering';

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-[9998]"
        onClick={onClose}
      />
      <div className="fixed top-1/2 right-24 -translate-y-1/2 z-[9999] animate-in slide-in-from-right-4 fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl w-80 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-teal-600 font-bold text-base shadow-md">
                {getInitials(userName)}
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{userName?.toUpperCase()}</h3>
                <p className="text-teal-50 text-xs">Online</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            <div className="bg-teal-50 rounded-xl p-4">
              <div className="text-xs text-gray-600 mb-1">Currently {activityLabel}</div>
              <div className="text-xl font-bold text-teal-700">{user.invoice_no}</div>
              <div className="text-sm text-gray-600 mt-1">{user.customer_name || "A Store"}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Main Dock Component
export default function ActiveUsersDock({ type = 'picking' }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isHidden, setIsHidden] = useState(false);
  const [position, setPosition] = useState(null); // Will be set in useEffect
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dockRef = useRef(null);

  // Configure endpoints based on type
  const config = {
    picking: {
      endpoint: '/sales/picking/history/',
      status: 'PREPARING',
      icon: '📦',
      label: 'Picking',
      gradient: 'from-teal-500 to-cyan-600'
    },
    packing: {
      endpoint: '/sales/packing/history/',
      status: 'IN_PROGRESS',
      icon: '📋',
      label: 'Packing',
      gradient: 'from-purple-500 to-pink-600'
    },
    delivery: {
      endpoint: '/sales/delivery/history/',
      status: 'IN_TRANSIT',
      icon: '🚚',
      label: 'Delivering',
      gradient: 'from-blue-500 to-indigo-600'
    }
  };

  const currentConfig = config[type] || config.picking;

  useEffect(() => {
    loadActiveUsers();
    const interval = setInterval(loadActiveUsers, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [type]);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`activeUsersDock_${type}_position`);
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {
        // If parsing fails, use default
        setPosition({ x: window.innerWidth - 120, y: 100 });
      }
    } else {
      // Default position - right side, near top
      setPosition({ x: window.innerWidth - 120, y: 100 });
    }
  }, [type]);

  const loadActiveUsers = async () => {
    try {
      const res = await api.get(currentConfig.endpoint, {
        params: { status: currentConfig.status }
      });
      const users = res.data?.results || [];
      console.log(`🔵 ActiveUsersDock [${type}]: Loaded ${users.length} active users`, users);
      setActiveUsers(users);
    } catch (err) {
      console.error(`Failed to load active ${type} users:`, err);
    }
  };

  const handleUserClick = (user) => {
    if (!isDragging) {
      setSelectedUser(user);
    }
  };

  const handleMouseDown = (e) => {
    // Only start drag if clicking on the header badge
    if (e.target.closest('.drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setIsExpanded(false); // Collapse during drag
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 200;
      const maxY = window.innerHeight - 200;
      
      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem(`activeUsersDock_${type}_position`, JSON.stringify(position));
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (activeUsers.length === 0) {
    return null;
  }

  // Don't render until position is set
  if (!position) {
    return null;
  }

  console.log(`🎯 ActiveUsersDock [${type}] rendering:`, {
    activeUsers: activeUsers.length,
    isHidden,
    position,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  });

  return (
    <>
      {/* Hidden state - show small button */}
      {isHidden ? (
        <div
          className="fixed right-6 top-1/2 -translate-y-1/2 z-[9999] cursor-pointer"
          onClick={() => setIsHidden(false)}
        >
          <div className={`bg-gradient-to-r ${currentConfig.gradient} rounded-full p-2 shadow-xl hover:shadow-2xl transition-all hover:scale-110`}>
            <div className="flex items-center gap-1">
              <span className="text-xl">{currentConfig.icon}</span>
              <span className="text-white font-bold text-sm">{activeUsers.length}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Dock Container */
        <div
          ref={dockRef}
          className="fixed z-[9999] select-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'auto'
          }}
        >
          <div
            className={`bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-gray-200 p-2
              transition-all duration-500 ease-out ${
                isExpanded ? "gap-2" : "gap-1"
              } ${isDragging ? 'ring-4 ring-teal-400' : ''}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            onMouseEnter={() => !isDragging && setIsExpanded(true)}
            onMouseLeave={() => !isDragging && setIsExpanded(false)}
          >
            {/* Header badge with drag handle and hide button */}
            <div 
              className={`mb-1 flex items-center gap-2 px-2 py-1 bg-gradient-to-r ${currentConfig.gradient} rounded-full drag-handle`}
              onMouseDown={handleMouseDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
              title="Drag to move"
            >
              <span className="text-base">{currentConfig.icon}</span>
              <span className="text-white font-bold text-xs">{activeUsers.length}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHidden(true);
                }}
                className="ml-1 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition"
                title="Hide dock"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User avatars */}
            {activeUsers.map((user, index) => (
              <div
                key={user.id}
                onMouseEnter={() => !isDragging && setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <UserAvatar
                  user={user}
                  isActive={true}
                  onClick={() => handleUserClick(user)}
                  isHovered={isExpanded && hoveredIndex === index && !isDragging}
                  index={index}
                  type={type}
                />
              </div>
            ))}

            {/* Active indicator label */}
            {isExpanded && !isDragging && (
              <div className="mt-1 text-[10px] font-semibold text-gray-500 animate-in fade-in duration-300">
                {currentConfig.label}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Detail Card */}
      {selectedUser && !isDragging && (
        <TaskCard
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          type={type}
        />
      )}
    </>
  );
}