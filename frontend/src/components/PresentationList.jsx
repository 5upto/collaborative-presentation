import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Presentation, Calendar, Search, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { formatDate } from '../utils/helpers';
import { usePresentation } from '../context/PresentationContext';
import slideForge from '../assets/slideforge.png'

const PresentationList = () => {
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPresentationTitle, setNewPresentationTitle] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [presentationToDelete, setPresentationToDelete] = useState(null);
  const { user } = usePresentation();

  useEffect(() => {
    fetchPresentations();
  }, []);

  const fetchPresentations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/presentations');
      setPresentations(response.data);
    } catch (error) {
      console.error('Failed to fetch presentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPresentation = async (e) => {
    e.preventDefault();
    if (!newPresentationTitle.trim()) return;

    try {
      const response = await api.post('/presentations', {
        title: newPresentationTitle.trim(),
        creatorNickname: user.nickname
      });

      setShowCreateModal(false);
      setNewPresentationTitle('');
      await fetchPresentations();

      // Navigate to the new presentation
      window.location.href = `/presentation/${response.data.id}`;
    } catch (error) {
      console.error('Failed to create presentation:', error);
    }
  };

  const handleDeleteClick = (e, id, presentation) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if current user is the creator
    if (presentation.creator_nickname !== user.nickname) {
      alert('Only the creator can delete this presentation.');
      return;
    }

    setPresentationToDelete({ id, presentation });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!presentationToDelete) return;
    
    try {
      await api.delete(`/presentations/${presentationToDelete.id}`, {
        data: { creatorNickname: user.nickname }
      });
      await fetchPresentations();
    } catch (error) {
      console.error('Failed to delete presentation:', error);
      if (error.response?.status === 403) {
        alert('You do not have permission to delete this presentation.');
      } else {
        alert('Failed to delete presentation. Please try again.');
      }
    } finally {
      setDeleteModalOpen(false);
      setPresentationToDelete(null);
    }
  };

  const filteredPresentations = presentations.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.creator_nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={slideForge} className="h-12 w-12" alt="SlideForge Logo" />
              <h1 className="text-2xl font-bold text-gray-900">Slideforge</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.nickname}</span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Presentation</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search presentations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>

        {/* Presentations Grid */}
        {filteredPresentations.length === 0 ? (
          <div className="text-center py-12">
            <Presentation className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No presentations</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No presentations match your search.' : 'Get started by creating a new presentation.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Presentation
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPresentations.map((presentation) => (
              <Link
                key={presentation.id}
                to={`/presentation/${presentation.id}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Presentation className="h-12 w-12 text-blue-600 opacity-50" />
                  </div>
                  {presentation.creator_nickname === user.nickname && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={(e) => handleDeleteClick(e, presentation.id, presentation)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                        title="Delete presentation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {presentation.title}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{presentation.creator_nickname}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(presentation.updated_at)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>{presentation.slide_count || 0} slides</span>
                      <span className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>{presentation.active_users || 0} online</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Presentation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Presentation</h2>

            <form onSubmit={createPresentation}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Presentation Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newPresentationTitle}
                  onChange={(e) => setNewPresentationTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Enter presentation title"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPresentationTitle('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this presentation? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationList;