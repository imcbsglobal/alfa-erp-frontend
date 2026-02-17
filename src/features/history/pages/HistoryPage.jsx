import { useState } from "react";
import PickingHistory from "./PickingHistory";
import PackingHistory from "./PackingHistory";
import DeliveryHistory from "./DeliveryHistory";

export default function HistoryPage() {
  const [tab, setTab] = useState("picking");

  const tabBtn = (label, id) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 sm:px-6 py-2 rounded-lg font-semibold border transition-all
        ${
          tab === id
            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Consolidate
          </h1>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {tabBtn("Picking", "picking")}
            {tabBtn("Packing", "packing")}
            {tabBtn("Delivery", "delivery")}
          </div>
        </div>

      {/* Tab Content */}
      {tab === "picking" && <PickingHistory />}
      {tab === "packing" && <PackingHistory />}
      {tab === "delivery" && <DeliveryHistory />}
    </div>
  );
}