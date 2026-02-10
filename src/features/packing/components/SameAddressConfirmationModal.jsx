export default function SameAddressConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  billNo,
  customerName,
  address,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Same Delivery Address?</h2>
          <p className="text-teal-50 text-sm mt-1">
            Bill #{billNo}
          </p>
        </div>

        <div className="p-6">
          {/* Customer Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Customer</p>
            <p className="font-semibold text-gray-800 mb-3">{customerName}</p>
            
            <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
            <p className="text-gray-800">{address || "No address provided"}</p>
          </div>

          {/* Question */}
          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
            <p className="text-gray-800 font-semibold mb-2">
              Are there other bills with the same delivery address?
            </p>
            <p className="text-sm text-gray-600">
              This helps in consolidating multiple bills for the same address during packing.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all shadow-md"
            >
              Yes, there are
            </button>
            <button
              onClick={() => onConfirm(false)}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all shadow-md"
            >
              No, proceed
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
