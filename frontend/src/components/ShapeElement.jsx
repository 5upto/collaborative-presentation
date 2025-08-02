import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 'react-resizable';
import { usePresentation } from '../context/PresentationContext';

const ShapeElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { socket, presentation } = usePresentation();

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (e, data) => {
    setIsDragging(false);
    
    if (!canEdit) return;
    
    const newX = Math.max(0, Math.min(data.x, 800 - element.width));
    const newY = Math.max(0, Math.min(data.y, 450 - element.height));
    
    if (newX !== element.x || newY !== element.y) {
      const updatedElement = {
        ...element,
        x: newX,
        y: newY
      };
      
      socket?.emit('element-updated', {
        elementId: element.id,
        element: updatedElement,
        presentationId: presentation?.id
      });
    }
  };

  const handleResize = (e, { size }) => {
    if (!canEdit) return;
    
    const updatedElement = {
      ...element,
      width: Math.max(20, size.width),
      height: Math.max(20, size.height)
    };
    
    socket?.emit('element-updated', {
      elementId: element.id,
      element: updatedElement,
      presentationId: presentation?.id
    });
  };

  const getShapeStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      backgroundColor: element.styles?.fill || '#3b82f6',
      border: `${element.styles?.strokeWidth || 2}px solid ${element.styles?.stroke || '#2563eb'}`,
      cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
      userSelect: 'none'
    };

    const shapeType = element.content?.shape || 'rectangle';

    switch (shapeType) {
      case 'circle':
        return {
          ...baseStyle,
          borderRadius: '50%'
        };
      
      case 'triangle':
        return {
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          border: 'none',
          borderLeft: `${element.width / 2}px solid transparent`,
          borderRight: `${element.width / 2}px solid transparent`,
          borderBottom: `${element.height}px solid ${element.styles?.fill || '#3b82f6'}`,
          cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default'
        };
      
      case 'diamond':
        return {
          ...baseStyle,
          transform: 'rotate(45deg)',
          borderRadius: '8px'
        };
      
      case 'star':
        // For star, we'll use CSS clip-path
        return {
          ...baseStyle,
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          borderRadius: 0
        };
      
      case 'arrow-right':
        return {
          ...baseStyle,
          clipPath: 'polygon(0 20%, 60% 20%, 60% 0, 100% 50%, 60% 100%, 60% 80%, 0 80%)',
          borderRadius: 0
        };
      
      case 'arrow-left':
        return {
          ...baseStyle,
          clipPath: 'polygon(40% 0, 40% 20%, 100% 20%, 100% 80%, 40% 80%, 40% 100%, 0 50%)',
          borderRadius: 0
        };
      
      case 'hexagon':
        return {
          ...baseStyle,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          borderRadius: 0
        };
      
      case 'octagon':
        return {
          ...baseStyle,
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          borderRadius: 0
        };
      
      case 'rounded-rectangle':
        return {
          ...baseStyle,
          borderRadius: '12px'
        };
      
      case 'ellipse':
        return {
          ...baseStyle,
          borderRadius: '50%'
        };
      
      default: // rectangle
        return {
          ...baseStyle,
          borderRadius: element.styles?.borderRadius || '4px'
        };
    }
  };

  const renderShape = () => {
    const shapeStyle = getShapeStyle();
    const shapeType = element.content?.shape || 'rectangle';

    if (shapeType === 'triangle') {
      return (
        <div
          className={`slide-element shape-element ${isSelected ? 'selected' : ''}`}
          style={{
            width: element.width,
            height: element.height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={onSelect}
        >
          <div style={shapeStyle} />
        </div>
      );
    }

    return (
      <div
        className={`slide-element shape-element ${isSelected ? 'selected' : ''}`}
        style={shapeStyle}
        onClick={onSelect}
      />
    );
  };

  if (!canEdit) {
    return (
      <div
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex || 1
        }}
      >
        {renderShape()}
      </div>
    );
  }

  return (
    <Draggable
      position={{ x: element.x, y: element.y }}
      onStart={handleDragStart}
      onStop={handleDragStop}
      disabled={!canEdit}
      bounds="parent"
      scale={zoom}
    >
      <div style={{ position: 'absolute', zIndex: element.zIndex || 1 }}>
        <Resizable
          width={element.width}
          height={element.height}
          onResize={handleResize}
          minConstraints={[20, 20]}
          maxConstraints={[800, 450]}
          resizeHandles={isSelected ? ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'] : []}
          handleComponent={{
            se: <ResizeHandle direction="se" />,
            sw: <ResizeHandle direction="sw" />,
            ne: <ResizeHandle direction="ne" />,
            nw: <ResizeHandle direction="nw" />,
            n: <ResizeHandle direction="n" />,
            s: <ResizeHandle direction="s" />,
            e: <ResizeHandle direction="e" />,
            w: <ResizeHandle direction="w" />
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>
            {renderShape()}
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
};

const ResizeHandle = ({ direction }) => (
  <div className={`resize-handle ${direction}`} />
);

export default ShapeElement;