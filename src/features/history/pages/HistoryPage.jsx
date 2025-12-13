import { useState } from "react";
import PickingHistory from "./PickingHistory";
import PackingHistory from "./PackingHistory";
import DeliveryHistory from "./DeliveryHistory";

export default function HistoryPage() {
  const [tab, setTab] = useState("picking");

  const tabBtn = (label, id) => (
    <button
      onClick={() => setTab(id)}
      className={`px-6 py-2 rounded-lg font-semibold border transition-all
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
    
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-1">History</h1>
      <p className="text-gray-600">Track picking, packing & delivery activity</p>
      <br></br>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {tabBtn("Picking", "picking")}
        {tabBtn("Packing", "packing")}
        {tabBtn("Delivery", "delivery")}
      </div>

      {tab === "picking" && <PickingHistory />}
      {tab === "packing" && <PackingHistory />}
      {tab === "delivery" && <DeliveryHistory />}
    </div>
  );
}
