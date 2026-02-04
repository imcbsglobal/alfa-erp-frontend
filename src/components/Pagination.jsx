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

  // Generate page numbers to display (max 5 visible pages)
  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of middle section
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        start = 2;
        end = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs">
      {/* Row Count */}
      <p className="text-xs text-gray-500 whitespace-nowrap">
        Showing <b>{indexOfFirst + 1}</b> to <b>{Math.min(indexOfLast, totalItems)}</b> of{" "}
        <b>{totalItems}</b> {label}
      </p>

      {/* Pagination Buttons */}
      <div className="flex items-center gap-0.5">
        {/* Prev Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-1.5 py-0.5 rounded-md text-[11px] transition-all ${
            currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : `bg-white border border-gray-300 text-gray-700 ${scheme.hover}`
          }`}
        >
          ‹
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-4 py-2 text-gray-500"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-2 py-0.5 min-w-[26px] rounded-md text-[11px] font-medium transition-all ${
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
          className={`px-1.5 py-0.5 rounded-md text-[11px] transition-all ${
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