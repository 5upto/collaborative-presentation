import React, { useState, useEffect, useRef } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const TextElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });
  const textRef = useRef(null);

  const { socket, state } = usePresentation();

  const handleDoubleClick = () => {
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.textContent;
    const updatedElement = {
      ...element,
      content: { ...element.content, text: newText }
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      textRef.current?.blur();
    }
  };

  const handleMouseDown = (e) => {
    if (!canEdit || isEditing) return;

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

  const textStyle = {
    color: element.styles?.color || '#000000',
    fontSize: element.styles?.fontSize || '16px',
    fontWeight: element.styles?.fontWeight || 'normal',
    fontStyle: element.styles?.fontStyle || 'normal',
    textDecoration: element.styles?.textDecoration || 'none',
    textAlign: element.styles?.textAlign || 'left',
    lineHeight: '1.4',
    outline: 'none',
    border: 'none',
    background: 'transparent',
    width: '100%',
    height: '100%',
    padding: '4px',
    cursor: canEdit ? (isEditing ? 'text' : 'move') : 'default'
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
      onDoubleClick={handleDoubleClick}
    >
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        style={textStyle}
        onBlur={() => setIsEditing(false)}
        onInput={handleTextChange}
        onKeyDown={handleKeyDown}
      >
        {element.content?.text || 'Double-click to edit'}
      </div>
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

export default TextElement;