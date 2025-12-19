import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  createUser,
  getUser,
  updateUser,
  uploadUserAvatar,
  getJobTitles,
} from "../../../services/auth";

export default function AddUserPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER",
    jobTitle: "",
    phone: "",
    status: "ACTIVE",
    avatar: "",
  });

  const [avatarFile, setavatarFile] = useState(null);
  const [jobTitles, setJobTitles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    loadJobTitles();
  }, []);

  const loadJobTitles = async () => {
    try {
      const res = await getJobTitles();

      const apiData = res?.data?.data;
      const titles = Array.isArray(apiData?.results) ? apiData.results : [];

      setJobTitles(titles);
    } catch (err) {
      console.error("Failed to load job titles:", err);
      setJobTitles([]);
    }
  };

  const canCreateAdmins = () => {
    if (currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN") {
      return true;
    }

    const permissionMap = JSON.parse(localStorage.getItem("userPermissions") || "{}");
    const userPermissions = currentUser?.email
      ? permissionMap[currentUser.email] || {}
      : {};

    return userPermissions["user-management"]?.view === true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchUser = async () => {
      setInitialLoading(true);
      try {
        const res = await getUser(id);
        const user = res.data?.data;

        setFormData((prev) => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          role: user.role || "USER",
          jobTitle: user.job_title || "",
          phone: user.phone || "",
          status: user.is_active ? "ACTIVE" : "INACTIVE",
          avatar: user.avatar || "",
          password: "",
          confirmPassword: "",
        }));
      } catch (error) {
        console.error("Failed to load user:", error);
        setErrors((prev) => ({
          ...prev,
          general: "Failed to load user details.",
        }));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUser();
  }, [id, isEditMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "status") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleavatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setavatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";

    if (!isEditMode) {
      if (!formData.password) newErrors.password = "Password required";
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.jobTitle.trim())
      newErrors.jobTitle = "Job title required";

    if (!formData.phone.trim()) newErrors.phone = "Phone required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors((prev) => ({ ...prev, general: "" }));

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        job_title: formData.jobTitle,
        phone: formData.phone,
        is_active: formData.status === "ACTIVE",
        created_by: currentUser?.email || null,
      };

      let res;

      if (!isEditMode) {
        payload.password = formData.password;

        res = await createUser(payload);

        if (avatarFile && res?.data?.data?.id) {
          await uploadUserAvatar(res.data.data.id, avatarFile);
        }

        toast.success("User created successfully!");
        navigate("/user-management");
      } else {
        if (formData.password) payload.password = formData.password;

        await updateUser(id, payload);

        if (avatarFile) {
          await uploadUserAvatar(id, avatarFile);
        }

        toast.success("User updated successfully!");
        navigate("/user-management");
      }
    } catch (error) {
      console.error("Create/Update user error:", error?.response?.data);
      toast.error("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate("/user-management");
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <br></br>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="mb-6 sm:mb-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {isEditMode ? "Edit User" : "Add New User"}
            </h1>
          </div>
          <button
            onClick={handleBackClick}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all w-full sm:w-auto"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
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
                d="M10 18a8 8 0 100-16 8 8 0 0016 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
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
            {/* Role Selection */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 sm:p-6 border border-teal-200">
              <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3">
                Select User Role *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {canCreateAdmins() && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, role: "ADMIN" }))
                    }
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                      formData.role === "ADMIN"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                          formData.role === "ADMIN"
                            ? "bg-purple-500"
                            : "bg-gray-200"
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            formData.role === "ADMIN"
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p
                          className={`font-bold text-sm sm:text-base ${
                            formData.role === "ADMIN"
                              ? "text-purple-700"
                              : "text-gray-700"
                          }`}
                        >
                          Admin
                        </p>
                        <p className="text-xs text-gray-500">
                          Can manage users and settings
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: "USER" }))
                  }
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    formData.role === "USER"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                        formData.role === "USER"
                          ? "bg-teal-500"
                          : "bg-gray-200"
                      }`}
                    >
                      <svg
                        className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          formData.role === "USER"
                            ? "text-white"
                            : "text-gray-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p
                        className={`font-bold text-sm sm:text-base ${
                          formData.role === "USER"
                            ? "text-teal-700"
                            : "text-gray-700"
                        }`}
                      >
                        User
                      </p>
                      <p className="text-xs text-gray-500">
                        Standard user access
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Profile Photo (optional)
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                  {formData.avatar ? (
                    <img
                      src={formData.avatar}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 text-xl font-bold">
                      {formData.name
                        ? formData.name.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleavatarChange}
                    className="w-full text-sm text-gray-700
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-semibold
                            file:bg-teal-50 file:text-teal-700
                            hover:file:bg-teal-100"
                  />
                  {errors.avatar && (
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
                      {errors.avatar}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Recommended: square image, max ~1MB. It will be shown in the
                    top-right profile icon.
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border ${
                    errors.name ? "border-red-300" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="John Doe"
                />
                {errors.name && (
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
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="john@alfaagencies.com"
                />
                {errors.email && (
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
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Title *
                </label>
                <select
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg ${
                    errors.jobTitle ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Job Title</option>
                  {jobTitles.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
                {errors.jobTitle && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.jobTitle}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border ${
                    errors.phone ? "border-red-300" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="+1 234 567 8900"
                />
                {errors.phone && (
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
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
                Security Credentials
                {isEditMode && (
                  <span className="ml-2 text-sm font-normal text-gray-500 block sm:inline mt-1 sm:mt-0">
                    (Leave blank to keep current password)
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {isEditMode ? "" : "*"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
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
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password {isEditMode ? "" : "*"}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${
                      errors.confirmPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
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
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Status *
              </label>
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

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg disabled:opacity-60 hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold"
              >
                {loading
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                  ? "Update User"
                  : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}