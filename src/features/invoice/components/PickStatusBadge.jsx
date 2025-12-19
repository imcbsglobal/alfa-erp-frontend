// src/features/invoice/components/PickStatusBadge.jsx
export default function PickStatusBadge({ status, pickedBy }) {
  let bg = "";
  let text = "";
  let label = "";

  switch (status) {
    case "Pending":
      bg = "bg-gray-200";
      text = "text-gray-800";
      label = "Pending";
      break;
    case "Picked":
      bg = "bg-yellow-100";
      text = "text-yellow-700";
      label = `Picked by ${pickedBy}`;
      break;
    case "ReadyForPacking":
      bg = "bg-blue-100";
      text = "text-blue-700";
      label = "Ready For Packing";
      break;
    case "Packed":
      bg = "bg-purple-100";
      text = "text-purple-700";
      label = "Packed";
      break;
    case "Delivered":
      bg = "bg-green-100";
      text = "text-green-700";
      label = "Delivered";
      break;
    default:
      bg = "bg-gray-100";
      text = "text-gray-800";
      label = status;
  }

  return (
    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${bg} ${text} whitespace-nowrap`}>
      {label}
    </span>
  );
}