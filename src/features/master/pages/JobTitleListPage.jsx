// src/features/master/pages/JobTitleListPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function JobTitleListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [jobTitles, setJobTitles] = useState([]);
  const [filteredJobTitles, setFilteredJobTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadJobTitles();
  }, []);

  useEffect(() => {
    let filtered = jobTitles;

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredJobTitles(filtered);
  }, [jobTitles, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentJobTitles = filteredJobTitles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredJobTitles.length / itemsPerPage);

  const loadJobTitles = () => {
    setLoading(true);
    setTimeout(() => {
      const storedJobTitles = JSON.parse(localStorage.getItem('jobTitles') || '[]');
      setJobTitles(storedJobTitles);
      setFilteredJobTitles(storedJobTitles);
      setLoading(false);
    }, 300);
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAdd = () => {
    navigate('/master/job-title/add');
  };

  const handleEdit = (job) => {
    setEditingId(job.id);
    setEditTitle(job.title);
    setEditDescription(job.description || '');
  };

  const handleSaveEdit = (id) => {
    const updatedJobTitles = jobTitles.map(job => {
      if (job.id === id) {
        return {
          ...job,
          title: editTitle,
          description: editDescription,
          updatedAt: new Date().toISOString()
        };
      }
      return job;
    });
    localStorage.setItem('jobTitles', JSON.stringify(updatedJobTitles));
    setJobTitles(updatedJobTitles);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this job title?')) {
      const updatedJobTitles = jobTitles.filter(job => job.id !== id);
      localStorage.setItem('jobTitles', JSON.stringify(updatedJobTitles));
      setJobTitles(updatedJobTitles);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Job Titles</h1>
            <p className="text-gray-600">Manage job titles for Alfa Agencies</p>
          </div>
          
          <button
            onClick={handleNavigateToAdd}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Job Title
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Job Titles
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <svg className="absolute left-3 bottom-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Job Titles Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading job titles...</p>
              </div>
            </div>
          ) : filteredJobTitles.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No job titles found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first job title'}
              </p>
              <button
                onClick={handleNavigateToAdd}
                className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold"
              >
                Add First Job Title
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentJobTitles.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition">
                        {editingId === job.id ? (
                          <>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveEdit(job.id)}
                                  className="text-green-600 hover:text-green-900 transition"
                                  title="Save"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-600 hover:text-gray-900 transition"
                                  title="Cancel"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                  {job.title.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">{job.title}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{job.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(job)}
                                  className="text-blue-600 hover:text-blue-900 transition"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(job.id)}
                                  className="text-red-600 hover:text-red-900 transition"
                                  title="Delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredJobTitles.length)} of {filteredJobTitles.length} job titles
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700'
                        }`}
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => paginate(1)}
                              className="w-10 h-10 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition-all"
                            >
                              1
                            </button>
                            {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
                          </>
                        )}

                        {[...Array(totalPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          if (
                            pageNumber === currentPage ||
                            (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                          ) {
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => paginate(pageNumber)}
                                className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                                  currentPage === pageNumber
                                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          }
                          return null;
                        })}

                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                            <button
                              onClick={() => paginate(totalPages)}
                              className="w-10 h-10 rounded-lg font-semibold text-sm bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition-all"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!loading && filteredJobTitles.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Page {currentPage} of {totalPages} • Total {filteredJobTitles.length} job titles
          </div>
        )}
      </div>
    </div>
  );
}