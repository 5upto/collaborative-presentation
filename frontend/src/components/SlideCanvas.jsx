import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePresentation } from '../context/PresentationContext';
import TextElement from './TextElement';
import ShapeElement from './ShapeElement';
import ImageElement from './ImageElement';

const SlideCanvas = () => {
  const { state, dispatch, socket, user } = usePresentation();

  const canvasRef = useRef(null);
  const [dragStartPos, setDragStartPos] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const SLIDE_WIDTH = 800;
  const SLIDE_HEIGHT = 450;

  // Get current slide
  const currentSlide = state.slides[state.currentSlideIndex];
  const canEdit = ['creator', 'editor'].includes(state.userRole);
  const safeZoom = typeof state.zoom === 'number' && !isNaN(state.zoom) && state.zoom > 0 ? state.zoom : 1;
  const selectedTool = state.selectedTool || 'select';

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    const handleKeyDown = (e) => {
      if (!canEdit) return;

      // Delete selected elements
      if (e.key === 'Delete' && state.selectedElements.length > 0) {
        state.selectedElements.forEach(elementId => {
          dispatch({
            type: 'DELETE_SLIDE_ELEMENT',
            payload: { slideId: currentSlide?.id, elementId }
          });

          socket?.emit('element-deleted', {
            elementId,
            slideId: currentSlide?.id,
            presentationId: state.presentation?.id
          });
        });
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canEdit, state.selectedElements, socket, state.presentation, currentSlide, dispatch]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target !== canvasRef.current) return;
    if (!canEdit) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / safeZoom;
    const y = (e.clientY - rect.top) / safeZoom;

    // Handle different tools
    if (selectedTool === 'text') {
      addElement('text', { x, y });
      return;
    } else if (selectedTool === 'rectangle') {
      addElement('shape', { x, y, content: { shape: 'rectangle' } });
      return;
    } else if (selectedTool === 'circle') {
      addElement('shape', { x, y, content: { shape: 'circle' } });
      return;
    }

    // Default selection behavior
    setDragStartPos({ x, y });
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
  }, [canEdit, safeZoom, dispatch, selectedTool]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!dragStartPos || !canEdit) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / safeZoom;
    const y = (e.clientY - rect.top) / safeZoom;

    setSelectionBox(prev => ({
      ...prev,
      endX: x,
      endY: y
    }));
  }, [dragStartPos, canEdit, safeZoom]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!dragStartPos || !selectionBox) return;

    // Find elements within selection box
    const minX = Math.min(selectionBox.startX, selectionBox.endX);
    const maxX = Math.max(selectionBox.startX, selectionBox.endX);
    const minY = Math.min(selectionBox.startY, selectionBox.endY);
    const maxY = Math.max(selectionBox.startY, selectionBox.endY);

    if (currentSlide?.elements) {
      const selectedIds = currentSlide.elements
        .filter(element => {
          const elemRight = element.x + element.width;
          const elemBottom = element.y + element.height;

          return element.x < maxX && elemRight > minX &&
                 element.y < maxY && elemBottom > minY;
        })
        .map(element => element.id);

      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: selectedIds });
    }

    setDragStartPos(null);
    setSelectionBox(null);
  }, [dragStartPos, selectionBox, currentSlide, dispatch]);

  const handleContextMenu = useCallback((e) => {
    if (!canEdit) return;

    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: (e.clientX - rect.left) / safeZoom,
      canvasY: (e.clientY - rect.top) / safeZoom
    });
  }, [canEdit, safeZoom]);

  const addElement = useCallback((type, options = {}) => {
    if (!canEdit || !currentSlide || !socket) return;

    // Calculate next z-index to ensure new elements appear on top
    const maxZIndex = currentSlide.elements?.length > 0 
      ? Math.max(...currentSlide.elements.map(el => el.zIndex || 1))
      : 0;

    const element = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: contextMenu?.canvasX || 100,
      y: contextMenu?.canvasY || 100,
      width: 200,
      height: 50,
      zIndex: maxZIndex + 1,
      ...options
    };

    if (type === 'text') {
      element.content = { text: 'Double-click to edit' };
      element.styles = { fontSize: '16px', color: '#000000' };
    } else if (type === 'shape') {
      // Use the shape type from options.content.shape if provided, otherwise default to rectangle
      let shapeType = options.content && options.content.shape ? options.content.shape : 'rectangle';
      element.content = { shape: shapeType };
      element.styles = { fill: '#3b82f6', stroke: '#2563eb', strokeWidth: 2 };
      if (shapeType === 'circle') {
        element.width = 100;
        element.height = 100;
      }
    }

    // Add to local state first
    dispatch({
      type: 'ADD_SLIDE_ELEMENT',
      payload: { slideId: currentSlide.id, element }
    });

    // Then emit to server
    socket.emit('element-created', {
      slideId: currentSlide.id,
      element,
      presentationId: state.presentation?.id
    });

    setContextMenu(null);
  }, [canEdit, currentSlide, socket, state.presentation, contextMenu, dispatch]);

  const handleElementSelect = useCallback((elementId) => {
    if (canEdit) {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [elementId] });
      
      // Bring selected element to front temporarily for better visibility
      const element = currentSlide?.elements?.find(el => el.id === elementId);
      if (element && currentSlide?.elements) {
        const maxZIndex = Math.max(...currentSlide.elements.map(el => el.zIndex || 1));
        if (element.zIndex < maxZIndex) {
          dispatch({
            type: 'UPDATE_SLIDE_ELEMENT',
            payload: {
              slideId: currentSlide.id,
              elementId: elementId,
              updates: { zIndex: maxZIndex + 1 },
              autoSave: true,
              addToHistory: false // Don't add selection to history
            }
          });
          
          // Emit socket update for z-index change
          if (socket) {
            socket.emit('element-updated', {
              elementId: elementId,
              element: {
                ...element,
                zIndex: maxZIndex + 1
              },
              slideId: currentSlide.id,
              presentationId: state.presentation?.id
            });
          }
        }
      }
    }
  }, [canEdit, dispatch, currentSlide, socket, state.presentation]);

  const renderElement = (element) => {
    const isSelected = state.selectedElements.includes(element.id);

    const commonProps = {
      element,
      isSelected,
      canEdit,
      onSelect: () => handleElementSelect(element.id),
      zoom: safeZoom
    };

    switch (element.type) {
      case 'text':
        return <TextElement key={element.id} {...commonProps} />;
      case 'shape':
        return <ShapeElement key={element.id} {...commonProps} />;
      case 'image':
        return <ImageElement key={element.id} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-100 p-8">
      <div
        className="slide-canvas mx-auto relative"
        style={{
          width: SLIDE_WIDTH * safeZoom,
          height: SLIDE_HEIGHT * safeZoom,
        }}
      >
        <div
          ref={canvasRef}
          className="w-full h-full bg-white relative overflow-hidden shadow-lg"
          data-slide-id={currentSlide?.id}
          style={{ 
            width: SLIDE_WIDTH, 
            height: SLIDE_HEIGHT,
            transform: `scale(${safeZoom})`,
            transformOrigin: 'top left'
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={handleContextMenu}
        >
          {/* Slide Elements - sorted by z-index for proper layering */}
          {currentSlide?.elements
            ?.slice()
            .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
            .map(renderElement)}

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
                pointerEvents: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => addElement('text')}
          >
            Add Text
          </div>
          <div className="border-t border-gray-200 my-1" />
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => addElement('shape', { content: { shape: 'rectangle' } })}
          >
            Add Rectangle
          </div>
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => addElement('shape', { content: { shape: 'circle' } })}
          >
            Add Circle
          </div>
          <div className="border-t border-gray-200 my-1" />
          <div
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    addElement('image', {
                      content: { src: event.target.result, alt: file.name },
                      width: 300,
                      height: 200
                    });
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
          >
            Add Image
          </div>
          
          {/* Layer management options for selected elements */}
          {state.selectedElements.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <div
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => {
                  const selectedElement = currentSlide?.elements?.find(el => el.id === state.selectedElements[0]);
                  if (selectedElement && currentSlide?.elements) {
                    const maxZIndex = Math.max(...currentSlide.elements.map(el => el.zIndex || 1));
                    dispatch({
                      type: 'UPDATE_SLIDE_ELEMENT',
                      payload: {
                        slideId: currentSlide.id,
                        elementId: selectedElement.id,
                        updates: { zIndex: maxZIndex + 1 },
                        autoSave: true,
                        addToHistory: true
                      }
                    });
                    if (socket) {
                      socket.emit('element-updated', {
                        elementId: selectedElement.id,
                        element: { ...selectedElement, zIndex: maxZIndex + 1 },
                        slideId: currentSlide.id,
                        presentationId: state.presentation?.id
                      });
                    }
                  }
                  setContextMenu(null);
                }}
              >
                Bring to Front
              </div>
              <div
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => {
                  const selectedElement = currentSlide?.elements?.find(el => el.id === state.selectedElements[0]);
                  if (selectedElement && currentSlide?.elements) {
                    const minZIndex = Math.min(...currentSlide.elements.map(el => el.zIndex || 1));
                    dispatch({
                      type: 'UPDATE_SLIDE_ELEMENT',
                      payload: {
                        slideId: currentSlide.id,
                        elementId: selectedElement.id,
                        updates: { zIndex: Math.max(1, minZIndex - 1) },
                        autoSave: true,
                        addToHistory: true
                      }
                    });
                    if (socket) {
                      socket.emit('element-updated', {
                        elementId: selectedElement.id,
                        element: { ...selectedElement, zIndex: Math.max(1, minZIndex - 1) },
                        slideId: currentSlide.id,
                        presentationId: state.presentation?.id
                      });
                    }
                  }
                  setContextMenu(null);
                }}
              >
                Send to Back
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {(!currentSlide?.elements || currentSlide.elements.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">Empty slide</p>
            {canEdit && (
              <p className="text-sm">Right-click to add elements</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideCanvas;