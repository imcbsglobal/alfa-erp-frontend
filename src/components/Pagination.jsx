export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = "records",
  colorScheme = "teal" // "teal" or "orange"
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;

  if (totalItems === 0) return null;

  // Color configurations
  const colors = {
    teal: {
      active: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md",
      hover: "hover:bg-teal-50 hover:text-teal-600"
    },
    orange: {
      active: "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md",
      hover: "hover:bg-orange-50 hover:text-orange-600"
    }
  };

  const scheme = colors[colorScheme] || colors.teal;

  return (
    <div className="flex items-center justify-between px-4 py-4 bg-gray-50 border-t border-gray-200">
      {/* Row Count */}
      <p className="text-sm text-gray-600">
        Showing <b>{indexOfFirst + 1}</b> to <b>{Math.min(indexOfLast, totalItems)}</b> of{" "}
        <b>{totalItems}</b> {label}
      </p>

      {/* Pagination Buttons */}
      <div className="flex items-center gap-2">
        {/* Prev Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-2 rounded-lg transition-all ${
            currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : `bg-white border border-gray-300 text-gray-700 ${scheme.hover}`
          }`}
        >
          ‹
        </button>

        {/* Page Numbers */}
        {[...Array(totalPages)].map((_, i) => {
          const page = i + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === page
                  ? scheme.active
                  : `bg-white border border-gray-300 text-gray-700 ${scheme.hover}`
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 rounded-lg transition-all ${
            currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : `bg-white border border-gray-300 text-gray-700 ${scheme.hover}`
          }`}
        >
          ›
        </button>
      </div>
    </div>
  );
}