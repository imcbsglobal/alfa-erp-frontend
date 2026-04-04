// src/features/master/pages/AddCourierPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { createCourier } from "../../../services/sales";

export default function AddCourierPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    courier_code: "",
    courier_name: "",
    courier_logo: null,
    type: "EXTERNAL",
    contact_person: "",
    phone: "",
    alt_phone: "",
    email: "",
    address: "",
    cod_supported: false,
    status: "ACTIVE",
    remarks: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  const canManageCouriers =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    if (!canManageCouriers) {
      toast.error("You don't have permission to add couriers");
      navigate("/master/courier");
    }
  }, [canManageCouriers, navigate]);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.courier_code.trim()) newErrors.courier_code = "Courier code is required";
    if (!formData.courier_name.trim()) newErrors.courier_name = "Courier name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setFormData((prev) => ({ ...prev, courier_logo: null }));
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
        setLogoPreview("");
      }
      if (errors.courier_logo) {
        setErrors((prev) => ({ ...prev, courier_logo: "" }));
      }
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, courier_logo: "Please select an image file." }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, courier_logo: "Image must be 5MB or smaller." }));
      return;
    }

    setFormData((prev) => ({ ...prev, courier_logo: file }));
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    if (errors.courier_logo) {
      setErrors((prev) => ({ ...prev, courier_logo: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
      };

      await createCourier(payload);

      toast.success("Courier created successfully");

      setFormData({
        courier_code: "",
        courier_name: "",
        courier_logo: null,
        type: "EXTERNAL",
        contact_person: "",
        phone: "",
        alt_phone: "",
        email: "",
        address: "",
        cod_supported: false,
        status: "ACTIVE",
        remarks: "",
      });
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
        setLogoPreview("");
      }

      navigate("/master/courier");
    } catch (error) {
      console.error(
        "Create courier error:",
        error.response?.status,
        error.response?.data
      );
      toast.error("Failed to create courier");
      setErrors((prev) => ({
        ...prev,
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!canManageCouriers) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Add Courier</h1>
          <button
            onClick={() => navigate("/master/courier")}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p>{errors.general}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Courier Code *</label>
                  <input
                    type="text"
                    name="courier_code"
                    value={formData.courier_code}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border ${errors.courier_code ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none`}
                    placeholder="e.g., CRR001"
                  />
                  {errors.courier_code && <p className="mt-1 text-xs text-red-600">{errors.courier_code}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Courier Name *</label>
                  <input
                    type="text"
                    name="courier_name"
                    value={formData.courier_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border ${errors.courier_name ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none`}
                    placeholder="e.g., FedEx, DHL"
                  />
                  {errors.courier_name && <p className="mt-1 text-xs text-red-600">{errors.courier_name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="EXTERNAL">External</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Courier Logo</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full sm:w-auto text-sm text-gray-700 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    />
                    {formData.courier_logo && (
                      <img
                        src={logoPreview}
                        alt="Courier logo preview"
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                      />
                    )}
                  </div>
                  {errors.courier_logo && <p className="mt-1 text-xs text-red-600">{errors.courier_logo}</p>}
                  <p className="mt-1 text-xs text-gray-400">Optional. JPG, PNG, WEBP up to 5MB.</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Contact name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border ${errors.phone ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none`}
                    placeholder="Phone number"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alt Phone</label>
                  <input
                    type="text"
                    name="alt_phone"
                    value={formData.alt_phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Alternate phone"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border ${errors.email ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none`}
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Full address"
                  />
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b">Additional Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="cod_supported"
                    name="cod_supported"
                    checked={formData.cod_supported}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="cod_supported" className="ml-2 text-sm font-medium text-gray-700">
                    COD Supported
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Additional notes"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    courier_code: "",
                    courier_name: "",
                    courier_logo: null,
                    type: "EXTERNAL",
                    contact_person: "",
                    phone: "",
                    alt_phone: "",
                    email: "",
                    address: "",
                    cod_supported: false,
                    status: "ACTIVE",
                    remarks: "",
                  });
                  if (logoPreview) {
                    URL.revokeObjectURL(logoPreview);
                    setLogoPreview("");
                  }
                  setErrors({});
                }}
                className="sm:flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="sm:flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Courier
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