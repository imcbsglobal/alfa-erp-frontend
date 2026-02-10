import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";

export default function BoxAssignmentPage() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [nextBoxId, setNextBoxId] = useState(1);
  const [completing, setCompleting] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [assignQuantity, setAssignQuantity] = useState("");

  useEffect(() => {
    loadBillDetails();
  }, [invoiceNo]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/packing/bill/${invoiceNo}/`);
      setBill(res.data?.data);
      
      // Initialize one box by default
      addNewBox();
    } catch (err) {
      console.error("Failed to load bill details", err);
      toast.error("Failed to load bill details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const generateBoxId = () => {
    const billPrefix = invoiceNo.toString().slice(-4).padStart(4, '0');
    const boxNum = nextBoxId.toString().padStart(3, '0');
    return `BOX-${billPrefix}-${boxNum}`;
  };

  const addNewBox = () => {
    const newBox = {
      id: Date.now(),
      boxId: generateBoxId(),
      items: [], // Array of {itemId, itemName, quantity}
    };
    setBoxes(prev => [...prev, newBox]);
    setNextBoxId(prev => prev + 1);
  };

  const removeBox = (boxId) => {
    if (boxes.length === 1) {
      toast.error("You must have at least one box");
      return;
    }
    
    const box = boxes.find(b => b.id === boxId);
    if (box.items.length > 0) {
      if (!window.confirm("This box contains items. Are you sure you want to remove it? Items will become unassigned.")) {
        return;
      }
    }
    
    setBoxes(prev => prev.filter(b => b.id !== boxId));
  };

  const getTotalAssignedForItem = (itemId) => {
    let total = 0;
    boxes.forEach(box => {
      box.items.forEach(assignment => {
        if (assignment.itemId === itemId) {
          total += assignment.quantity;
        }
      });
    });
    return total;
  };

  const getRemainingQuantityForItem = (itemId) => {
    const item = bill?.items?.find(i => i.id === itemId);
    if (!item) return 0;
    const totalRequired = item.quantity || item.qty || 0;
    const totalAssigned = getTotalAssignedForItem(itemId);
    return totalRequired - totalAssigned;
  };

  const handleAssignItem = () => {
    if (!selectedItem || !selectedBox || !assignQuantity) {
      toast.error("Please select an item, box, and enter quantity");
      return;
    }

    const quantity = parseFloat(assignQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const remaining = getRemainingQuantityForItem(selectedItem.id);
    if (quantity > remaining) {
      toast.error(`Cannot assign ${quantity}. Only ${remaining} remaining.`);
      return;
    }

    // Add item to box
    setBoxes(prev => prev.map(box => {
      if (box.id === selectedBox.id) {
        // Check if item already exists in this box
        const existingIdx = box.items.findIndex(i => i.itemId === selectedItem.id);
        if (existingIdx >= 0) {
          // Update existing assignment
          const updatedItems = [...box.items];
          updatedItems[existingIdx].quantity += quantity;
          return { ...box, items: updatedItems };
        } else {
          // Add new assignment
          return {
            ...box,
            items: [...box.items, {
              itemId: selectedItem.id,
              itemName: selectedItem.name || selectedItem.item_name,
              itemCode: selectedItem.code,
              quantity: quantity,
            }]
          };
        }
      }
      return box;
    }));

    toast.success(`Assigned ${quantity} to ${selectedBox.boxId}`);
    setAssignQuantity("");
    setSelectedItem(null);
  };

  const handleRemoveItemFromBox = (boxId, itemId) => {
    setBoxes(prev => prev.map(box => {
      if (box.id === boxId) {
        return {
          ...box,
          items: box.items.filter(i => i.itemId !== itemId)
        };
      }
      return box;
    }));
    toast.success("Item removed from box");
  };

  const validateBoxes = () => {
    const validationErrors = [];

    // Check if there are any boxes
    if (boxes.length === 0) {
      validationErrors.push("You must create at least one box");
      return validationErrors;
    }

    // Check for empty boxes
    const emptyBoxes = boxes.filter(box => box.items.length === 0);
    if (emptyBoxes.length > 0) {
      validationErrors.push(`${emptyBoxes.length} box(es) are empty. Please remove empty boxes or assign items to them.`);
    }

    // Check if all items are fully assigned
    bill?.items?.forEach(item => {
      const remaining = getRemainingQuantityForItem(item.id);
      if (remaining > 0) {
        validationErrors.push(`Item "${item.name || item.item_name}" has ${remaining} units unassigned`);
      } else if (remaining < 0) {
        validationErrors.push(`Item "${item.name || item.item_name}" is over-assigned by ${Math.abs(remaining)} units`);
      }
    });

    return validationErrors;
  };

  const handleCompletePacking = async () => {
    // Validate
    const validationErrors = validateBoxes();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix validation errors before completing");
      return;
    }

    setErrors([]);

    try {
      setCompleting(true);

      // Prepare box data for backend
      const boxData = boxes.map(box => ({
        box_id: box.boxId,
        items: box.items.map(item => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_code: item.itemCode,
          quantity: item.quantity,
        }))
      }));

      await api.post("/sales/packing/complete-packing/", {
        invoice_no: invoiceNo,
        boxes: boxData,
      });

      toast.success("Packing completed successfully!");
      
      // Navigate to label printing page
      navigate(`/packing/print-labels/${invoiceNo}`);
      
    } catch (err) {
      console.error("Complete packing error:", err);
      toast.error(err.response?.data?.message || "Failed to complete packing");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Bill not found</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-2 py-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Box Assignment</h1>
              <p className="text-sm text-gray-600">Invoice: #{bill.invoice_no}</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
          </div>

          {/* Customer Info */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <p><strong>Customer:</strong> {bill.customer?.name || bill.customer_name}</p>
            <p><strong>Address:</strong> {bill.customer?.address || bill.customer_address || "-"}</p>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Validation Errors
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Items List */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Items ({bill.items?.length || 0})
            </h2>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {bill.items?.map((item) => {
                const totalRequired = item.quantity || item.qty || 0;
                const totalAssigned = getTotalAssignedForItem(item.id);
                const remaining = totalRequired - totalAssigned;
                const isFullyAssigned = remaining === 0;
                const isOverAssigned = remaining < 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isFullyAssigned && setSelectedItem(item)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedItem?.id === item.id
                        ? "border-teal-500 bg-teal-50"
                        : isFullyAssigned
                        ? "border-green-500 bg-green-50"
                        : isOverAssigned
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {item.name || item.item_name}
                        </p>
                        {item.code && (
                          <p className="text-xs text-gray-600">Code: {item.code}</p>
                        )}
                      </div>
                      {isFullyAssigned && (
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Required:</span>
                      <span className="font-bold">{formatQuantity(totalRequired, 'pcs')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Assigned:</span>
                      <span className={`font-bold ${
                        isFullyAssigned ? "text-green-600" : 
                        isOverAssigned ? "text-red-600" : 
                        "text-amber-600"
                      }`}>
                        {formatQuantity(totalAssigned, 'pcs')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-bold ${
                        isFullyAssigned ? "text-green-600" : 
                        isOverAssigned ? "text-red-600" : 
                        "text-amber-600"
                      }`}>
                        {formatQuantity(remaining, 'pcs')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boxes Management */}
          <div className="space-y-4">
            {/* Assignment Control */}
            {selectedItem && (
              <div className="bg-teal-50 border-2 border-teal-500 rounded-lg p-4">
                <h3 className="font-semibold text-teal-900 mb-3">Assign Item to Box</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selected Item:
                    </label>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedItem.name || selectedItem.item_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Remaining: {formatQuantity(getRemainingQuantityForItem(selectedItem.id), 'pcs')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Box:
                    </label>
                    <select
                      value={selectedBox?.id || ""}
                      onChange={(e) => {
                        const box = boxes.find(b => b.id === parseInt(e.target.value));
                        setSelectedBox(box);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Select a box --</option>
                      {boxes.map(box => (
                        <option key={box.id} value={box.id}>
                          {box.boxId} ({box.items.length} items)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity:
                    </label>
                    <input
                      type="number"
                      value={assignQuantity}
                      onChange={(e) => setAssignQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAssignItem}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setSelectedBox(null);
                        setAssignQuantity("");
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Boxes List */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  Boxes ({boxes.length})
                </h2>
                <button
                  onClick={addNewBox}
                  className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-semibold"
                >
                  + Add Box
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {boxes.map(box => (
                  <div key={box.id} className="border-2 border-gray-300 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{box.boxId}</h3>
                      <button
                        onClick={() => removeBox(box.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </div>

                    {box.items.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No items assigned</p>
                    ) : (
                      <div className="space-y-1">
                        {box.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{item.itemName}</p>
                              {item.itemCode && (
                                <p className="text-xs text-gray-600">Code: {item.itemCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="font-bold text-teal-700">
                                {formatQuantity(item.quantity, 'pcs')}
                              </span>
                              <button
                                onClick={() => handleRemoveItemFromBox(box.id, item.itemId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={handleCompletePacking}
              disabled={completing}
              className="w-full py-4 bg-teal-600 text-white rounded-lg text-lg font-bold hover:bg-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Complete Packing"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
