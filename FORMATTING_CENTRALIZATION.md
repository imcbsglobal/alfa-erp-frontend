# Formatting Centralization - Implementation Summary

## Overview
All date and number formatting across the application has been centralized into a single utility file for consistency, maintainability, and easier updates.

## Location
**File:** `src/utils/formatters.js`

## Available Formatters

### Number Formatting

#### `formatNumber(value, decimals=2, fallback="0.00")`
- Formats numbers to fixed decimal places
- Handles invalid values gracefully
- **Replaces:** `.toFixed()` calls throughout the app
- **Example:** `formatNumber(123.456)` → `"123.46"`

#### `formatCurrency(value, decimals=2)`
- Formats number with rupee symbol (₹)
- **Example:** `formatCurrency(1234.56)` → `"₹1234.56"`

#### `formatNumberWithSeparator(value)`
- Adds thousand separators (Indian format)
- **Example:** `formatNumberWithSeparator(1234567)` → `"12,34,567"`

#### `formatFileSize(sizeInBytes, decimals=1)`
- Converts bytes to KB format
- **Replaces:** `(size / 1024).toFixed(1) + ' KB'`
- **Example:** `formatFileSize(2048)` → `"2.0 KB"`

#### `formatCoordinate(coordinate, decimals=6)`
- Formats latitude/longitude coordinates
- **Example:** `formatCoordinate(12.345678)` → `"12.345678"`

### Date & Time Formatting

#### `formatDate(dateValue, locale='en-IN', options={})`
- General date formatter with customizable options
- **Replaces:** `.toLocaleDateString()` calls
- **Example:** `formatDate('2024-01-15')` → `"15/01/2024"` (en-IN)

#### `formatDateTime(dateValue, locale='en-IN', options={})`
- Formats date with time
- **Replaces:** `.toLocaleString()` calls
- **Example:** `formatDateTime('2024-01-15T10:30:00')` → `"15/01/2024, 10:30:00 am"`

#### `formatTime(dateValue, locale='en-IN')`
- Formats time only
- **Replaces:** `.toLocaleTimeString()` calls
- **Example:** `formatTime('2024-01-15T10:30:00')` → `"10:30:00 am"`

#### `formatDateDDMMYYYY(dateValue)`
- Standard date format (DD/MM/YYYY)
- **Replaces:** Manual date splitting and formatting
- **Example:** `formatDateDDMMYYYY('2024-01-15')` → `"15/01/2024"`

#### `formatDateMMDDYYYY(dateValue)`
- US date format (MM/DD/YYYY)
- **Example:** `formatDateMMDDYYYY('2024-01-15')` → `"01/15/2024"`

#### `formatInvoiceDate(dateValue)`
- Specifically for invoice dates (DD/MM/YYYY)
- Consistent format across all invoices

#### `formatDetailedDateTime(dateValue, locale='en-US')`
- Detailed date-time with month name
- **Example:** `formatDetailedDateTime('2024-01-15T10:30:00')` → `"Jan 15, 2024, 10:30 AM"`

### Utility Functions

#### `formatDuration(startTime, endTime)`
- Calculates and formats duration between two times
- **Returns:** `"2h 30m"` or `"45m"` format
- Handles ongoing/in-progress scenarios

#### `getTodayISOString()`
- Returns today's date in ISO format (YYYY-MM-DD)
- **Replaces:** `new Date().toISOString().split('T')[0]`

#### `parseNumber(value, defaultValue=0)`
- Safely parses numbers with fallback
- Validates and returns finite numbers only

## Files Updated

### Components
- ✅ `ConsolidateDetailModal.jsx`
- ✅ `InvoiceDetailModal.jsx`
- ✅ `PackingDetailModal.jsx`
- ✅ `DeliveryDetailModal.jsx`
- ✅ `CommonInvoiceView.jsx`

### Pages

