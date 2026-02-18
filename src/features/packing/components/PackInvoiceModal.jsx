export default function PackInvoiceModal({
  isOpen,
  onClose,
  onPack,
  invoiceNumber,
  customerName,
  title = "Start Packing",
  actionLabel = "Yes, Take This Bill",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-xl">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-teal-50 text-sm mt-1">
            Invoice: <span className="font-semibold">#{invoiceNumber}</span>
          </p>
          {customerName && (
            <p className="text-teal-100 text-xs mt-0.5">
              Customer: <span className="font-medium">{customerName}</span>
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-800 font-semibold text-base">
                Are you sure you want to take this bill for packing?
              </p>
              <p className="text-gray-500 text-sm mt-1">
                This bill will be assigned to you. Other staff won't be able to take it once you confirm.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              No, Cancel
            </button>
            <button
              type="button"
              onClick={onPack}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}