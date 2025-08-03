
import React, { useState } from 'react';
import { usePresentation } from '../context/PresentationContext';

const ResizeHandles = ({ element, onResize, isSelected, canEdit, zoom }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const { dispatch, socket, state } = usePresentation();

  if (!isSelected || !canEdit) return null;

  const handleMouseDown = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setResizeDirection(direction);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startLeft = element.x;
    const startTop = element.y;

    const handleMouseMove = (e) => {
      const deltaX = (e.clientX - startX) / zoom;
      const deltaY = (e.clientY - startY) / zoom;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      switch (direction) {
        case 'se': // bottom-right
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          break;
        case 'sw': // bottom-left
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight + deltaY);
          newX = startLeft + (startWidth - newWidth);
          break;
        case 'ne': // top-right
          newWidth = Math.max(20, startWidth + deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newY = startTop + (startHeight - newHeight);
          break;
        case 'nw': // top-left
          newWidth = Math.max(20, startWidth - deltaX);
          newHeight = Math.max(20, startHeight - deltaY);
          newX = startLeft + (startWidth - newWidth);
          newY = startTop + (startHeight - newHeight);
          break;
        case 'n': // top
          newHeight = Math.max(20, startHeight - deltaY);
          newY = startTop + (startHeight - newHeight);
          break;
        case 's': // bottom
          newHeight = Math.max(20, startHeight + deltaY);
          break;
        case 'e': // right
          newWidth = Math.max(20, startWidth + deltaX);
          break;
        case 'w': // left
          newWidth = Math.max(20, startWidth - deltaX);
          newX = startLeft + (startWidth - newWidth);
          break;
      }

      const updatedElement = {
        ...element,
        width: newWidth,
        height: newHeight,
        x: Math.max(0, newX),
        y: Math.max(0, newY)
      };

      // Update local state immediately for smooth resizing
      const currentSlide = state.slides[state.currentSlideIndex];
      if (currentSlide) {
        dispatch({
          type: 'UPDATE_SLIDE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: element.id,
            updates: {
              width: newWidth,
              height: newHeight,
              x: Math.max(0, newX),
              y: Math.max(0, newY)
            }
          }
        });
      }

      // Call the onResize prop if provided
      if (onResize) {
        onResize({
          width: newWidth,
          height: newHeight,
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');
      
      // Emit final position to socket for other users
      if (socket) {
        const currentSlide = state.slides[state.currentSlideIndex];
        if (currentSlide) {
          const updatedElement = currentSlide.elements?.find(el => el.id === element.id);
          if (updatedElement) {
            socket.emit('element-updated', {
              elementId: element.id,
              element: updatedElement,
              slideId: currentSlide.id,
              presentationId: state.presentation?.id
            });
          }
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStyle = {
    position: 'absolute',
    backgroundColor: '#3b82f6',
    border: '2px solid #fff',
    borderRadius: '2px',
    width: '8px',
    height: '8px',
    zIndex: 1000,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
  };

  return (
    <>
      {/* Corner handles */}
      <div
        style={{
          ...handleStyle,
          top: '-4px',
          left: '-4px',
          cursor: 'nw-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      <div
        style={{
          ...handleStyle,
          top: '-4px',
          right: '-4px',
          cursor: 'ne-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div
        style={{
          ...handleStyle,
          bottom: '-4px',
          left: '-4px',
          cursor: 'sw-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
      <div
        style={{
          ...handleStyle,
          bottom: '-4px',
          right: '-4px',
          cursor: 'se-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      
      {/* Edge handles */}
      <div
        style={{
          ...handleStyle,
          top: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'n-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      <div
        style={{
          ...handleStyle,
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 's-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      <div
        style={{
          ...handleStyle,
          top: '50%',
          left: '-4px',
          transform: 'translateY(-50%)',
          cursor: 'w-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      <div
        style={{
          ...handleStyle,
          top: '50%',
          right: '-4px',
          transform: 'translateY(-50%)',
          cursor: 'e-resize'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
    </>
  );
};

export default ResizeHandles;
