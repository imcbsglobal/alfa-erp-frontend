import { Clock, Truck, CheckCircle, Package } from "lucide-react";

/**
 * DeliveryStatusBadge Component
 * 
 * Displays a styled badge for delivery status with appropriate colors and icons
 * 
 * @param {string} status - Delivery status (PENDING, IN_TRANSIT, DELIVERED)
 * @param {string} type - Delivery type (DIRECT, COURIER, INTERNAL)
 * @param {string} size - Badge size ('sm', 'md', 'lg')
 * @param {boolean} showIcon - Whether to show icon
 */
export default function DeliveryStatusBadge({ 
  status, 
  type = null,
  size = "md", 
  showIcon = true 
}) {
  // Status configurations
  const statusConfig = {
    PENDING: {
      label: "Pending",
      colors: "bg-gray-100 text-gray-700 border-gray-200",
      icon: Clock,
    },
    IN_TRANSIT: {
      label: "In Transit",
      colors: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: Truck,
    },
    DELIVERED: {
      label: "Delivered",
      colors: "bg-green-100 text-green-700 border-green-200",
      icon: CheckCircle,
    },
  };

  // Type configurations
  const typeConfig = {
    DIRECT: {
      label: "Counter Pickup",
      colors: "bg-blue-100 text-blue-700 border-blue-200",
      icon: Package,
    },
    COURIER: {
      label: "Courier",
      colors: "bg-purple-100 text-purple-700 border-purple-200",
      icon: Truck,
    },
    INTERNAL: {
      label: "Company Delivery",
      colors: "bg-green-100 text-green-700 border-green-200",
      icon: Truck,
    },
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      container: "px-2 py-0.5 text-xs",
      icon: "w-3 h-3",
    },
    md: {
      container: "px-3 py-1 text-xs",
      icon: "w-4 h-4",
    },
    lg: {
      container: "px-4 py-1.5 text-sm",
      icon: "w-5 h-5",
    },
  };

  // Determine which config to use (status or type)
  const config = type ? typeConfig[type] : statusConfig[status];
  const sizeStyles = sizeConfig[size] || sizeConfig.md;

  if (!config) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200 ${sizeStyles.container}`}>
        {status || type || "Unknown"}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${config.colors} ${sizeStyles.container}`}>
      {showIcon && Icon && <Icon className={sizeStyles.icon} />}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Combined Status and Type Badge
 * Shows both delivery type and status together
 */
export function DeliveryBadgeGroup({ status, type, size = "md" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {type && <DeliveryStatusBadge type={type} size={size} />}
      {status && <DeliveryStatusBadge status={status} size={size} />}
    </div>
  );
}

/**
 * Delivery Status Icon Only
 * Shows just the icon with color coding
 */
export function DeliveryStatusIcon({ status, type = null, className = "" }) {
  const statusConfig = {
    PENDING: { icon: Clock, color: "text-gray-500" },
    IN_TRANSIT: { icon: Truck, color: "text-yellow-500" },
    DELIVERED: { icon: CheckCircle, color: "text-green-500" },
  };

  const typeConfig = {
    DIRECT: { icon: Package, color: "text-blue-500" },
    COURIER: { icon: Truck, color: "text-purple-500" },
    INTERNAL: { icon: Truck, color: "text-green-500" },
  };

  const config = type ? typeConfig[type] : statusConfig[status];
  
  if (!config) return null;

  const Icon = config.icon;

  return <Icon className={`${config.color} ${className}`} />;
}

/**
 * Delivery Progress Badge
 * Shows delivery progress with percentage
 */
export function DeliveryProgressBadge({ status, showPercentage = false }) {
  const progressConfig = {
    PENDING: { 
      percentage: 0, 
      color: "bg-gray-200",
      textColor: "text-gray-700" 
    },
    IN_TRANSIT: { 
      percentage: 50, 
      color: "bg-yellow-200",
      textColor: "text-yellow-700" 
    },
    DELIVERED: { 
      percentage: 100, 
      color: "bg-green-200",
      textColor: "text-green-700" 
    },
  };

  const config = progressConfig[status] || progressConfig.PENDING;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full ${config.color} transition-all duration-500`}
          style={{ width: `${config.percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className={`text-xs font-semibold ${config.textColor} min-w-[45px]`}>
          {config.percentage}%
        </span>
      )}
    </div>
  );
}