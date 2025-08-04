import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const ShapeElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });
  const dragTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  const { socket, state, dispatch } = usePresentation();

  const handleMouseDown = useCallback((e) => {
    if (!canEdit) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    isDraggingRef.current = true;
    setDragStart({
      x: e.clientX - elementPos.x * zoom,
      y: e.clientY - elementPos.y * zoom
    });
  }, [canEdit, onSelect, elementPos.x, elementPos.y, zoom]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !canEdit) return;

    e.preventDefault();
    const newX = (e.clientX - dragStart.x) / zoom;
    const newY = (e.clientY - dragStart.y) / zoom;
    const roundedX = Math.max(0, Math.round(newX));
    const roundedY = Math.max(0, Math.round(newY));

    setElementPos({ x: roundedX, y: roundedY });
    
    // Update context state immediately for smooth dragging
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

    // Debounce socket updates
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    dragTimeoutRef.current = setTimeout(() => {
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
    }, 50);
  }, [canEdit, dragStart.x, dragStart.y, zoom, dispatch, state.slides, state.currentSlideIndex, element, socket]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    setIsDragging(false);
    isDraggingRef.current = false;
    
    // Clear any pending drag timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
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

    // Send final position via socket
    if (socket && state.slides[state.currentSlideIndex]?.id) {
      socket.emit('element-updated', {
        elementId: element.id,
        element: {
          ...element,
          x: finalX,
          y: finalY
        },
        slideId: state.slides[state.currentSlideIndex].id,
        presentationId: state.presentation?.id
      });
    }
  }, [elementPos.x, elementPos.y, dispatch, state.slides, state.currentSlideIndex, element, socket]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    // Only update position from props if not currently dragging
    if (!isDraggingRef.current) {
      setElementPos({ x: element.x, y: element.y });
    }
  }, [element.x, element.y]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

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
      cursor: canEdit ? 'move' : 'default'
    };

    // Only add border if stroke is explicitly defined
    if (element.styles?.stroke) {
      baseStyle.border = `${element.styles?.strokeWidth || 2}px solid ${element.styles.stroke}`;
    }

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