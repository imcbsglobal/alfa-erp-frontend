import { useEffect, useState } from "react";
import { X, User, Mail, Phone, Clock, CheckCircle, Package, Truck, FileText, AlertTriangle } from "lucide-react";
import { formatDetailedDateTime } from "../utils/formatters";

export default function ConsolidateDetailModal({ isOpen, onClose, invoiceNo, invoiceData }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!isOpen || !invoiceNo || !invoiceData) return;

    setLoading(false);

    if (invoiceData.delivery) {
      setActiveSection("delivery");
    } else if (invoiceData.packing) {
      setActiveSection("packing");
    } else if (invoiceData.picking) {
      setActiveSection("picking");
    }
  }, [isOpen, invoiceNo, invoiceData]);

  if (!isOpen) return null;

  const formatDuration = (minutes) => {
    const num = Number(minutes);

    if (!Number.isFinite(num) || num <= 0) return "-";

    if (num < 60) return `${Math.round(num)} min`;

    const hours = Math.floor(num / 60);
    const mins = Math.round(num % 60);

    return `${hours}h ${mins}m`;
  };


  const statusBadge = (status) => {
    const styles = {
      PREPARING: "bg-yellow-100 text-yellow-700",
      PICKED: "bg-green-100 text-green-700",
      VERIFIED: "bg-blue-100 text-blue-700",
      PENDING: "bg-gray-100 text-gray-700",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700",
      PACKED: "bg-blue-100 text-blue-700",
      PACKING: "bg-blue-100 text-blue-700",
      IN_TRANSIT: "bg-blue-100 text-blue-700",
      DELIVERED: "bg-green-100 text-green-700",
    };

    if (!status) return <span className="text-gray-400 text-xs">Not Started</span>;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const getStepStatus = (step) => {
    if (step === "picking") {
      return invoiceData.picking ? "completed" : "pending";
    }
    if (step === "packing") {
      return invoiceData.packing ? (invoiceData.delivery ? "completed" : "active") : "pending";
    }
    if (step === "delivery") {
      if (invoiceData.delivery?.delivery_status === "DELIVERED") return "completed";
      return invoiceData.delivery ? "active" : "pending";
    }
    return "pending";
  };

  const isRepick = typeof invoiceData.picking?.notes === "string" &&
    invoiceData.picking.notes.includes("[RE-PICK]");

  // Helper function to get return info for a specific stage
  const getReturnInfo = (stage) => {
    if (!invoiceData.return_info) return null;
    
    // Check if the return is from this specific stage
    const returnFrom = invoiceData.return_info.returned_from_section?.toLowerCase();
    if (returnFrom && returnFrom.includes(stage.toLowerCase())) {
      return invoiceData.return_info;
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Invoice: {invoiceNo}
              {isRepick && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                  RE-PICK
                </span>
              )}
              {invoiceData.return_info && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  RETURNED
                </span>
              )}
            </h2>
            <p className="text-teal-50 text-xs mt-0.5">Complete Order History</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading details...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* CUSTOMER INFO */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-gray-500" />
                    <span className="font-medium text-gray-900">{invoiceData.customer_name}</span>
                  </div>
                  {invoiceData.customer_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-gray-500" />
                      <span className="text-gray-700">{invoiceData.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-500" />
                    <span className="text-gray-700">{invoiceData.customer_email}</span>
                  </div>
                </div>
              </div>

              {/* RETURN ALERT - Show if invoice was returned */}
              {invoiceData.return_info && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 mb-2">Invoice Returned for Review</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-red-800">Returned From:</span>
                          <span className="ml-2 text-red-700">{invoiceData.return_info.returned_from_section}</span>
                        </div>
                        <div>
                          <span className="font-medium text-red-800">Returned By:</span>
                          <span className="ml-2 text-red-700">
                            {invoiceData.return_info.returned_by_name || invoiceData.return_info.returned_by_email}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-red-800">Reason:</span>
                          <p className="mt-1 text-red-700 bg-red-100 p-2 rounded">
                            {invoiceData.return_info.return_reason}
                          </p>
                        </div>
                        {invoiceData.return_info.returned_at && (
                          <div>
                            <span className="font-medium text-red-800">Returned At:</span>
                            <span className="ml-2 text-red-700">{formatDetailedDateTime(invoiceData.return_info.returned_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROGRESS STEPPER - CLICKABLE */}
              <div className="flex items-center justify-center gap-3 py-4">
                {/* PICKING STEP */}
                <button
                  onClick={() => invoiceData.picking && setActiveSection("picking")}
                  disabled={!invoiceData.picking}
                  className={`flex flex-col items-center ${invoiceData.picking ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center relative transition-all ${
                      getStepStatus("picking") === "completed"
                        ? "bg-teal-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    } ${activeSection === "picking" ? "ring-4 ring-teal-200" : ""}`}
                  >
                    {getStepStatus("picking") === "completed" ? (
                      <CheckCircle size={24} />
                    ) : (
                      <Package size={24} />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow">
                      1
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1.5 text-gray-700">Picking</p>
                </button>

                {/* LINE */}
                <div
                  className={`h-0.5 w-16 ${
                    invoiceData.packing ? "bg-teal-500" : "bg-gray-300"
                  }`}
                ></div>

                {/* PACKING STEP */}
                <button
                  onClick={() => invoiceData.packing && setActiveSection("packing")}
                  disabled={!invoiceData.packing}
                  className={`flex flex-col items-center ${invoiceData.packing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center relative transition-all ${
                      getStepStatus("packing") === "active"
                        ? "bg-blue-500 text-white"
                        : getStepStatus("packing") === "completed"
                        ? "bg-teal-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    } ${activeSection === "packing" ? "ring-4 ring-blue-200" : ""}`}
                  >
                    {getStepStatus("packing") === "completed" ? (
                      <CheckCircle size={24} />
                    ) : (
                      <Package size={24} />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow">
                      2
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1.5 text-gray-700">Packing</p>
                </button>

                {/* LINE */}
                <div
                  className={`h-0.5 w-16 ${
                    invoiceData.delivery ? "bg-teal-500" : "bg-gray-300"
                  }`}
                ></div>

                {/* DELIVERY STEP */}
                <button
                  onClick={() => invoiceData.delivery && setActiveSection("delivery")}
                  disabled={!invoiceData.delivery}
                  className={`flex flex-col items-center ${invoiceData.delivery ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center relative transition-all ${
                      getStepStatus("delivery") === "completed"
                        ? "bg-teal-500 text-white"
                        : getStepStatus("delivery") === "active"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    } ${activeSection === "delivery" ? "ring-4 ring-blue-200" : ""}`}
                  >
                    {getStepStatus("delivery") === "completed" ? (
                      <CheckCircle size={24} />
                    ) : (
                      <Truck size={24} />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow">
                      3
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1.5 text-gray-700">Delivery</p>
                </button>
              </div>

              {/* TOGGLE BUTTON */}
              <div className="flex justify-center">
                <button
                  onClick={() => setActiveSection(activeSection ? null : (invoiceData.delivery ? "delivery" : invoiceData.packing ? "packing" : "picking"))}
                  className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                >
                  {activeSection ? "▲ Hide Details" : "▼ Show Details"}
                </button>
              </div>

              {/* SECTIONS */}
              {activeSection && (
                <div>
                  {/* PICKING SECTION */}
                  {activeSection === "picking" && invoiceData.picking && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-base text-gray-800">Picking Stage</h3>
                          {statusBadge(invoiceData.picking.picking_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <User size={14} />
                              <span className="font-medium text-xs">Assignee</span>
                            </div>
                            <p className="text-gray-900 font-semibold">{invoiceData.picking.picker_name}</p>
                            <p className="text-xs text-gray-500">{invoiceData.picking.picker_email}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Duration</span>
                            </div>
                            <p className="text-gray-900 font-semibold">{formatDuration(invoiceData.picking.duration)}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Start Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.picking.start_time)}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">End Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.picking.end_time)}</p>
                          </div>
                        </div>

                        {/* Return Info for Picking Stage */}
                        {getReturnInfo('picking') && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-red-600 mb-1.5">
                              <AlertTriangle size={14} />
                              <span className="font-medium text-xs">Return Reason</span>
                            </div>
                            <div className="bg-red-50 p-2.5 rounded border border-red-200">
                              <p className="text-red-900 text-xs font-medium mb-1">
                                Returned by: {getReturnInfo('picking').returned_by_name || getReturnInfo('picking').returned_by_email}
                              </p>
                              <p className="text-red-800 text-xs whitespace-pre-line">{getReturnInfo('picking').return_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Regular Notes */}
                        {invoiceData.picking.notes && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
                              <FileText size={14} />
                              <span className="font-medium text-xs">Notes</span>
                            </div>
                            <div className="bg-yellow-50 p-2.5 rounded border border-yellow-200">
                              <p className="text-gray-800 text-xs whitespace-pre-line">{invoiceData.picking.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PACKING SECTION */}
                  {activeSection === "packing" && invoiceData.packing && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-base text-gray-800">Packing Stage</h3>
                          {statusBadge(invoiceData.packing.packing_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <User size={14} />
                              <span className="font-medium text-xs">Assignee</span>
                            </div>
                            <p className="text-gray-900 font-semibold">{invoiceData.packing.packer_name}</p>
                            <p className="text-xs text-gray-500">{invoiceData.packing.packer_email}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Duration</span>
                            </div>
                            <p className="text-gray-900 font-semibold">{formatDuration(invoiceData.packing.duration)}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Start Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.packing.start_time)}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">End Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.packing.end_time)}</p>
                          </div>
                        </div>

                        {/* Return Info for Packing Stage */}
                        {getReturnInfo('packing') && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-red-600 mb-1.5">
                              <AlertTriangle size={14} />
                              <span className="font-medium text-xs">Return Reason</span>
                            </div>
                            <div className="bg-red-50 p-2.5 rounded border border-red-200">
                              <p className="text-red-900 text-xs font-medium mb-1">
                                Returned by: {getReturnInfo('packing').returned_by_name || getReturnInfo('packing').returned_by_email}
                              </p>
                              <p className="text-red-800 text-xs whitespace-pre-line">{getReturnInfo('packing').return_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Regular Notes */}
                        {invoiceData.packing.notes && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
                              <FileText size={14} />
                              <span className="font-medium text-xs">Notes</span>
                            </div>
                            <div className="bg-yellow-50 p-2.5 rounded border border-yellow-200">
                              <p className="text-gray-800 text-xs whitespace-pre-line">{invoiceData.packing.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DELIVERY SECTION */}
                  {activeSection === "delivery" && invoiceData.delivery && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-base text-gray-800">Delivery Stage</h3>
                          {statusBadge(invoiceData.delivery.delivery_status)}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Truck size={14} />
                              <span className="font-medium text-xs">Delivery Type</span>
                            </div>
                            <p className="text-gray-900 font-semibold">
                              {invoiceData.delivery.delivery_type === "COURIER" && "📦 Courier"}
                              {invoiceData.delivery.delivery_type === "INTERNAL" && "🚚 Company Delivery"}
                              {invoiceData.delivery.delivery_type === "DIRECT" && "🏪 Counter Pickup"}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Duration</span>
                            </div>
                            <p className="text-gray-900 font-semibold">{formatDuration(invoiceData.delivery.duration)}</p>
                          </div>

                          {invoiceData.delivery.delivery_type === "COURIER" && (
                            <>
                              <div>
                                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                  <Package size={14} />
                                  <span className="font-medium text-xs">Courier Name</span>
                                </div>
                                <p className="text-gray-900 font-semibold">{invoiceData.delivery.courier_name}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                  <FileText size={14} />
                                  <span className="font-medium text-xs">Tracking Number</span>
                                </div>
                                <p className="text-gray-900 font-mono text-xs">{invoiceData.delivery.tracking_no}</p>
                              </div>
                            </>
                          )}

                          {invoiceData.delivery.delivery_type === "INTERNAL" && (
                            <div>
                              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                <User size={14} />
                                <span className="font-medium text-xs">Driver</span>
                              </div>
                              <p className="text-gray-900 font-semibold">{invoiceData.delivery.delivery_user_name}</p>
                              <p className="text-xs text-gray-500">{invoiceData.delivery.delivery_user_email}</p>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">Start Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.delivery.start_time)}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Clock size={14} />
                              <span className="font-medium text-xs">End Time</span>
                            </div>
                            <p className="text-gray-900 text-xs">{formatDetailedDateTime(invoiceData.delivery.end_time)}</p>
                          </div>
                        </div>

                        {/* Return Info for Delivery Stage */}
                        {getReturnInfo('delivery') && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-red-600 mb-1.5">
                              <AlertTriangle size={14} />
                              <span className="font-medium text-xs">Return Reason</span>
                            </div>
                            <div className="bg-red-50 p-2.5 rounded border border-red-200">
                              <p className="text-red-900 text-xs font-medium mb-1">
                                Returned by: {getReturnInfo('delivery').returned_by_name || getReturnInfo('delivery').returned_by_email}
                              </p>
                              <p className="text-red-800 text-xs whitespace-pre-line">{getReturnInfo('delivery').return_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Regular Notes */}
                        {invoiceData.delivery.notes && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
                              <FileText size={14} />
                              <span className="font-medium text-xs">Notes</span>
                            </div>
                            <div className="bg-yellow-50 p-2.5 rounded border border-yellow-200">
                              <p className="text-gray-800 text-xs whitespace-pre-line">{invoiceData.delivery.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}