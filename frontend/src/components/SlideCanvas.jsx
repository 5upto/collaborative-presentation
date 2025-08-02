import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePresentation } from '../context/PresentationContext';
import TextElement from './TextElement';
import ShapeElement from './ShapeElement';
import ImageElement from './ImageElement';

const SlideCanvas = () => {
  const {
    currentSlide,
    selectedElements,
    setSelectedElements,
    canEdit,
    zoom = 1,
    socket,
    presentation,
    currentSlideIndex
  } = usePresentation();

  const canvasRef = useRef(null);
  const [dragStartPos, setDragStartPos] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const SLIDE_WIDTH = 800;
  const SLIDE_HEIGHT = 450;

  // Ensure zoom is always a valid number
  const safeZoom = typeof zoom === 'number' && !isNaN(zoom) && zoom > 0 ? zoom : 1;

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    
    const handleKeyDown = (e) => {
      if (!canEdit) return;
      
      // Delete selected elements
      if (e.key === 'Delete' && selectedElements.length > 0) {
        selectedElements.forEach(elementId => {
          socket?.emit('element-deleted', {
            elementId,
            presentationId: presentation?.id
          });
        });
        setSelectedElements([]);
      }
      
      // Copy/Paste (simplified)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && selectedElements.length > 0) {
          // Copy logic would go here
        } else if (e.key === 'v') {
          // Paste logic would go here
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canEdit, selectedElements, socket, presentation]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target !== canvasRef.current) return;
    if (!canEdit) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / safeZoom;
    const y = (e.clientY - rect.top) / safeZoom;
    
    setDragStartPos({ x, y });
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
    setSelectedElements([]);
  }, [canEdit, safeZoom, setSelectedElements]);

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
      
      setSelectedElements(selectedIds);
    }
    
    setDragStartPos(null);
    setSelectionBox(null);
  }, [dragStartPos, selectionBox, currentSlide, setSelectedElements]);

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
    
    const element = {
      type,
      x: contextMenu?.canvasX || 100,
      y: contextMenu?.canvasY || 100,
      width: 200,
      height: 50,
      zIndex: Date.now(),
      ...options
    };
    
    if (type === 'text') {
      element.content = { text: 'Double-click to edit' };
      element.styles = { fontSize: '16px', color: '#000000' };
    } else if (type === 'shape') {
      element.content = { shape: 'rectangle' };
      element.styles = { fill: '#3b82f6', stroke: '#2563eb', strokeWidth: 2 };
    }
    
    socket.emit('element-created', {
      slideId: currentSlide.id,
      element,
      presentationId: presentation?.id
    });
    
    setContextMenu(null);
  }, [canEdit, currentSlide, socket, presentation, contextMenu]);

  const renderElement = (element) => {
    const isSelected = selectedElements.includes(element.id);
    
    const commonProps = {
      key: element.id,
      element,
      isSelected,
      canEdit,
      onSelect: () => {
        if (canEdit) {
          setSelectedElements([element.id]);
        }
      },
      zoom: safeZoom
    };

    switch (element.type) {
      case 'text':
        return <TextElement {...commonProps} />;
      case 'shape':
        return <ShapeElement {...commonProps} />;
      case 'image':
        return <ImageElement {...commonProps} />;
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
          transform: `scale(${safeZoom})`,
          transformOrigin: 'center center'
        }}
      >
        <div
          ref={canvasRef}
          className="w-full h-full bg-white relative overflow-hidden"
          style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onContextMenu={handleContextMenu}
        >
          {/* Slide Elements */}
          {currentSlide?.elements?.map(renderElement)}
          
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
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <div
            className="context-menu-item"
            onClick={() => addElement('text')}
          >
            Add Text
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
            onClick={() => addElement('shape', { content: { shape: 'rectangle' } })}
          >
            Add Rectangle
          </div>
          <div
            className="context-menu-item"
            onClick={() => addElement('shape', { content: { shape: 'circle' } })}
          >
            Add Circle
          </div>
          <div className="context-menu-separator" />
          <div
            className="context-menu-item"
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