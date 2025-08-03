import React, { useState, useEffect } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const ImageElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { socket, state, dispatch } = usePresentation();

  const handleMouseDown = (e) => {
    if (!canEdit) return;

    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - elementPos.x * zoom,
      y: e.clientY - elementPos.y * zoom
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !canEdit) return;

    const newX = (e.clientX - dragStart.x) / zoom;
    const newY = (e.clientY - dragStart.y) / zoom;

    setElementPos({ x: newX, y: newY });
    
    // Update position immediately during drag (no history)
    if (window.imageDragTimeout) {
      clearTimeout(window.imageDragTimeout);
    }
    
    window.imageDragTimeout = setTimeout(() => {
      const roundedX = Math.max(0, Math.round(newX));
      const roundedY = Math.max(0, Math.round(newY));
      
      // Update context state without adding to history during drag
      dispatch({
        type: 'UPDATE_SLIDE_ELEMENT',
        payload: {
          slideId: state.slides[state.currentSlideIndex]?.id,
          elementId: element.id,
          updates: { x: roundedX, y: roundedY },
          autoSave: false,
          addToHistory: false // Don't add to history during drag
        }
      });

      // Emit socket update
      if (socket && state.slides[state.currentSlideIndex]?.id) {
        socket.emit('element-updated', {
          elementId: element.id,
          element: {
            ...element,
            x: roundedX,
            y: roundedY
          },
          slideId: state.slides[state.currentSlideIndex].id,
          presentationId: state.presentation?.id
        });
      }
    }, 100);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // Clear any pending drag timeout
    if (window.imageDragTimeout) {
      clearTimeout(window.imageDragTimeout);
    }
    
    // Add final position to history when drag ends
    const finalX = Math.max(0, Math.round(elementPos.x));
    const finalY = Math.max(0, Math.round(elementPos.y));
    
    dispatch({
      type: 'UPDATE_SLIDE_ELEMENT',
      payload: {
        slideId: state.slides[state.currentSlideIndex]?.id,
        elementId: element.id,
        updates: { x: finalX, y: finalY },
        autoSave: true,
        addToHistory: true // Add to history when drag completes
      }
    });
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, zoom]);

  useEffect(() => {
    setElementPos({ x: element.x, y: element.y });
  }, [element.x, element.y]);

  const handleResize = (newDimensions) => {
    if (!canEdit) return;

    // Update context state
    dispatch({
      type: 'UPDATE_SLIDE_ELEMENT',
      payload: {
        slideId: state.slides[state.currentSlideIndex]?.id,
        elementId: element.id,
        updates: newDimensions,
        autoSave: true,
        addToHistory: true
      }
    });

    // Emit socket update
    if (socket) {
      socket.emit('element-updated', {
        elementId: element.id,
        element: {
          ...element,
          ...newDimensions
        },
        slideId: state.slides[state.currentSlideIndex]?.id,
        presentationId: state.presentation?.id
      });
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isDragging ? 'opacity-75' : ''}`}
      style={{
        left: elementPos.x,
        top: elementPos.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1,
        cursor: canEdit ? 'move' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {isLoading && (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      )}

      {hasError && (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
          <div className="text-gray-500 text-sm text-center">
            <div>Failed to load image</div>
            <div className="text-xs">{element.content?.alt || 'Unknown'}</div>
          </div>
        </div>
      )}

      {element.content?.src && (
        <img
          src={element.content?.src || element.src}
          alt={element.content?.alt || element.alt || 'Image'}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: isLoading || hasError ? 'none' : 'block' }}
        />
      )}
      <ResizeHandles
        element={element}
        onResize={handleResize}
        isSelected={isSelected}
        canEdit={canEdit}
        zoom={zoom}
      />
    </div>
  );
};

export default ImageElement;