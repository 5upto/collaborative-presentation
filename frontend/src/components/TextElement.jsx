import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePresentation } from '../context/PresentationContext';
import ResizeHandles from './ResizeHandles';

const TextElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementPos, setElementPos] = useState({ x: element.x, y: element.y });
  const textRef = useRef(null);
  const dragTimeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  const { socket, state, dispatch } = usePresentation();

  const handleDoubleClick = () => {
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.innerText || e.target.textContent || '';
    
    // Don't update context during typing to prevent cursor jumping
    // Just store the current text locally
    if (textRef.current) {
      textRef.current.setAttribute('data-text', newText);
    }
  };

  const handleTextFinish = () => {
    const currentText = textRef.current?.textContent || textRef.current?.getAttribute('data-text') || '';
    
    // Update context state and add to history
    dispatch({
      type: 'UPDATE_SLIDE_ELEMENT',
      payload: {
        slideId: state.slides[state.currentSlideIndex]?.id,
        elementId: element.id,
        updates: { 
          content: { ...element.content, text: currentText }
        },
        autoSave: true,
        addToHistory: true // Add text changes to history
      }
    });
    
    // Emit socket update when finished editing
    if (socket) {
      socket.emit('element-updated', {
        elementId: element.id,
        element: {
          ...element,
          content: { ...element.content, text: currentText }
        },
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
      handleTextFinish();
    }
  };

  const handleMouseDown = useCallback((e) => {
    if (!canEdit || isEditing) return;

    e.preventDefault();
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    isDraggingRef.current = true;
    setDragStart({
      x: e.clientX - elementPos.x * zoom,
      y: e.clientY - elementPos.y * zoom
    });
  }, [canEdit, isEditing, onSelect, elementPos.x, elementPos.y, zoom]);

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

  useEffect(() => {
    // Only update text content from socket updates when not editing
    if (!isEditing && textRef.current) {
      const elementText = element.content?.text || '';
      const currentText = textRef.current.textContent || '';
      
      // Only update if text is different and it's from another user
      if (elementText !== currentText && elementText.trim() !== '') {
        textRef.current.textContent = elementText;
      }
    }
  }, [element.content?.text, isEditing]);

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
        onBlur={() => {
          setIsEditing(false);
          handleTextFinish();
        }}
        onInput={handleTextChange}
        onKeyDown={handleKeyDown}
      >
        {element.content?.text || (!isEditing ? 'Double-click to edit' : '')}
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