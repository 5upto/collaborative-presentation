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
  const { state, dispatch } = usePresentation();
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
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
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
        // Handle image upload logic
        console.log('Image uploaded:', e.target.result);
      };
      reader.readAsDataURL(file);
    }
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
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bold className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Italic className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                <div className="grid grid-cols-5 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setCurrentColor(color);
                        setShowColorPicker(false);
                      }}
                      className={`w-8 h-8 rounded border-2 ${
                        currentColor === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
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
            disabled={!state.canUndo}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!state.canRedo}
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