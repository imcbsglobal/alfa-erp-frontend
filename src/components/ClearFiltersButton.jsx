import React from 'react';
import { X } from 'lucide-react';

export default function ClearFiltersButton({ onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="ml-2 text-gray-500 hover:text-gray-700 transition-colors"
      title="Clear all filters"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
