import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { createTray } from "../../../services/master";

export default function AddTrayPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    tray_code: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const canManageTrays = currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    if (!canManageTrays) {
      toast.error("You don't have permission to add trays");
      navigate("/master/tray");
    }
  }, [canManageTrays, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.tray_code.trim()) newErrors.tray_code = "Tray code is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await createTray(formData);
      toast.success("Tray created successfully");
      setFormData({
        tray_code: "",
        tray_name: "",
        description: "",
        status: "ACTIVE",
        remarks: "",
      });
      navigate("/master/tray");
    } catch (err) {
      toast.error("Failed to create tray");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ tray_code: "", remarks: "" });
    setErrors({});
  };

  if (!canManageTrays) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Add Tray</h1>
          </div>
          <button
            onClick={() => navigate("/master/tray")}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tray Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tray Code *</label>
              <input
                type="text"
                name="tray_code"
                value={formData.tray_code}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${errors.tray_code ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                placeholder="e.g., TRAY001"
              />
              {errors.tray_code && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.tray_code}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                placeholder="Remarks (optional)"
                rows={2}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Tray
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
