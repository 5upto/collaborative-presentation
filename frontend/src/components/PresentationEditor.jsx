import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePresentation } from '../context/PresentationContext';
import Toolbar from './Toolbar';
import SlidesPanel from './SlidesPanel';
import SlideCanvas from './SlideCanvas';
import UsersList from './UsersList';
import { api } from '../utils/api';
import { ArrowLeft, Play, Save, Download } from 'lucide-react';
import { exportToPDF } from '../utils/helpers';
import { toast } from 'react-toastify';

const PresentationEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, socket, user } = usePresentation();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    if (id && socket) {
      loadPresentation();
    }
  }, [id, socket]);

  // Join presentation after presentation data is loaded
  useEffect(() => {
    if (state.presentation && socket && id) {
      joinPresentation();
    }
  }, [state.presentation, socket, id]);

  const loadPresentation = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const [presentationResponse, slidesResponse] = await Promise.all([
        api.get(`/presentations/${id}`),
        api.get(`/slides/presentation/${id}`)
      ]);

      dispatch({ type: 'SET_PRESENTATION', payload: presentationResponse.data });
      dispatch({ type: 'SET_SLIDES', payload: slidesResponse.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load presentation' });
      console.error('Failed to load presentation:', error);
    }
  };

  const joinPresentation = () => {
    if (socket && id && state.presentation) {
      const role = state.presentation.creator_nickname === user.nickname ? 'creator' : 'viewer';
      socket.emit('join-presentation', {
        presentationId: id,
        nickname: user.nickname,
        role
      });
    }
  };

  const handleSave = async () => {
    if (!state.presentation?.id) return;

    setSaving(true);
    try {
      // Save presentation metadata
      await api.put(`/presentations/${state.presentation.id}`, {
        title: state.presentation.title,
        updated_at: new Date().toISOString()
      });

      // Save each slide with its elements - ensure all properties are included
      for (const slide of state.slides) {
        const elementsToSave = (slide.elements || []).map(element => ({
          id: element.id,
          type: element.type,
          x: element.x || 0,
          y: element.y || 0,
          width: element.width || 100,
          height: element.height || 50,
          content: element.content || {},
          styles: element.styles || {},
          zIndex: element.zIndex || element.z_index || 1
        }));

        await api.put(`/slides/${slide.id}`, {
          title: slide.title || '',
          elements: elementsToSave
        });
      }

      setLastSaved(new Date());
      toast.success('Presentation saved successfully!');
    } catch (error) {
      console.error('Failed to save presentation:', error);
      toast.error('Failed to save presentation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF(state.slides, state.presentation?.title);
      toast.success('Exported PDF successfully!');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export presentation to PDF');
    }
  };

  const handlePresentMode = () => {
    navigate(`/present/${id}/${state.currentSlideIndex}`);
  };

  // Safely access state properties with defaults
  const isLoading = state?.isLoading || false;
  const error = state?.error || null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">
            {typeof error === 'string' ? error : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-3 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg transition-colors"
          >
            Back to Presentations
          </button>
        </div>
      </div>
    );
  }

  const canEdit = ['creator', 'editor'].includes(state.userRole);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {state.presentation?.title || 'Untitled Presentation'}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>by {state.presentation?.creator_nickname}</span>
              {lastSaved && (
                <span>• Saved {lastSaved.toLocaleTimeString()}</span>
              )}
              {saving && <span>• Saving...</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handlePresentMode}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Present</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      {canEdit && (
        <Toolbar />
      )}

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slides Panel */}
        <div className="flex-shrink-0">
          <SlidesPanel />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-100 min-w-0">
          <SlideCanvas />
        </div>

        {/* Users Panel */}
        <div className="flex-shrink-0">
          <UsersList />
        </div>
      </div>
    </div>
  );
};

export default PresentationEditor;