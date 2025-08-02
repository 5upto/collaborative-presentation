import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import ReactMarkdown from 'react-markdown';
import { usePresentation } from '../context/PresentationContext';

const TextElement = ({ element, isSelected, canEdit, onSelect, zoom }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content?.text || '');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const elementRef = useRef(null);
  
  const { socket, presentation } = usePresentation();

  useEffect(() => {
    setText(element.content?.text || '');
  }, [element.content?.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (newText) => {
    setText(newText);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    
    if (text !== element.content?.text && socket) {
      const updatedElement = {
        ...element,
        content: { ...element.content, text }
      };
      
      socket.emit('element-updated', {
        elementId: element.id,
        element: updatedElement,
        presentationId: presentation?.id
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setText(element.content?.text || '');
      setIsEditing(false);
    }
  };

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

  const textStyle = {
    color: element.styles?.color || '#000000',
    fontSize: element.styles?.fontSize || '16px',
    fontWeight: element.styles?.fontWeight || 'normal',
    fontStyle: element.styles?.fontStyle || 'normal',
    textDecoration: element.styles?.textDecoration || 'none',
    textAlign: element.styles?.textAlign || 'left',
    lineHeight: '1.4'
  };

  const elementClasses = `
    slide-element text-element
    ${isSelected ? 'selected' : ''}
    ${isEditing ? 'editing' : ''}
    ${isDragging ? 'dragging' : ''}
  `.trim();

  const content = (
    <div
      ref={elementRef}
      className={elementClasses}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex || 1,
        cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) onSelect();
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          style={{
            ...textStyle,
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px',
            resize: 'none',
            borderRadius: '4px'
          }}
          placeholder="Enter text..."
        />
      ) : (
        <div
          style={{
            ...textStyle,
            width: '100%',
            height: '100%',
            padding: '8px',
            overflow: 'hidden',
            wordWrap: 'break-word'
          }}
          className="markdown-content"
        >
          {element.content?.isMarkdown ? (
            <ReactMarkdown>{text}</ReactMarkdown>
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html: text.replace(/\n/g, '<br/>')
              }}
            />
          )}
        </div>
      )}

      {/* Resize handles */}
      {isSelected && canEdit && !isEditing && (
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
      disabled={isEditing}
      scale={zoom}
    >
      <div>
        <ResizableBox
          width={element.width}
          height={element.height}
          onResize={handleResize}
          minConstraints={[50, 20]}
          maxConstraints={[800, 600]}
          resizeHandles={isSelected && !isEditing ? ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'] : []}
          handle={(handleAxis, ref) => (
            <div
              ref={ref}
              className={`resize-handle ${handleAxis}`}
              style={{
                display: isSelected && !isEditing ? 'block' : 'none'
              }}
            />
          )}
        >
          <div
            className={elementClasses}
            style={{
              width: '100%',
              height: '100%',
              cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) onSelect();
            }}
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={handleKeyDown}
                style={{
                  ...textStyle,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '8px',
                  resize: 'none',
                  borderRadius: '4px'
                }}
                placeholder="Enter text..."
              />
            ) : (
              <div
                style={{
                  ...textStyle,
                  width: '100%',
                  height: '100%',
                  padding: '8px',
                  overflow: 'hidden',
                  wordWrap: 'break-word'
                }}
                className="markdown-content"
              >
                {element.content?.isMarkdown ? (
                  <ReactMarkdown>{text}</ReactMarkdown>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: text.replace(/\n/g, '<br/>')
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default TextElement;