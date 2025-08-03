import React, { useState, useEffect } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const ShapeElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });

  const { socket, state } = usePresentation();

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
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    setIsDragging(false);

    if (elementPos.x !== element.x || elementPos.y !== element.y) {
      const updatedElement = {
        ...element,
        x: Math.max(0, elementPos.x),
        y: Math.max(0, elementPos.y)
      };

      if (socket) {
        socket.emit('element-updated', {
          elementId: element.id,
          element: updatedElement,
          slideId: state.slides[state.currentSlideIndex]?.id,
          presentationId: state.presentation?.id
        });
      }
    }
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
    const updatedElement = {
      ...element,
      ...newDimensions
    };

    if (socket) {
      socket.emit('element-updated', {
        elementId: element.id,
        element: updatedElement,
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