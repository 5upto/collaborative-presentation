import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePresentation } from '../context/PresentationContext';
import { api } from '../utils/api';
import { toast } from 'react-toastify';

const SlidesPanel = () => {
  const { state, dispatch, socket, user } = usePresentation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState({ id: null, index: -1 });
  const canEdit = ['creator', 'editor'].includes(state.userRole);
  const isCreator = state.userRole === 'creator';

  const handleSlideSelect = (index) => {
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: index });
    if (socket) {
      socket.emit('slide-changed', {
        presentationId: state.presentation?.id,
        slideIndex: index
      });
    }
  };

  const handleAddSlide = async () => {
    if (!isCreator || !state.presentation?.id) {
      toast.error('You do not have permission to add slides');
      return;
    }

    try {
      const response = await api.post('/slides', {
        presentationId: state.presentation.id,
        order: state.slides.length
      });

      const newSlide = {
        id: response.data.id,
        presentation_id: state.presentation.id,
        order: state.slides.length,
        elements: []
      };

      dispatch({ type: 'ADD_SLIDE', payload: newSlide });

      if (socket) {
        socket.emit('slide-added', {
          presentationId: state.presentation.id,
          slide: newSlide
        });
      }
      toast.success('Slide added successfully');
    } catch (error) {
      console.error('Failed to add slide:', error);
      toast.error('Failed to add slide');
    }
  };

  const handleDeleteClick = (slideId, index) => {
    if (!canEdit || state.slides.length <= 1) return;
    setSlideToDelete({ id: slideId, index });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    try {
      await api.delete(`/slides/${slideToDelete.id}`);
      dispatch({ type: 'DELETE_SLIDE', payload: slideToDelete.id });

      if (socket) {
        socket.emit('slide-deleted', {
          presentationId: state.presentation?.id,
          slideId: slideToDelete.id
        });
      }
      
      // Reset current slide if needed
      if (state.currentSlide >= state.slides.length - 1) {
        const newSlideIndex = Math.max(0, state.slides.length - 2);
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: newSlideIndex });
        
        if (socket) {
          socket.emit('slide-changed', {
            presentationId: state.presentation?.id,
            slideIndex: newSlideIndex
          });
        }
      }
      
      setDeleteModalOpen(false);
      setSlideToDelete({ id: null, index: -1 });
      toast.success('Slide deleted successfully');
    } catch (error) {
      console.error('Failed to delete slide:', error);
      toast.error('Failed to delete slide');
    }
  }, [slideToDelete, state.presentation?.id, state.slides.length, state.currentSlide, socket, dispatch]);

  const handleDuplicateSlide = async (slide, index) => {
    if (!canEdit) return;

    try {
      const response = await api.post('/slides', {
        presentationId: state.presentation.id,
        order: index + 1
      });

      const newSlide = {
        id: response.data.id,
        presentation_id: state.presentation.id,
        order: index + 1,
        elements: [...slide.elements] // Copy elements
      };

      // Create elements for the new slide
      for (const element of slide.elements) {
        await api.post(`/slides/${newSlide.id}/elements`, {
          type: element.type,
          content: element.content,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          styles: element.styles,
          zIndex: element.z_index
        });
      }

      dispatch({ type: 'ADD_SLIDE', payload: newSlide });

      if (socket) {
        socket.emit('slide-added', {
          presentationId: state.presentation.id,
          slide: newSlide
        });
      }
      toast.success('Slide duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate slide:', error);
      toast.error('Failed to duplicate slide');
    }
  };

  const moveSlide = async (fromIndex, toIndex) => {
    if (!canEdit || fromIndex === toIndex) return;

    const newSlides = [...state.slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);

    // Update orders
    const updates = newSlides.map((slide, index) => ({
      id: slide.id,
      order: index
    }));

    try {
      await Promise.all(
        updates.map(update =>
          api.put(`/slides/${update.id}`, { order: update.order })
        )
      );

      dispatch({ type: 'SET_SLIDES', payload: newSlides });

      if (socket) {
        socket.emit('slides-reordered', {
          presentationId: state.presentation.id,
          slides: newSlides
        });
      }
      toast.success('Slides reordered successfully');
    } catch (error) {
      console.error('Failed to reorder slides:', error);
      toast.error('Failed to reorder slides');
    }
  };

  return (
    <div className={`${isMinimized ? 'w-12' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 h-full`}>
      <div className={`${isMinimized ? 'p-1 flex items-center justify-center' : 'p-4'} border-b border-gray-200`}>
        <div className={`flex items-center ${isMinimized ? 'justify-center w-full' : 'justify-between'}`}>
          <div className={`flex items-center ${isMinimized ? 'justify-center' : 'space-x-2'}`}>
            <div
              onClick={() => setIsMinimized(!isMinimized)}
              className="cursor-pointer text-gray-500 hover:text-gray-700"
              title={isMinimized ? 'Expand slides panel' : 'Minimize slides panel'}
            >
              {isMinimized ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </div>
            {!isMinimized && <h3 className="font-semibold text-gray-900">Slides</h3>}
          </div>
          {!isMinimized && canEdit && (
            <button
              onClick={handleAddSlide}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add slide"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-2 pb-4 space-y-2 h-full">
          {state.slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`group relative cursor-pointer ${index === state.currentSlideIndex
                  ? 'ring-2 ring-blue-500'
                  : 'hover:ring-1 hover:ring-gray-300'
                }`}
              onClick={() => handleSlideSelect(index)}
            >
              <div className="aspect-video bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
                  <span className="text-xs text-gray-400">Slide {index + 1}</span>

                  {/* Slide preview would go here */}
                  <div className="absolute inset-2">
                    {slide.elements?.slice(0, 3).map((element, idx) => (
                      <div
                        key={element.id}
                        className="absolute bg-blue-200 rounded opacity-60"
                        style={{
                          left: `${(element.x / 1920) * 100}%`,
                          top: `${(element.y / 1080) * 100}%`,
                          width: `${Math.min((element.width / 1920) * 100, 20)}%`,
                          height: `${Math.min((element.height / 1080) * 100, 15)}%`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide controls */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateSlide(slide, index);
                    }}
                    className="p-1 bg-white shadow-sm border border-gray-200 rounded text-gray-600 hover:text-gray-900"
                    title="Duplicate slide"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}

                {isCreator && state.slides.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(slide.id, index);
                    }}
                    className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEdit || state.slides.length <= 1}
                    title="Delete slide"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Slide reorder controls */}
              {canEdit && (
                <div className="absolute left-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                  {index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSlide(index, index - 1);
                      }}
                      className="p-1 bg-white shadow-sm border border-gray-200 rounded text-gray-600 hover:text-gray-900"
                      title="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  )}

                  {index < state.slides.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSlide(index, index + 1);
                      }}
                      className="p-1 bg-white shadow-sm border border-gray-200 rounded text-gray-600 hover:text-gray-900"
                      title="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="text-center mt-1">
                <span className="text-xs text-gray-500">{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Slide</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this slide? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SlidesPanel;