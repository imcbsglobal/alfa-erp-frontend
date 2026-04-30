import React from 'react';
import { X } from 'lucide-react';

export default function ClearFiltersButton({ onClear, activeCount = 0 }) {
  if (activeCount === 0) return null;

  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
      title="Clear all filters"
    >
      <X size={14} />
      Clear ({activeCount})
    </button>
  );
}
