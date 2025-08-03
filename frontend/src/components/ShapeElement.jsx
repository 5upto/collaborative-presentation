import React, { useState, useEffect } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const ShapeElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });

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
    if (window.shapeDragTimeout) {
      clearTimeout(window.shapeDragTimeout);
    }
    
    window.shapeDragTimeout = setTimeout(() => {
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
    if (window.shapeDragTimeout) {
      clearTimeout(window.shapeDragTimeout);
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
        updates: newDimensions
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

  const getShapeStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      backgroundColor: element.styles?.fill || '#3b82f6',
      border: `${element.styles?.strokeWidth || 2}px solid ${element.styles?.stroke || '#2563eb'}`,
      cursor: canEdit ? 'move' : 'default'
    };

    const shapeType = element.content?.shape || 'rectangle';

    if (shapeType === 'circle') {
      baseStyle.borderRadius = '50%';
    } else if (shapeType === 'triangle') {
      return {
        width: 0,
        height: 0,
        borderLeft: `${element.width / 2}px solid transparent`,
        borderRight: `${element.width / 2}px solid transparent`,
        borderBottom: `${element.height}px solid ${element.styles?.fill || '#3b82f6'}`,
        cursor: canEdit ? 'move' : 'default'
      };
    }

    return baseStyle;
  };

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isDragging ? 'opacity-75' : ''}`}
      style={{
        left: elementPos.x,
        top: elementPos.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={getShapeStyle()} />
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

export default ShapeElement;