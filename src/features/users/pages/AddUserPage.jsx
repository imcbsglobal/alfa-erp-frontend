import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function AddUserPage() {
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    jobTitle: '',
    phone: '',
    status: 'ACTIVE',
    profilePhoto: ''
  });

  const [jobTitles, setJobTitles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load job titles from localStorage
  useEffect(() => {
    const storedTitles = JSON.parse(localStorage.getItem("jobTitles") || "[]");
    setJobTitles(storedTitles);
  }, []);

  const canCreateAdmins = () => {
    if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') return true;

    const permissionMap = JSON.parse(localStorage.getItem("userPermissions") || "{}");
    const userPermissions = currentUser?.email ? (permissionMap[currentUser.email] || {}) : {};
    return userPermissions["user-management"]?.view === true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (successMessage) setSuccessMessage('');
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profilePhoto: 'Please upload an image file' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password required';
    else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setTimeout(() => {
      try {
        const existingUsers = JSON.parse(localStorage.getItem('appUsers') || '[]');

        if (existingUsers.some(u => u.email === formData.email)) {
          setErrors({ email: 'Email already exists' });
          setLoading(false);
          return;
        }

        const newUser = {
          id: Date.now(),
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          jobTitle: formData.jobTitle,
          phone: formData.phone,
          status: formData.status,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.email,
          profilePhoto: formData.profilePhoto || ''
        };

        existingUsers.push(newUser);
        localStorage.setItem('appUsers', JSON.stringify(existingUsers));

        setSuccessMessage(`User created successfully!`);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'USER',
          jobTitle: '',
          phone: '',
          status: 'ACTIVE',
          profilePhoto: ''
        });

        setLoading(false);
      } catch (err) {
        setErrors({ general: 'Failed to create user' });
        setLoading(false);
      }
    }, 500);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Add New User</h1>
          <p className="text-gray-600">Create a new admin or user account for Alfa Agencies</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-start gap-3">
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3">
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection - Prominent */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-6 border border-teal-200">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Select User Role *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin role option - visible to users with user-management permission */}
                {canCreateAdmins() && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'ADMIN' }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === 'ADMIN'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        formData.role === 'ADMIN' ? 'bg-purple-500' : 'bg-gray-200'
                      }`}>
                        <svg className={`w-6 h-6 ${formData.role === 'ADMIN' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${formData.role === 'ADMIN' ? 'text-purple-700' : 'text-gray-700'}`}>
                          Admin
                        </p>
                        <p className="text-xs text-gray-500">Can manage users and settings</p>
                      </div>
                    </div>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'USER' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.role === 'USER'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      formData.role === 'USER' ? 'bg-teal-500' : 'bg-gray-200'
                    }`}>
                      <svg className={`w-6 h-6 ${formData.role === 'USER' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${formData.role === 'USER' ? 'text-teal-700' : 'text-gray-700'}`}>
                        User
                      </p>
                      <p className="text-xs text-gray-500">Standard user access</p>
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

            <div className="flex items-center gap-4">
                {/* Preview circle */}
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {formData.profilePhoto ? (
                    <img
                    src={formData.profilePhoto}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-gray-500 text-xl font-bold">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                )}
                </div>

                {/* File input */}
                <div className="flex-1">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="w-full text-sm text-gray-700
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-semibold
                            file:bg-teal-50 file:text-teal-700
                            hover:file:bg-teal-100"
                />
                {errors.profilePhoto && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                        />
                    </svg>
                    {errors.profilePhoto}
                    </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                    Recommended: square image, max ~1MB. It will be shown in the top-right profile icon.
                </p>
                </div>
            </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="john@alfaagencies.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
                  errors.jobTitle ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Job Title</option>
                {jobTitles.map((job) => (
                  <option key={job.id} value={job.title}>{job.title}</option>
                ))}
              </select>
              {errors.jobTitle && <p className="text-sm text-red-600 mt-1">{errors.jobTitle}</p>}
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
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                  placeholder="+1 234 567 8900"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Security Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none transition`}
                    placeholder="••••••••"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg"
              >
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Important Information</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Created users can login immediately with their email and password</li>
                <li>• Admins will need permissions assigned in the User Control page</li>
                <li>• Users will receive their default permissions based on role</li>
                <li>• Passwords must be at least 6 characters long</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}