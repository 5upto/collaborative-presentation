import React from 'react';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { usePresentation } from '../context/PresentationContext';
import { api } from '../utils/api';

const SlidesPanel = () => {
  const { state, dispatch, socket, user } = usePresentation();
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
    if (!canEdit || !state.presentation?.id) return;

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
    } catch (error) {
      console.error('Failed to add slide:', error);
    }
  };

  const handleDeleteSlide = async (slideId, index) => {
    if (!isCreator || state.slides.length <= 1) return;

    if (window.confirm('Are you sure you want to delete this slide?')) {
      try {
        await api.delete(`/slides/${slideId}`);
        dispatch({ type: 'DELETE_SLIDE', payload: slideId });
        
        if (socket) {
          socket.emit('slide-deleted', {
            presentationId: state.presentation?.id,
            slideId
          });
        }
      } catch (error) {
        console.error('Failed to delete slide:', error);
      }
    }
  };

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
    } catch (error) {
      console.error('Failed to duplicate slide:', error);
    }
  };

  const moveSlide = async (fromIndex, toIndex) => {
    if (!isCreator || fromIndex === toIndex) return;

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
    } catch (error) {
      console.error('Failed to reorder slides:', error);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Slides</h3>
          {canEdit && (
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

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {state.slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`group relative cursor-pointer ${
              index === state.currentSlideIndex
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
                    handleDeleteSlide(slide.id, index);
                  }}
                  className="p-1 bg-white shadow-sm border border-gray-200 rounded text-red-600 hover:text-red-700"
                  title="Delete slide"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Slide reorder controls */}
            {isCreator && (
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
    </div>
  );
};

export default SlidesPanel;