#### Billing
- ✅ `BillingInvoiceListPage.jsx`
- ✅ `BillingInvoiceViewPage.jsx`
- ✅ `BillingReviewedListPage.jsx`

#### Delivery
- ✅ `CourierDeliveryListPage.jsx`
- ✅ `CompanyDeliveryListPage.jsx`
- ✅ `DeliveryDispatchPage.jsx`
- ✅ `DeliveryModal.jsx`

#### Invoice & Packing
- ✅ `InvoiceListPage.jsx` (already using)
- ✅ `PackingInvoiceListPage.jsx` (already using)

## Migration Patterns

### Before (Old Pattern)
```javascript
// Local formatting functions
const formatMoney = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Usage
<p>{Number(item.mrp || 0).toFixed(2)}</p>
<p>{new Date(invoice.date).toLocaleDateString()}</p>
```

### After (New Pattern)
```javascript
// Import centralized formatters
import { formatNumber, formatDetailedDateTime, formatDateDDMMYYYY } from '../../../utils/formatters';

// Usage
<p>{formatNumber(item.mrp)}</p>
<p>{formatDateDDMMYYYY(invoice.date)}</p>
```

## Benefits

1. **Consistency:** All dates and numbers formatted uniformly across the app
2. **Maintainability:** Single source of truth for formatting logic
3. **Easy Updates:** Change format once, applies everywhere
4. **Reduced Code:** No duplicate formatting functions
5. **Error Handling:** Centralized null/undefined handling
6. **Type Safety:** Proper validation in one place
7. **Localization Ready:** Easy to switch locales globally

## Usage Examples

### In a Component
```javascript
import { 
  formatNumber, 
  formatCurrency,
  formatDateDDMMYYYY, 
  formatDateTime,
  formatTime 
} from '../utils/formatters';

function InvoiceCard({ invoice }) {
  return (
    <div>
      <h3>{invoice.invoice_no}</h3>
      <p>Date: {formatDateDDMMYYYY(invoice.date)}</p>
      <p>Time: {formatTime(invoice.created_at)}</p>
      <p>Total: {formatCurrency(invoice.total)}</p>
      <p>Items: {invoice.items.length}</p>
    </div>
  );
}
```

### In a Table
```javascript
<td>{formatNumber(item.mrp)}</td>
<td>{formatDateDDMMYYYY(item.expiry_date)}</td>
<td>{formatCurrency(item.total)}</td>
```

### With Custom Options
```javascript
// Custom date format
{formatDate(invoice.date, 'en-GB', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
// Output: "Monday, 15 January 2024"

// Custom number format
{formatNumber(value, 3, '---')} // 3 decimals, '---' as fallback
```

## Notes

- All formatters handle `null`, `undefined`, and invalid inputs gracefully
- Date formatters return `"-"` for invalid dates
- Number formatters return `"0.00"` (or custom fallback) for invalid numbers
- The `en-IN` locale is used by default for Indian formatting standards
- Times are formatted in 12-hour format with AM/PM by default

## Future Enhancements

Potential additions to consider:
- `formatRelativeTime()` - "2 hours ago", "yesterday"
- `formatPercentage()` - Format numbers as percentages
- `formatPhone()` - Format phone numbers
- `formatCreditCard()` - Format card numbers
- Custom currency symbol support for multi-currency
- Date range formatters
- Fiscal year formatters

## Testing

To test the formatters:
```javascript
import * as formatters from './utils/formatters';

// Test number formatting
console.log(formatters.formatNumber(1234.567)); // "1234.57"
console.log(formatters.formatCurrency(1234.56)); // "₹1234.56"

// Test date formatting
console.log(formatters.formatDateDDMMYYYY('2024-01-15')); // "15/01/2024"
console.log(formatters.formatTime('2024-01-15T10:30:00')); // "10:30:00 am"
```

---

**Last Updated:** January 26, 2026
**Status:** ✅ Fully Implemented
