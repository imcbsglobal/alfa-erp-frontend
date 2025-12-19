// src/features/master/pages/AddJobTitlePage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { createJobTitle, getDepartments } from "../../../services/auth";

export default function AddJobTitlePage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    department_id: "",
  });

  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const canManageJobTitles =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    if (!canManageJobTitles) {
      toast.error("You don't have permission to add job titles");
      navigate("/master/job-title");
    } else {
      loadDepartments();
    }
  }, [canManageJobTitles, navigate]);

  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await getDepartments();

      const apiData = response?.data;
      let deptArray = [];

      if (Array.isArray(apiData?.data?.results)) {
        deptArray = apiData.data.results;
      } else if (Array.isArray(apiData?.results)) {
        deptArray = apiData.results;
      } else if (Array.isArray(apiData?.data)) {
        deptArray = apiData.data;
      }

      setDepartments(deptArray);
    } catch (err) {
      console.error("Failed to load departments:", err);
      toast.error("Failed to load departments");
    } finally {
      setLoadingDepartments(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Job title is required";
    if (!formData.department_id) newErrors.department_id = "Department is required";
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
      await createJobTitle({
        title: formData.title,
        department_id: formData.department_id,
      });

      toast.success("Job title created successfully");

      setFormData({
        title: "",
        department_id: "",
      });

      navigate("/master/job-title");
    } catch (error) {
      console.error("Create job title error:", error);
      toast.error("Failed to create job title");
      setErrors((prev) => ({
        ...prev,
        general: "Failed to create job title. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: "",
      department_id: "",
    });
    setErrors({});
  };

  if (!canManageJobTitles) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Add Job Title</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Create a new job title for Alfa Agencies
            </p>
          </div>

          <button
            onClick={() => navigate("/master/job-title")}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 sm:px-6 py-4 rounded-xl flex items-start gap-3">
            <svg
              className="w-6 h-6 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border ${
                  errors.title ? "border-red-300" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                placeholder="e.g., Sales Executive, HR Manager"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.title}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department *
              </label>
              {loadingDepartments ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2 text-gray-500">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-sm">Loading departments...</span>
                </div>
              ) : departments.length === 0 ? (
                <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                  No departments available. Please add departments first.
                </div>
              ) : (
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border ${
                    errors.department_id ? "border-red-300" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.department_id && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.department_id}
                </p>
              )}
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
                disabled={loading || loadingDepartments || departments.length === 0}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Job Title
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