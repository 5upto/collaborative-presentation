import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { usePresentation } from '../context/PresentationContext';

const ImageElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const { socket, presentation } = usePresentation();

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (e, data) => {
    setIsDragging(false);
    
    if (canEdit && socket && (data.x !== element.x || data.y !== element.y)) {
      const updatedElement = {
        ...element,
        x: data.x,
        y: data.y
      };
      
      socket.emit('element-updated', {
        elementId: element.id,
        element: updatedElement,
        presentationId: presentation?.id
      });
    }
  };

  const handleResize = (e, { size }) => {
    if (canEdit && socket) {
      const updatedElement = {
        ...element,
        width: size.width,
        height: size.height
      };
      
      socket.emit('element-updated', {
        elementId: element.id,
        element: updatedElement,
        presentationId: presentation?.id
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

  const elementClasses = `
    slide-element image-element
    ${isSelected ? 'selected' : ''}
    ${isDragging ? 'dragging' : ''}
  `.trim();

  const renderImageContent = () => {
    if (hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">Image failed to load</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <div className="spinner" />
          </div>
        )}
        <img
          src={element.content?.src}
          alt={element.content?.alt || 'Slide image'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: element.styles?.objectFit || 'contain',
            borderRadius: element.styles?.borderRadius || '4px',
            opacity: element.styles?.opacity || 1,
            filter: element.styles?.filter || 'none',
            display: isLoading ? 'none' : 'block'
          }}
          draggable={false}
        />
      </>
    );
  };

  const content = (
    <div
      className={elementClasses}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1,
        cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
        overflow: 'hidden',
        borderRadius: '4px'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) onSelect();
      }}
    >
      {renderImageContent()}

      {/* Resize handles */}
      {isSelected && canEdit && (
        <>
          <div className="resize-handle nw" />
          <div className="resize-handle ne" />
          <div className="resize-handle sw" />
          <div className="resize-handle se" />
          <div className="resize-handle n" />
          <div className="resize-handle s" />
          <div className="resize-handle e" />
          <div className="resize-handle w" />
        </>
      )}
    </div>
  );

  if (!canEdit) {
    return content;
  }

  return (
    <Draggable
      position={{ x: element.x, y: element.y }}
      onStart={handleDragStart}
      onStop={handleDragStop}
      scale={zoom}
    >
      <div>
        <ResizableBox
          width={element.width}
          height={element.height}
          onResize={handleResize}
          minConstraints={[50, 50]}
          maxConstraints={[800, 600]}
          resizeHandles={isSelected ? ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'] : []}
          lockAspectRatio={element.styles?.lockAspectRatio || false}
          handle={(handleAxis, ref) => (
            <div
              ref={ref}
              className={`resize-handle ${handleAxis}`}
              style={{
                display: isSelected ? 'block' : 'none'
              }}
            />
          )}
        >
          <div
            className={elementClasses}
            style={{
              width: '100%',
              height: '100%',
              cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
              overflow: 'hidden',
              borderRadius: '4px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) onSelect();
            }}
          >
            {renderImageContent()}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default ImageElement;