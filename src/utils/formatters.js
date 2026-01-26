/**
 * Centralized formatting utilities for consistent number and date formatting across the application
 */

// ===================
// NUMBER FORMATTING
// ===================

/**
 * Format a number to a fixed number of decimal places
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {string} fallback - Fallback value if number is invalid (default: "0.00")
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 2, fallback = "0.00") => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(decimals) : fallback;
};

/**
 * Format a currency value with rupee symbol
 * @param {number|string} value - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string with ₹ symbol
 */
export const formatCurrency = (value, decimals = 2) => {
  const formatted = formatNumber(value, decimals);
  return `₹${formatted}`;
};

/**
 * Format a number with thousands separator
 * @param {number|string} value - The number to format
 * @returns {string} Formatted number with locale-specific separators
 */
export const formatNumberWithSeparator = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : '0';
};

/**
 * Format file size in KB
 * @param {number} sizeInBytes - File size in bytes
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (sizeInBytes, decimals = 1) => {
  const sizeInKB = sizeInBytes / 1024;
  return `${sizeInKB.toFixed(decimals)} KB`;
};

/**
 * Format coordinates (latitude/longitude)
 * @param {number} coordinate - The coordinate value
 * @param {number} decimals - Number of decimal places (default: 6)
 * @returns {string} Formatted coordinate string
 */
export const formatCoordinate = (coordinate, decimals = 6) => {
  return Number.isFinite(coordinate) ? coordinate.toFixed(decimals) : '0.000000';
};

// ===================
// DATE FORMATTING
// ===================

/**
 * Format date to locale date string (e.g., "24/1/2026")
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-IN')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string or fallback
 */
export const formatDate = (dateValue, locale = 'en-IN', options = {}) => {
  if (!dateValue) return '-';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    
    // Default format: D/M/YYYY (no leading zeros)
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date and time to locale string (e.g., "12/31/2023, 10:30:45 AM")
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-IN')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date-time string or fallback
 */
export const formatDateTime = (dateValue, locale = 'en-IN', options = {}) => {
  if (!dateValue) return '-';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleString(locale, options);
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return '-';
  }
};

/**
 * Format time only (e.g., "1:24:53 pm")
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-IN')
 * @returns {string} Formatted time string or fallback
 */
export const formatTime = (dateValue, locale = 'en-IN') => {
  if (!dateValue) return '-';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    return `${hours}:${minutesStr}:${secondsStr} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

/**
 * Format date for display with specific format (DD/MM/YYYY)
 * @param {string|Date} dateValue - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateDDMMYYYY = (dateValue) => {
  return formatDate(dateValue, 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format date for display with specific format (MM/DD/YYYY)
 * @param {string|Date} dateValue - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateMMDDYYYY = (dateValue) => {
  return formatDate(dateValue, 'en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format date with month name (e.g., "January 15, 2023")
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-IN')
 * @returns {string} Formatted date string with month name
 */
export const formatDateWithMonthName = (dateValue, locale = 'en-IN') => {
  return formatDate(dateValue, locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date for invoice display (DD/MM/YYYY format)
 * @param {string|Date} dateValue - The date to format
 * @returns {string} Formatted invoice date string
 */
export const formatInvoiceDate = (dateValue) => {
  return formatDate(dateValue, 'en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Get ISO date string for today (YYYY-MM-DD)
 * @returns {string} Today's date in ISO format
 */
export const getTodayISOString = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Format date for detailed view with day, month, year
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-IN')
 * @returns {string} Formatted detailed date string
 */
export const formatDetailedDate = (dateValue, locale = 'en-IN') => {
  return formatDate(dateValue, locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time for detailed view
 * @param {string|Date} dateValue - The date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted detailed date-time string
 */
export const formatDetailedDateTime = (dateValue, locale = 'en-US') => {
  return formatDateTime(dateValue, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Calculate and format duration between two dates
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time
 * @returns {string} Formatted duration string
 */
export const formatDuration = (value, endTime) => {
  // CASE 1: duration already in minutes (number or numeric string)
  if (Number.isFinite(Number(value))) {
    const mins = Number(value);
    if (mins <= 0) return "-";

    if (mins < 60) return `${Math.round(mins)}m`;

    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    return `${hours}h ${minutes}m`;
  }

  // CASE 2: start time (date)
  try {
    const start = new Date(value);
    const end = endTime ? new Date(endTime) : new Date();

    if (isNaN(start) || isNaN(end)) return "-";

    const diffMins = Math.floor((end - start) / 60000);

    if (diffMins < 60) return `${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours}h ${minutes}m`;
  } catch {
    return "-";
  }
};

/**
 * Parse and validate a number safely
 * @param {any} value - Value to parse as number
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {number} Parsed number or default value
 */
export const parseNumber = (value, defaultValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

// ===================
// BUSINESS DISPLAY FORMATTERS
// ===================

/**
 * Format amount/price with rupee symbol
 * @param {number|string} value - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted amount with ₹ symbol (e.g., "₹1,234.56")
 */
export const formatAmount = (value, decimals = 2) => {
  return `₹${formatNumber(value, decimals)}`;
};

/**
 * Format MRP (Maximum Retail Price) with rupee symbol
 * @param {number|string} value - The MRP to format
 * @returns {string} Formatted MRP with ₹ symbol (e.g., "₹999.00")
 */
export const formatMRP = (value) => {
  return formatAmount(value, 2);
};

/**
 * Format total amount with rupee symbol
 * @param {number|string} value - The total to format
 * @returns {string} Formatted total with ₹ symbol (e.g., "₹5,432.10")
 */
export const formatTotal = (value) => {
  return formatAmount(value, 2);
};

/**
 * Format quantity display
 * @param {number|string} value - The quantity to format
 * @param {string} unit - Unit to display (default: 'pcs')
 * @param {boolean} showUnit - Whether to show unit (default: true)
 * @returns {string} Formatted quantity (e.g., "10 pcs" or "10")
 */
export const formatQuantity = (value, unit = 'pcs', showUnit = true) => {
  const qty = parseNumber(value, 0);
  return showUnit ? `${qty} ${unit}` : `${qty}`;
};

/**
 * Format item count display
 * @param {number|string} count - The count to format
 * @returns {string} Formatted count (e.g., "5 items")
 */
export const formatItemCount = (count) => {
  const num = parseNumber(count, 0);
  return `${num} ${num === 1 ? 'item' : 'items'}`;
};

/**
 * Format rate/price per unit
 * @param {number|string} value - The rate to format
 * @returns {string} Formatted rate with ₹ symbol
 */
export const formatRate = (value) => {
  return formatAmount(value, 2);
};

/**
 * Calculate and format line total (quantity × price)
 * @param {number|string} quantity - Quantity
 * @param {number|string} price - Price per unit
 * @returns {string} Formatted line total with ₹ symbol
 */
export const formatLineTotal = (quantity, price) => {
  const qty = parseNumber(quantity, 0);
  const prc = parseNumber(price, 0);
  const total = qty * prc;
  return formatAmount(total, 2);
};

// ===================
// LABEL CONSTANTS
// ===================

/**
 * Standard label texts for common fields
 */
export const LABELS = {
  AMOUNT: 'Amount',
  TOTAL_AMOUNT: 'Total Amount',
  MRP: 'MRP',
  PRICE: 'Price',
  RATE: 'Rate',
  QUANTITY: 'Quantity',
  QTY: 'Qty',
  ITEMS: 'Items',
  TOTAL: 'Total',
  SUBTOTAL: 'Subtotal',
  GRAND_TOTAL: 'Grand Total',
};
