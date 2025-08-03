import React, { useState } from 'react';
import { 
  Type, 
  Square, 
  Circle, 
  Image, 
  Undo, 
  Redo, 
  Trash2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Palette,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import { usePresentation } from '../context/PresentationContext';
import { ELEMENT_TYPES, SHAPE_TYPES, COLORS } from '../utils/constants';

const Toolbar = () => {
  const { state, dispatch, socket } = usePresentation();
  const [selectedTool, setSelectedTool] = useState('select');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'image', icon: Image, label: 'Image' }
  ];

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const handleToolSelect = (toolId) => {
    setSelectedTool(toolId);
    dispatch({ type: 'SET_SELECTED_TOOL', payload: toolId });
    
    // Clear any selected elements when switching tools
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
    
    // Trigger image upload dialog when image tool is selected
    if (toolId === 'image') {
      triggerImageUpload();
    }
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
    socket.emit('action-performed', { action: 'undo', slideId: state.slides[state.currentSlideIndex]?.id });
  };
  
  const handleRedo = () => {
    dispatch({ type: 'REDO' });
    socket.emit('action-performed', { action: 'redo', slideId: state.slides[state.currentSlideIndex]?.id });
  };

  const handleZoomIn = () => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom * 1.25 });
  };

  const handleZoomOut = () => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom / 1.25 });
  };

  const handleDelete = () => {
    if (state.selectedElements.length > 0) {
      state.selectedElements.forEach(elementId => {
        dispatch({ 
          type: 'DELETE_SLIDE_ELEMENT', 
          payload: { 
            slideId: state.slides[state.currentSlideIndex]?.id,
            elementId 
          }
        });
      });
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const currentSlide = state.slides[state.currentSlideIndex];
        if (currentSlide) {
          const imageElement = {
            id: `img_${Date.now()}`,
            type: 'image',
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            zIndex: Math.floor(Math.random() * 1000) + 1,
            content: {
              src: e.target.result,
              alt: file.name
            },
            styles: {}
          };
          
          dispatch({
            type: 'ADD_SLIDE_ELEMENT',
            payload: {
              slideId: currentSlide.id,
              element: imageElement
            }
          });

          // Emit to socket if available
          if (socket) {
            socket.emit('element-created', {
              slideId: currentSlide.id,
              element: imageElement,
              presentationId: state.presentation?.id
            });
          }
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const handleColorChange = (color) => {
    setCurrentColor(color);
    setShowColorPicker(false);
    
    // Apply color to selected elements
    if (state.selectedElements.length > 0) {
      const currentSlide = state.slides[state.currentSlideIndex];
      if (currentSlide) {
        state.selectedElements.forEach(elementId => {
          const element = currentSlide.elements?.find(el => el.id === elementId);
          if (element) {
            const styleUpdate = element.type === 'text' 
              ? { color } 
              : { fill: color };
            
            dispatch({
              type: 'UPDATE_SLIDE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId,
                updates: { styles: styleUpdate }
              }
            });

            // Emit to socket if available
            if (socket) {
              socket.emit('element-updated', {
                elementId,
                element: { ...element, styles: { ...element.styles, ...styleUpdate } },
                slideId: currentSlide.id,
                presentationId: state.presentation?.id
              });
            }
          }
        });
      }
    }
  };

  const handleTextFormat = (formatType) => {
    if (state.selectedElements.length > 0) {
      const currentSlide = state.slides[state.currentSlideIndex];
      if (currentSlide) {
        state.selectedElements.forEach(elementId => {
          const element = currentSlide.elements?.find(el => el.id === elementId);
          if (element && element.type === 'text') {
            const currentStyles = element.styles || {};
            let styleUpdate = {};
            
            if (formatType === 'bold') {
              styleUpdate.fontWeight = currentStyles.fontWeight === 'bold' ? 'normal' : 'bold';
            } else if (formatType === 'italic') {
              styleUpdate.fontStyle = currentStyles.fontStyle === 'italic' ? 'normal' : 'italic';
            } else if (formatType === 'underline') {
              const currentDecoration = currentStyles.textDecoration || 'none';
              styleUpdate.textDecoration = currentDecoration.includes('underline') ? 'none' : 'underline';
            }
            
            dispatch({
              type: 'UPDATE_SLIDE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId,
                updates: { styles: styleUpdate }
              }
            });

            // Emit to socket if available
            if (socket) {
              socket.emit('element-updated', {
                elementId,
                element: { ...element, styles: { ...currentStyles, ...styleUpdate } },
                slideId: currentSlide.id,
                presentationId: state.presentation?.id
              });
            }
          }
        });
      }
    }
  };

  const triggerImageUpload = () => {
    document.getElementById('image-upload').click();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {/* Main Tools */}
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`p-2 rounded-lg transition-colors ${
                selectedTool === tool.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={tool.label}
            >
              <tool.icon className="h-5 w-5" />
            </button>
          ))}

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Text Formatting */}
          <button 
            onClick={() => handleTextFormat('bold')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={state.selectedElements.length === 0}
            title="Bold"
          >
            <Bold className="h-5 w-5" />
          </button>
          <button 
            onClick={() => handleTextFormat('italic')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={state.selectedElements.length === 0}
            title="Italic"
          >
            <Italic className="h-5 w-5" />
          </button>
          <button 
            onClick={() => handleTextFormat('underline')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={state.selectedElements.length === 0}
            title="Underline"
          >
            <Underline className="h-5 w-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Palette className="h-5 w-5" />
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-20 min-w-[220px]">
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all duration-150 shadow-sm hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        currentColor === color ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Color: ${color}`}
                    >
                      {currentColor === color && (
                        <svg className="w-5 h-5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* History Controls */}
          <button
            onClick={handleUndo}
            disabled={!(state.historyIndex > 0)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!(state.historyIndex < state.history.length - 1)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Redo className="h-5 w-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={state.selectedElements.length === 0}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(state.zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        id="image-upload"
      />
    </div>
  );
};

export default Toolbar;